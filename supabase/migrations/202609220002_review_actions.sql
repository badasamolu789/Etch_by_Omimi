BEGIN;
CREATE OR REPLACE FUNCTION public.set_staff_role(target_user uuid,new_role text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.has_permission('roles') THEN RAISE EXCEPTION 'Super Admin permission required' USING ERRCODE='42501'; END IF;
 IF target_user=auth.uid() THEN RAISE EXCEPTION 'Ask another Super Admin to change your own role'; END IF;
 IF new_role NOT IN ('creator','editor','reviewer','admin','super_admin') THEN RAISE EXCEPTION 'Invalid role'; END IF;
 UPDATE public.profiles SET role=new_role WHERE id=target_user;
 IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.set_staff_role(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_staff_role(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.decide_verification(request_id uuid,decision text,explanation text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.has_permission('verification') THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE='42501'; END IF;
 IF decision NOT IN ('approved','declined') OR length(trim(COALESCE(explanation,'')))<3 THEN RAISE EXCEPTION 'Decision and reason required'; END IF;
 UPDATE public.verification_requests SET status=decision,decision_reason=explanation,reviewed_by=auth.uid(),reviewed_at=now() WHERE id=request_id AND status='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'Request already reviewed or missing'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.decide_verification(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decide_verification(uuid,text,text) TO authenticated;
-- Decisions use the RPC to stamp the actor/time and prevent stale decisions.
DROP POLICY verification_decide ON public.verification_requests;
REVOKE UPDATE ON public.verification_requests FROM authenticated;
CREATE OR REPLACE FUNCTION public.moderate_listing(listing_id uuid,decision text,explanation text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.has_permission('moderation') THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE='42501'; END IF;
 IF decision NOT IN ('published','archived') OR length(trim(COALESCE(explanation,'')))<3 THEN RAISE EXCEPTION 'Decision and reason required'; END IF;
 UPDATE public.listings SET status=decision,is_featured=false,moderation_reason=explanation,moderated_by=auth.uid(),moderated_at=now() WHERE id=listing_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.moderate_listing(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.moderate_listing(uuid,text,text) TO authenticated;

CREATE TABLE public.founding_rubrics (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), criteria jsonb NOT NULL, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX founding_active_rubric ON public.founding_rubrics(active) WHERE active;
CREATE TABLE public.founding_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id),
 full_name text NOT NULL CHECK(length(trim(full_name)) BETWEEN 1 AND 200), email text NOT NULL CHECK(length(email) BETWEEN 3 AND 254),
 portfolio_url text NOT NULL CHECK(portfolio_url ~ '^https?://'), statement text NOT NULL CHECK(length(trim(statement)) BETWEEN 50 AND 10000),
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','reviewing','accepted','declined')),
 score numeric, decision_reason text, decided_by uuid REFERENCES public.profiles(id), decided_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id)
);
CREATE TABLE public.founding_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL REFERENCES public.founding_applications(id),
 reviewer_id uuid NOT NULL REFERENCES public.profiles(id), rubric_id uuid NOT NULL REFERENCES public.founding_rubrics(id),
 scores jsonb NOT NULL, weighted_score numeric NOT NULL, notes text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(application_id,reviewer_id,rubric_id)
);
CREATE TABLE public.acceptance_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL UNIQUE REFERENCES public.founding_applications(id),
 created_by uuid REFERENCES public.profiles(id), updated_by uuid REFERENCES public.profiles(id),
 status text NOT NULL DEFAULT 'sending' CHECK(status IN ('sending','sent','uncertain')),
 provider_id text, created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['founding_rubrics','founding_applications','founding_reviews','acceptance_deliveries'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',t);
 EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
 EXECUTE format('CREATE POLICY founding_staff_read ON public.%I FOR SELECT TO authenticated USING(public.has_permission(''applications''))',t);
 EXECUTE format('CREATE TRIGGER audit_founding AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change()',t);
 END LOOP;
END $$;
GRANT INSERT ON public.founding_applications TO authenticated;
CREATE POLICY founding_own_read ON public.founding_applications FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY founding_submit ON public.founding_applications FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND status='submitted' AND score IS NULL AND decision_reason IS NULL AND decided_by IS NULL AND decided_at IS NULL);
GRANT ALL ON public.acceptance_deliveries TO service_role;
GRANT SELECT ON public.founding_applications TO service_role;
CREATE OR REPLACE FUNCTION public.configure_founding_rubric(criteria jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item jsonb; total numeric:=0; keys text[]:=ARRAY[]::text[];
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin permission required' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(criteria)<>'array' OR jsonb_array_length(criteria) NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'Provide 1–20 criteria'; END IF;
 FOR item IN SELECT * FROM jsonb_array_elements(criteria) LOOP
  IF COALESCE(item->>'key','') !~ '^[a-z][a-z0-9_]{0,39}$' OR COALESCE(length(trim(item->>'name')),0) NOT BETWEEN 1 AND 120 OR (item->>'key')=ANY(keys) OR jsonb_typeof(item->'weight') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Invalid criterion'; END IF;
  IF (item->>'weight')::numeric <=0 THEN RAISE EXCEPTION 'Weights must be positive'; END IF;
  keys:=array_append(keys,item->>'key'); total:=total+(item->>'weight')::numeric;
 END LOOP;
 IF total<>100 THEN RAISE EXCEPTION 'Weights must total 100'; END IF;
 PERFORM pg_advisory_xact_lock(220922);
 UPDATE public.founding_rubrics SET active=false WHERE active;
 INSERT INTO public.founding_rubrics(criteria) VALUES(criteria);
 UPDATE public.founding_applications SET score=NULL WHERE status IN ('submitted','reviewing');
END; $$;
CREATE OR REPLACE FUNCTION public.score_founding_application(application_id uuid,rubric_id uuid,scores jsonb,notes text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE rubric public.founding_rubrics; item jsonb; total numeric:=0; application public.founding_applications; value numeric;
BEGIN
 IF NOT public.has_permission('applications') THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO application FROM public.founding_applications WHERE id=application_id FOR UPDATE;
 IF NOT FOUND OR application.status IN ('accepted','declined') THEN RAISE EXCEPTION 'Application missing or already decided'; END IF;
 IF application.user_id=auth.uid() THEN RAISE EXCEPTION 'You cannot review your own application'; END IF;
 SELECT * INTO rubric FROM public.founding_rubrics WHERE id=rubric_id AND active;
 IF NOT FOUND OR length(trim(COALESCE(notes,''))) NOT BETWEEN 3 AND 5000 OR jsonb_typeof(scores)<>'object' THEN RAISE EXCEPTION 'Active rubric, scores and review notes required'; END IF;
 FOR item IN SELECT * FROM jsonb_array_elements(rubric.criteria) LOOP
  IF jsonb_typeof(scores->(item->>'key')) IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Score every criterion'; END IF;
  value:=(scores->>(item->>'key'))::numeric;
  IF value<0 OR value>100 THEN RAISE EXCEPTION 'Scores must be 0–100'; END IF;
  total:=total+value*(item->>'weight')::numeric/100;
 END LOOP;
 INSERT INTO public.founding_reviews(application_id,reviewer_id,rubric_id,scores,weighted_score,notes)
 VALUES(application_id,auth.uid(),rubric_id,scores,total,notes)
 ON CONFLICT ON CONSTRAINT founding_reviews_application_id_reviewer_id_rubric_id_key DO UPDATE SET scores=EXCLUDED.scores,weighted_score=EXCLUDED.weighted_score,notes=EXCLUDED.notes;
 UPDATE public.founding_applications SET status='reviewing',score=(SELECT round(avg(r.weighted_score),2) FROM public.founding_reviews r WHERE r.application_id=application.id AND r.rubric_id=rubric.id) WHERE id=application.id;
END; $$;
CREATE OR REPLACE FUNCTION public.decide_founding_application(application_id uuid,decision text,explanation text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE application public.founding_applications; active_score numeric;
BEGIN
 IF NOT public.has_permission('applications') THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE='42501'; END IF;
 IF decision NOT IN ('accepted','declined') OR length(trim(COALESCE(explanation,'')))<3 THEN RAISE EXCEPTION 'Decision and reason required'; END IF;
 SELECT * INTO application FROM public.founding_applications WHERE id=application_id FOR UPDATE;
 IF NOT FOUND OR application.status IN ('accepted','declined') THEN RAISE EXCEPTION 'Application missing or already decided'; END IF;
 IF application.user_id=auth.uid() THEN RAISE EXCEPTION 'You cannot decide your own application'; END IF;
 SELECT round(avg(r.weighted_score),2) INTO active_score FROM public.founding_reviews r JOIN public.founding_rubrics b ON b.id=r.rubric_id AND b.active WHERE r.application_id=application.id;
 IF decision='accepted' AND active_score IS NULL THEN RAISE EXCEPTION 'A review using the active rubric is required before acceptance'; END IF;
 UPDATE public.founding_applications SET status=decision,score=active_score,decision_reason=explanation,decided_by=auth.uid(),decided_at=now() WHERE id=application.id;
END; $$;
REVOKE ALL ON FUNCTION public.configure_founding_rubric(jsonb),public.score_founding_application(uuid,uuid,jsonb,text),public.decide_founding_application(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.configure_founding_rubric(jsonb),public.score_founding_application(uuid,uuid,jsonb,text),public.decide_founding_application(uuid,text,text) TO authenticated;
COMMIT;

-- Apply after all 20260911 migrations. Bootstrap the first super_admin using trusted SQL.
BEGIN;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('creator','editor','reviewer','admin','super_admin'));
ALTER TABLE public.profiles ADD COLUMN account_type text NOT NULL DEFAULT 'writer' CHECK (account_type IN ('writer','producer'));

CREATE OR REPLACE FUNCTION public.has_permission(permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (
 role = 'super_admin' OR (role = 'admin' AND permission <> 'roles') OR
 (role = 'editor' AND permission = 'editorial') OR
 (role = 'reviewer' AND permission IN ('moderation','applications','verification'))));
$$;
REVOKE ALL ON FUNCTION public.has_permission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'));
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF COALESCE(auth.role(),'') IN ('anon','authenticated') THEN
  IF TG_OP = 'INSERT' THEN NEW.role := 'creator';
  ELSIF NEW.role IS DISTINCT FROM OLD.role AND (NOT public.has_permission('roles') OR OLD.id=auth.uid()) THEN
   RAISE EXCEPTION 'Only a Super Admin can change staff roles' USING ERRCODE='42501';
  END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE POLICY staff_manage_profiles ON public.profiles FOR UPDATE TO authenticated
 USING (public.has_permission('roles')) WITH CHECK (public.has_permission('roles'));

CREATE TABLE public.admin_audit_log (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id uuid, actor_role text, action text NOT NULL, entity text NOT NULL, entity_id text,
 before_data jsonb, after_data jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit_log FROM anon,authenticated;
GRANT SELECT ON public.admin_audit_log TO authenticated;
CREATE POLICY audit_read ON public.admin_audit_log FOR SELECT TO authenticated USING (public.is_admin());
CREATE OR REPLACE FUNCTION public.audit_admin_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE prior jsonb; next_row jsonb; actor uuid;
BEGIN
 IF TG_OP <> 'INSERT' THEN prior := to_jsonb(OLD); END IF;
 IF TG_OP <> 'DELETE' THEN next_row := to_jsonb(NEW); END IF;
 actor := COALESCE(auth.uid(),CASE WHEN TG_TABLE_NAME IN ('article_preview_links','acceptance_deliveries') THEN COALESCE(COALESCE(next_row,prior)->>'updated_by',COALESCE(next_row,prior)->>'created_by')::uuid END);
 INSERT INTO public.admin_audit_log(actor_id,actor_role,action,entity,entity_id,before_data,after_data)
 VALUES(actor,COALESCE((SELECT role FROM public.profiles WHERE id=actor),'system'),TG_OP,TG_TABLE_NAME,
 COALESCE(next_row->>'id',prior->>'id'),prior - ARRAY['content','token_hash'],next_row - ARRAY['content','token_hash']);
 RETURN COALESCE(NEW,OLD);
END; $$;
REVOKE ALL ON FUNCTION public.audit_admin_change() FROM PUBLIC;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['profiles','masterclass_articles','masterclass_authors','masterclass_categories','listings','homepage_partners','marketplace_categories','site_settings'] LOOP
 EXECUTE format('CREATE TRIGGER audit_admin_change AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change()', t);
 END LOOP;
END $$;

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['masterclass_articles','masterclass_authors','masterclass_categories'] LOOP
 EXECUTE format('CREATE POLICY editorial_write ON public.%I FOR ALL TO authenticated USING (public.has_permission(''editorial'')) WITH CHECK (public.has_permission(''editorial''))',t);
 END LOOP;
END $$;
CREATE POLICY editorial_media_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (bucket_id='masterclass-media' AND public.has_permission('editorial'));
CREATE POLICY editorial_media_update ON storage.objects FOR UPDATE TO authenticated
 USING (bucket_id='masterclass-media' AND public.has_permission('editorial'))
 WITH CHECK (bucket_id='masterclass-media' AND public.has_permission('editorial'));
CREATE POLICY editorial_media_delete ON storage.objects FOR DELETE TO authenticated
 USING (bucket_id='masterclass-media' AND public.has_permission('editorial'));

CREATE OR REPLACE FUNCTION public.validate_article_schedule() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.status='scheduled' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.published_at IS DISTINCT FROM NEW.published_at) THEN
  IF NEW.published_at IS NULL OR NEW.published_at <= now() THEN RAISE EXCEPTION 'Scheduled articles require a future publication date'; END IF;
 END IF;
 IF NEW.status='draft' THEN NEW.published_at := NULL; END IF;
 IF NEW.status='published' AND NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER validate_article_schedule BEFORE INSERT OR UPDATE ON public.masterclass_articles
 FOR EACH ROW EXECUTE FUNCTION public.validate_article_schedule();

CREATE TABLE public.verification_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id),
 evidence text NOT NULL CHECK(length(trim(evidence)) BETWEEN 10 AND 5000),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','declined')),
 decision_reason text, reviewed_by uuid REFERENCES public.profiles(id), reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX verification_one_pending ON public.verification_requests(user_id) WHERE status='pending';
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON public.verification_requests TO authenticated;
CREATE POLICY verification_read ON public.verification_requests FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_permission('verification'));
CREATE POLICY verification_submit ON public.verification_requests FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND status='pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND decision_reason IS NULL);
CREATE POLICY verification_decide ON public.verification_requests FOR UPDATE TO authenticated USING(public.has_permission('verification')) WITH CHECK(public.has_permission('verification'));
CREATE TRIGGER audit_verification AFTER INSERT OR UPDATE OR DELETE ON public.verification_requests FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();

ALTER TABLE public.listings ADD COLUMN moderation_reason text;
ALTER TABLE public.listings ADD COLUMN moderated_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.listings ADD COLUMN moderated_at timestamptz;
CREATE POLICY moderation_listings ON public.listings FOR ALL TO authenticated USING(public.has_permission('moderation')) WITH CHECK(public.has_permission('moderation'));
CREATE OR REPLACE FUNCTION public.protect_listing_moderation() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF COALESCE(auth.role(),'') IN ('anon','authenticated') AND NOT public.has_permission('moderation') THEN
  IF TG_OP='INSERT' THEN
   IF NEW.status NOT IN ('draft','review') OR NEW.is_featured OR NEW.moderation_reason IS NOT NULL OR NEW.moderated_by IS NOT NULL OR NEW.moderated_at IS NOT NULL THEN RAISE EXCEPTION 'Listings require staff approval'; END IF;
  ELSE
   IF OLD.status='archived' THEN RAISE EXCEPTION 'Removed listings cannot be changed'; END IF;
   IF NEW.creator_id IS DISTINCT FROM OLD.creator_id OR NEW.is_featured IS DISTINCT FROM OLD.is_featured OR NEW.moderation_reason IS DISTINCT FROM OLD.moderation_reason OR NEW.moderated_by IS DISTINCT FROM OLD.moderated_by OR NEW.moderated_at IS DISTINCT FROM OLD.moderated_at THEN RAISE EXCEPTION 'Moderation fields require staff permission'; END IF;
   IF NEW.status NOT IN ('draft','review') AND NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'Listings require staff approval'; END IF;
   IF OLD.status='published' THEN NEW.status:='review'; NEW.is_featured:=false; END IF;
  END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER protect_listing_moderation BEFORE INSERT OR UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.protect_listing_moderation();

CREATE TABLE public.content_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reporter_id uuid NOT NULL REFERENCES public.profiles(id),
 content_type text NOT NULL CHECK(content_type IN ('article','listing')), content_id uuid NOT NULL,
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 10 AND 2000),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','dismissed','removed')),
 decision_reason text, reviewed_by uuid REFERENCES public.profiles(id), reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON public.content_reports TO authenticated;
CREATE UNIQUE INDEX reports_one_pending ON public.content_reports(reporter_id,content_type,content_id) WHERE status='pending';
CREATE POLICY reports_read ON public.content_reports FOR SELECT TO authenticated USING(reporter_id=auth.uid() OR public.has_permission('moderation'));
CREATE POLICY reports_submit ON public.content_reports FOR INSERT TO authenticated WITH CHECK(
 reporter_id=auth.uid() AND status='pending' AND decision_reason IS NULL AND reviewed_by IS NULL AND reviewed_at IS NULL AND
 ((content_type='article' AND EXISTS(SELECT 1 FROM public.masterclass_articles WHERE id=content_id AND status='published')) OR
 (content_type='listing' AND EXISTS(SELECT 1 FROM public.listings WHERE id=content_id AND status='published'))));
CREATE TRIGGER audit_reports AFTER INSERT OR UPDATE OR DELETE ON public.content_reports FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
CREATE OR REPLACE FUNCTION public.resolve_content_report(report_id uuid, decision text, explanation text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE report public.content_reports;
BEGIN
 IF NOT public.has_permission('moderation') THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE='42501'; END IF;
 IF decision NOT IN ('dismissed','removed') OR length(trim(COALESCE(explanation,'')))<3 THEN RAISE EXCEPTION 'A decision and reason are required'; END IF;
 SELECT * INTO report FROM public.content_reports WHERE id=report_id FOR UPDATE;
 IF NOT FOUND OR report.status<>'pending' THEN RAISE EXCEPTION 'Report is missing or already resolved'; END IF;
 IF decision='removed' THEN
  IF report.content_type='article' THEN UPDATE public.masterclass_articles SET status='archived' WHERE id=report.content_id;
  ELSE UPDATE public.listings SET status='archived',is_featured=false,moderation_reason=explanation,moderated_by=auth.uid(),moderated_at=now() WHERE id=report.content_id; END IF;
 END IF;
 UPDATE public.content_reports SET status=decision,decision_reason=explanation,reviewed_by=auth.uid(),reviewed_at=now() WHERE id=report_id;
END; $$;
REVOKE ALL ON FUNCTION public.resolve_content_report(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_content_report(uuid,text,text) TO authenticated;
COMMIT;

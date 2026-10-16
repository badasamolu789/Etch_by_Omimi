BEGIN;
ALTER TABLE public.profiles ADD COLUMN website text CHECK (website IS NULL OR website='' OR website ~* '^https?://');
ALTER TABLE public.profiles ADD COLUMN location text CHECK (location IS NULL OR length(location)<=160);
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.profiles(id,full_name,username,account_type)
 VALUES(NEW.id,left(COALESCE(NEW.raw_user_meta_data->>'full_name',''),120),
 'creator_'||replace(NEW.id::text,'-',''),CASE WHEN NEW.raw_user_meta_data->>'account_type'='producer' THEN 'producer' ELSE 'writer' END);
 RETURN NEW;
END; $$;

-- First-party listing view events are separate from moderation writes.
CREATE TABLE public.listing_view_events (
 listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
 session_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(listing_id,session_id)
);
ALTER TABLE public.listing_view_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.listing_view_events FROM anon,authenticated;
CREATE FUNCTION public.record_listing_view(target_listing uuid,view_session uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF view_session IS NULL THEN RETURN; END IF;
 INSERT INTO public.listing_view_events(listing_id,session_id)
 SELECT id,view_session FROM public.listings WHERE id=target_listing AND status='published' AND creator_id IS DISTINCT FROM auth.uid()
 ON CONFLICT DO NOTHING;
END; $$;
REVOKE ALL ON FUNCTION public.record_listing_view(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_listing_view(uuid,uuid) TO anon,authenticated;

CREATE FUNCTION public.creator_listing_metrics() RETURNS TABLE(id uuid,views bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT l.id,COALESCE(l.views,0)::bigint+count(e.session_id)
 FROM public.listings l LEFT JOIN public.listing_view_events e ON e.listing_id=l.id
 WHERE l.creator_id=auth.uid() GROUP BY l.id;
$$;
REVOKE ALL ON FUNCTION public.creator_listing_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.creator_listing_metrics() TO authenticated;
CREATE OR REPLACE FUNCTION public.creator_listing_stats() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('total',count(*),'published',count(*) FILTER(WHERE status='published'),
 'draft',count(*) FILTER(WHERE status='draft'),'review',count(*) FILTER(WHERE status='review'),
 'archived',count(*) FILTER(WHERE status='archived'),
 'views',COALESCE(sum(COALESCE(l.views,0)),0)+(SELECT count(*) FROM public.listing_view_events e JOIN public.listings p ON p.id=e.listing_id WHERE p.creator_id=auth.uid()))
 FROM public.listings l WHERE l.creator_id=auth.uid();
$$;
CREATE OR REPLACE FUNCTION public.protect_listing_moderation() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF COALESCE(auth.role(),'') IN ('anon','authenticated') AND NOT public.has_permission('moderation') THEN
  IF TG_OP='INSERT' THEN
   IF COALESCE(NEW.views,0)<>0 THEN RAISE EXCEPTION 'View totals are server-controlled'; END IF;
   IF NEW.status NOT IN ('draft','review') OR NEW.is_featured OR NEW.moderation_reason IS NOT NULL OR NEW.moderated_by IS NOT NULL OR NEW.moderated_at IS NOT NULL THEN RAISE EXCEPTION 'Listings require staff approval'; END IF;
  ELSE
   IF NEW.views IS DISTINCT FROM OLD.views THEN RAISE EXCEPTION 'View totals are server-controlled'; END IF;
   IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'Creation time is server-controlled'; END IF;
   IF OLD.status='archived' THEN RAISE EXCEPTION 'Removed listings cannot be changed'; END IF;
   IF NEW.creator_id IS DISTINCT FROM OLD.creator_id OR NEW.is_featured IS DISTINCT FROM OLD.is_featured OR NEW.moderation_reason IS DISTINCT FROM OLD.moderation_reason OR NEW.moderated_by IS DISTINCT FROM OLD.moderated_by OR NEW.moderated_at IS DISTINCT FROM OLD.moderated_at THEN RAISE EXCEPTION 'Moderation fields require staff permission'; END IF;
   IF NEW.status NOT IN ('draft','review') AND NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'Listings require staff approval'; END IF;
   IF OLD.status='published' THEN IF NEW.status<>'draft' THEN NEW.status:='review'; END IF; NEW.is_featured:=false; END IF;
  END IF;
 END IF;
 RETURN NEW;
END; $$;

COMMIT;

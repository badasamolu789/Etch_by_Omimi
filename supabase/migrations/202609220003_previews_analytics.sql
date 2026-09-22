BEGIN;
CREATE TABLE public.article_preview_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), article_id uuid NOT NULL REFERENCES public.masterclass_articles(id) ON DELETE CASCADE,
 created_by uuid NOT NULL REFERENCES public.profiles(id), updated_by uuid REFERENCES public.profiles(id), expires_at timestamptz NOT NULL, revoked boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.article_preview_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.article_preview_links FROM anon,authenticated;
GRANT SELECT ON public.article_preview_links TO authenticated;
GRANT ALL ON public.article_preview_links TO service_role;
CREATE POLICY preview_staff_read ON public.article_preview_links FOR SELECT TO authenticated USING(public.has_permission('editorial'));
CREATE TRIGGER audit_preview AFTER INSERT OR UPDATE OR DELETE ON public.article_preview_links FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();

CREATE TABLE public.analytics_events (
 id uuid PRIMARY KEY, session_id uuid NOT NULL, path text NOT NULL CHECK(length(path)<=500),
 utm_source text NOT NULL DEFAULT '' CHECK(length(utm_source)<=120), utm_medium text NOT NULL DEFAULT '' CHECK(length(utm_medium)<=120),
 utm_campaign text NOT NULL DEFAULT '' CHECK(length(utm_campaign)<=120),
 active_seconds integer NOT NULL DEFAULT 0 CHECK(active_seconds BETWEEN 0 AND 14400),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.analytics_events FROM anon,authenticated;
GRANT SELECT ON public.analytics_events TO authenticated;
CREATE POLICY analytics_admin_read ON public.analytics_events FOR SELECT TO authenticated USING(public.is_admin());
CREATE INDEX analytics_created ON public.analytics_events(created_at);
CREATE OR REPLACE FUNCTION public.record_page_view(event_id uuid,session_id uuid,path text,utm_source text DEFAULT '',utm_medium text DEFAULT '',utm_campaign text DEFAULT '',active_seconds integer DEFAULT 0)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF path !~ '^/[a-zA-Z0-9/_-]*([.]html)?$' OR path ~ '^/(admin|user)(/|$)' OR path ~ 'preview' OR length(path)>500 THEN RAISE EXCEPTION 'Invalid analytics path'; END IF;
 IF active_seconds NOT BETWEEN 0 AND 14400 OR length(utm_source)>120 OR length(utm_medium)>120 OR length(utm_campaign)>120 THEN RAISE EXCEPTION 'Invalid analytics event'; END IF;
 INSERT INTO public.analytics_events(id,session_id,path,utm_source,utm_medium,utm_campaign,active_seconds)
 VALUES(event_id,session_id,path,utm_source,utm_medium,utm_campaign,active_seconds)
 ON CONFLICT(id) DO UPDATE SET active_seconds=greatest(public.analytics_events.active_seconds,EXCLUDED.active_seconds)
 WHERE public.analytics_events.session_id=EXCLUDED.session_id AND public.analytics_events.path=EXCLUDED.path;
END; $$;
CREATE OR REPLACE FUNCTION public.analytics_summary() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin permission required' USING ERRCODE='42501'; END IF;
 WITH recent AS (SELECT * FROM public.analytics_events WHERE created_at >= now()-interval '30 days'),
 sessions AS(SELECT session_id,sum(active_seconds) AS seconds FROM recent GROUP BY session_id),
 pages AS(SELECT path,count(*) AS views FROM recent GROUP BY path ORDER BY views DESC LIMIT 50),
 utms AS(SELECT utm_source,utm_medium,utm_campaign,count(*) AS views,count(DISTINCT session_id) AS sessions FROM recent GROUP BY 1,2,3 ORDER BY views DESC LIMIT 50)
 SELECT jsonb_build_object('page_views',(SELECT count(*) FROM recent),'sessions',(SELECT count(*) FROM sessions),
 'average_active_session_seconds',(SELECT COALESCE(round(avg(seconds)),0) FROM sessions),
 'pages',COALESCE((SELECT jsonb_agg(pages) FROM pages),'[]'::jsonb),'utm_breakdown',COALESCE((SELECT jsonb_agg(utms) FROM utms),'[]'::jsonb)) INTO result;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.record_page_view(uuid,uuid,text,text,text,text,integer),public.analytics_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_page_view(uuid,uuid,text,text,text,text,integer) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_summary() TO authenticated;
COMMIT;

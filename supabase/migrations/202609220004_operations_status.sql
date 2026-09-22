BEGIN;
CREATE OR REPLACE FUNCTION public.set_account_type(target_user uuid,new_type text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin permission required' USING ERRCODE='42501'; END IF;
 IF new_type NOT IN ('writer','producer') THEN RAISE EXCEPTION 'Invalid account type'; END IF;
 UPDATE public.profiles SET account_type=new_type WHERE id=target_user;
 IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
END; $$;
CREATE OR REPLACE FUNCTION public.article_scheduler_status() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE job jsonb; latest jsonb; overdue bigint;
BEGIN
 IF NOT public.has_permission('editorial') THEN RAISE EXCEPTION 'Editorial permission required' USING ERRCODE='42501'; END IF;
 SELECT count(*) INTO overdue FROM public.masterclass_articles WHERE status='scheduled' AND published_at <= now();
 IF to_regclass('cron.job') IS NOT NULL THEN
  EXECUTE 'SELECT to_jsonb(j) - ARRAY[''username'',''nodename'',''database''] FROM cron.job j WHERE jobname=''etch-publish-articles'' LIMIT 1' INTO job;
  IF job IS NOT NULL AND to_regclass('cron.job_run_details') IS NOT NULL THEN
   EXECUTE 'SELECT jsonb_build_object(''status'',status,''start_time'',start_time,''end_time'',end_time,''message'',return_message) FROM cron.job_run_details WHERE jobid=$1 ORDER BY start_time DESC LIMIT 1' INTO latest USING (job->>'jobid')::bigint;
  END IF;
 END IF;
 RETURN jsonb_build_object('configured',COALESCE((job->>'active')::boolean,false),'schedule',job->>'schedule','last_run',latest,'overdue_articles',overdue);
END; $$;
REVOKE ALL ON FUNCTION public.set_account_type(uuid,text),public.article_scheduler_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_account_type(uuid,text),public.article_scheduler_status() TO authenticated;
COMMIT;

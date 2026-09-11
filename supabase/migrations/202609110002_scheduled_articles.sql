-- Supabase pg_cron runs publishing independently of visits to the website.
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('etch-publish-articles', '* * * * *',
    $job$UPDATE public.masterclass_articles SET status = 'published', updated_at = now()
    WHERE status = 'scheduled' AND published_at IS NOT NULL AND published_at <= now();$job$);

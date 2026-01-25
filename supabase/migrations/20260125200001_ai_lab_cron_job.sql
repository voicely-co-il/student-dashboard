-- ============================
-- Voicely AI Lab - Cron Job for RSS Fetching
-- Migration: 20260125000004_ai_lab_cron_job.sql
-- ============================

-- Note: This requires pg_cron extension and pg_net extension
-- Supabase has these enabled by default

begin;

-- Enable extensions if not already enabled
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule daily RSS fetch at 6:00 AM Israel time (4:00 AM UTC)
-- Hobby plan allows only 1 cron job, so we might need to combine with other jobs
-- or run manually via the dashboard

-- Check if cron job already exists and drop it
select cron.unschedule('ai-lab-fetch-rss') where exists (
  select 1 from cron.job where jobname = 'ai-lab-fetch-rss'
);

-- Create the cron job
select cron.schedule(
  'ai-lab-fetch-rss',           -- job name
  '0 4 * * *',                   -- cron expression: daily at 4:00 AM UTC (6:00 AM Israel)
  $$
  select net.http_post(
    url := 'https://jldfxkbczzxawdqsznze.supabase.co/functions/v1/fetch-inspiration-rss',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'min_relevance_score', 50
    )
  );
  $$
);

commit;

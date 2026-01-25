-- Enable pg_cron and pg_net extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- =====================================================
-- Cron Job 1: Sync transcripts from Google Drive (every 5 minutes)
-- =====================================================
select cron.schedule(
  'sync-transcripts-5min',
  '*/5 * * * *',  -- every 5 minutes
  $$
  select net.http_post(
    url := 'https://jldfxkbczzxawdqsznze.supabase.co/functions/v1/sync-transcripts',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsZGZ4a2Jjenp4YXdkcXN6bnplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM3NjA5MzUsImV4cCI6MjA0OTMzNjkzNX0.gV_LYGsD6FZHVK03mxC0bZHWvLN4aByJpFNuLZ8qo1E", "Content-Type": "application/json"}'::jsonb,
    body := '{"limit": 20}'::jsonb
  );
  $$
);

-- =====================================================
-- Cron Job 2: Generate insights for new transcripts (every 5 minutes)
-- Runs after sync to process any new transcripts
-- =====================================================
select cron.schedule(
  'populate-insights-5min',
  '*/5 * * * *',  -- every 5 minutes
  $$
  select net.http_post(
    url := 'https://jldfxkbczzxawdqsznze.supabase.co/functions/v1/populate-insights',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsZGZ4a2Jjenp4YXdkcXN6bnplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM3NjA5MzUsImV4cCI6MjA0OTMzNjkzNX0.gV_LYGsD6FZHVK03mxC0bZHWvLN4aByJpFNuLZ8qo1E", "Content-Type": "application/json"}'::jsonb,
    body := '{"limit": 30}'::jsonb
  );
  $$
);

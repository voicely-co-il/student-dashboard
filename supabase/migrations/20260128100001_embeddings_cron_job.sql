-- Cron job to process embedding queue
-- Runs every 2 minutes to process pending embeddings

-- Delete existing job if exists
DO $$
BEGIN
  PERFORM cron.unschedule('generate-embeddings-cron');
EXCEPTION WHEN OTHERS THEN
  NULL; -- Job doesn't exist, ignore
END;
$$;

-- Create cron job using pg_net (already available in Supabase)
-- Note: Service role key is stored here - consider using Vault in production
SELECT cron.schedule(
  'generate-embeddings-cron',
  '*/2 * * * *',  -- Every 2 minutes
  $$
  SELECT net.http_post(
    url := 'https://jldfxkbczzxawdqsznze.supabase.co/functions/v1/generate-embeddings'::text,
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsZGZ4a2Jjenp4YXdkcXN6bnplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg3NjM3OCwiZXhwIjoyMDY4NDUyMzc4fQ.GrGzWkdf-NtL_0h5FMkW8dnHUpLBzhgdcQIJYqPNE2M", "Content-Type": "application/json"}'::jsonb,
    body := '{"batch_size": 3}'::jsonb
  ) AS request_id;
  $$
);

-- Embedding generation cron job created successfully

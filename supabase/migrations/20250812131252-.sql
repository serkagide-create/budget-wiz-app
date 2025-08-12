-- Enable required extensions for scheduling HTTP calls
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Remove existing schedule if it exists to avoid duplicates
select cron.unschedule('check-budget-alerts-nightly');

-- Schedule the edge function to run every day at midnight (UTC)
select
  cron.schedule(
    'check-budget-alerts-nightly',
    '0 0 * * *',
    $$
    select
      net.http_post(
        url:='https://poipkkidkdlqfobtdaqw.supabase.co/functions/v1/check-budget-alerts',
        headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvaXBra2lka2RscWZvYnRkYXF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NzA4MjAsImV4cCI6MjA3MDA0NjgyMH0.P45tNfn0ypSHeL1HjFj4CkBKijaPi1zqYhIBCn5ex4Q"}'::jsonb,
        body:=jsonb_build_object('source','cron','invoked_at', now())
      ) as request_id;
    $$
  );
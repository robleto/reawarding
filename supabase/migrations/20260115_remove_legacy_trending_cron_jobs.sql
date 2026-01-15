-- Remove legacy/duplicate trending cron jobs
-- Safe to run multiple times

do $$
begin
  -- Unschedule known legacy job IDs
  perform cron.unschedule(11);
  perform cron.unschedule(12);
  perform cron.unschedule(18);
  perform cron.unschedule(25);
  perform cron.unschedule(26);
  perform cron.unschedule(27);
exception
  when undefined_table then
    -- pg_cron not installed
    null;
  when others then
    -- Ignore missing job IDs or permission errors
    null;
end $$;

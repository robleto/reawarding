-- Remove backfill cron jobs (move scheduling to GitHub Actions)
-- Safe to run multiple times

do $$
begin
  -- Unschedule known backfill job IDs
  perform cron.unschedule(32);
  perform cron.unschedule(34);
exception
  when undefined_table then
    -- pg_cron not installed
    null;
  when others then
    -- Ignore missing job IDs or permission errors
    null;
end $$;

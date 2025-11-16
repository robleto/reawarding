-- Schedule daily backfill of external ids via wrapper
-- Runs at 03:10 UTC each day

-- Ensure wrapper exists (created in 20251116_backfill_external_ids_wrapper_and_cron.sql)
-- Create/update schedule (idempotent: unschedule if exists, then re-schedule)

do $$
begin
  -- try to unschedule any existing with same name (ignore errors)
  begin
    perform cron.unschedule(jobid)
    from cron.job where jobname = 'backfill-external-ids-daily';
  exception when others then
    -- ignore
    null;
  end;

  perform cron.schedule(
    'backfill-external-ids-daily',
    '10 3 * * *',
    $$select admin.invoke_backfill_external_ids('both', 1000, 0, false);$$
  );
end$$;

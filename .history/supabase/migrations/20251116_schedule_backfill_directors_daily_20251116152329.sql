-- Schedule daily backfill for movies.director via Edge wrapper
-- Runs at 03:25 UTC

do $cron$
begin
  begin
    perform extensions.cron.unschedule('backfill-directors-daily');
  exception when others then
    -- ignore if job does not exist
    null;
  end;

  perform extensions.cron.schedule(
    job_name => 'backfill-directors-daily',
    schedule => '25 3 * * *',
    command => $cmd$
      select admin.invoke_backfill_directors(500, 0, false);
    $cmd$
  );
end
$cron$;

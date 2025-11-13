-- Retire legacy ingestion jobs & wrappers now superseded by tmdb-fresh-movies

-- Unschedule cron jobs by known names if present
do $$
declare r record; begin
  for r in select jobid from cron.job where jobname in (
    'tmdb-now-playing-6h',
    'tmdb-popular-movies-daily',
    'tmdb-trending-movies-hourly'
  ) loop
    perform cron.unschedule(r.jobid);
  end loop;
exception when undefined_table then
  -- pg_cron not installed; ignore
  null;
end $$;

-- Drop wrapper functions if they exist
do $$ begin
  perform 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='admin' and p.proname='invoke_tmdb_trending_movies';
  if found then execute 'drop function admin.invoke_tmdb_trending_movies();'; end if;
  perform 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='admin' and p.proname='invoke_tmdb_now_playing';
  if found then execute 'drop function admin.invoke_tmdb_now_playing();'; end if;
  perform 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='admin' and p.proname='invoke_tmdb_popular_movies';
  if found then execute 'drop function admin.invoke_tmdb_popular_movies();'; end if;
end $$;

-- Optional: tag imports table with a deprecation note for audit
insert into imports (tmdb_id, status, notes, imported_at)
values (null, 'deprecate_ingestion', 'Retired now-playing, popular, trending jobs in favor of tmdb-fresh-movies', now());

-- Wrapper & (commented) schedule for tmdb-fresh-movies ingestion
-- Provides a pg_cron-safe SECURITY DEFINER function so the database can call the Edge Function
-- without embedding secrets in plain SQL everywhere.

-- 1. Create schema if missing
create schema if not exists admin;

-- 2. Wrapper function
create or replace function admin.invoke_tmdb_fresh_movies()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := current_setting('app.settings.supabase_url', true);
  v_secret text := current_setting('app.settings.cron_secret', true);
  v_service_key text := current_setting('app.settings.service_role_key', true);
  v_resp jsonb;
begin
  if v_url is null then
    raise exception 'Missing runtime GUC app.settings.supabase_url';
  end if;
  if v_secret is null then
    raise exception 'Missing runtime GUC app.settings.cron_secret';
  end if;
  if v_service_key is null then
    raise exception 'Missing runtime GUC app.settings.service_role_key';
  end if;

  -- Perform POST to Edge Function with auth + cron secret
  select content::jsonb into v_resp
  from net.http_post(
    url := v_url || '/functions/v1/tmdb-fresh-movies',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_service_key,
      'X-CRON-SECRET', v_secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );

  -- Optional: log minimal run info
  insert into imports(tmdb_id, status, notes, imported_at)
  values (null, 'fresh_movies_run', concat('resp: ', coalesce(v_resp->>'imported','?')), now());
exception when others then
  -- Log failure without aborting cron chain
  insert into imports(tmdb_id, status, notes, imported_at)
  values (null, 'fresh_movies_error', SQLERRM, now());
end;
$$;

alter function admin.invoke_tmdb_fresh_movies() owner to postgres;
revoke all on function admin.invoke_tmdb_fresh_movies() from public;
grant execute on function admin.invoke_tmdb_fresh_movies() to postgres;

-- 3. (Optional) pg_cron schedule (UNCOMMENT after verifying function manually)
-- select cron.schedule(
--   'tmdb-fresh-movies-4h',      -- unique job name
--   '0 */4 * * *',               -- every 4 hours UTC
--   $$select admin.invoke_tmdb_fresh_movies();$$
-- );

-- Manual test:
-- select admin.invoke_tmdb_fresh_movies();

-- (Renamed from 20251015T0420_cron_wrapper_and_schedule.sql to remove time component per migration naming rules)
-- SECURITY DEFINER wrapper to call Edge Function with secret
create schema if not exists admin;

create or replace function admin.invoke_tmdb_trending_movies()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare token text;
begin
  select decrypted_secret into token
  from vault.decrypted_secrets
  where name = 'CRON_SECRET';

  perform net.http_post(
    url := coalesce(current_setting('supabase.url', true), '') || '/functions/v1/tmdb-trending-scraper',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || token,
      'Content-Type', 'application/json'
    )
  );
end $$;

-- Ensure owner is postgres for permission to decrypt
alter function admin.invoke_tmdb_trending_movies() owner to postgres;

-- Revoke public execution and grant to postgres only
revoke all on function admin.invoke_tmdb_trending_movies() from public;
grant execute on function admin.invoke_tmdb_trending_movies() to postgres;

-- Note: We no longer auto-create a pg_cron schedule here because GitHub Actions will own scheduling.
-- You can still run the wrapper manually: SELECT admin.invoke_tmdb_trending_movies();

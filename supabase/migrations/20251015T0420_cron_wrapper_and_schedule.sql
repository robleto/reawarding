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
    url:='https://cjrpnzwrldlxajkvznca.supabase.co/functions/v1/tmdb-trending-movies',
    headers:=jsonb_build_object('Authorization', 'Bearer ' || token)
  );
end $$;

-- Ensure owner is postgres for permission to decrypt
alter function admin.invoke_tmdb_trending_movies() owner to postgres;

-- Revoke public execution and grant to postgres only
revoke all on function admin.invoke_tmdb_trending_movies() from public;
grant execute on function admin.invoke_tmdb_trending_movies() to postgres;

-- Optional: clean up prior failing/duplicate jobs if they exist
-- Note: unschedule gracefully ignores missing ids
select cron.unschedule(11);
select cron.unschedule(12);
select cron.unschedule(25);
select cron.unschedule(26);
select cron.unschedule(27);

-- Ensure a single hourly schedule. If job 28 exists and points elsewhere, update it; otherwise create a new job.
-- Try to update job 28; if 0 rows affected, create new schedule.
-- Because migrations run in a single statement mode, do this defensively.

-- Update existing job 28 to call the wrapper
update cron.job set command = $$select admin.invoke_tmdb_trending_movies();$$ where jobid = 28;

-- Create a named schedule if job 28 didn't exist or is not the desired one
select cron.schedule(
  'tmdb-trending-movies-hourly',
  '0 * * * *',
  $$select admin.invoke_tmdb_trending_movies();$$
) where not exists (
  select 1 from cron.job where command = $$select admin.invoke_tmdb_trending_movies();$$
);

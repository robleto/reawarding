-- Update fresh-movies wrapper to use Vault secrets instead of app.settings GUCs
create schema if not exists admin;

create or replace function admin.invoke_tmdb_fresh_movies()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
  v_resp jsonb;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'SUPABASE_URL';
  if v_url is null then
    v_url := current_setting('supabase.url', true);
  end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'CRON_SECRET';

  if v_url is null then
    raise exception 'Missing SUPABASE_URL (vault) and supabase.url setting';
  end if;
  if v_secret is null then
    raise exception 'Missing CRON_SECRET in vault';
  end if;

  -- POST to Edge Function with cron secret header only
  select content::jsonb into v_resp
  from net.http_post(
    url := v_url || '/functions/v1/tmdb-fresh-movies',
    headers := jsonb_build_object(
      'X-CRON-SECRET', v_secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );

  -- Minimal run log (tmdb_id=0 for NOT NULL safety)
  insert into imports(tmdb_id, status, notes, imported_at)
  values (0, 'fresh_movies_run', concat('resp: ', coalesce(v_resp->>'imported','?')), now());
exception when others then
  insert into imports(tmdb_id, status, notes, imported_at)
  values (0, 'fresh_movies_error', SQLERRM, now());
end;
$$;

alter function admin.invoke_tmdb_fresh_movies() owner to postgres;
revoke all on function admin.invoke_tmdb_fresh_movies() from public;
grant execute on function admin.invoke_tmdb_fresh_movies() to postgres;

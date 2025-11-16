-- Wrapper & (commented) schedule for backfill-external-ids
-- Provides a pg_cron-safe SECURITY DEFINER function to call the Edge Function
-- with required headers (Authorization + X-CRON-SECRET) and query parameters.

-- 1. Ensure schema
create schema if not exists admin;

-- 2. Wrapper function with parameters
create or replace function admin.invoke_backfill_external_ids(
  p_mode text default 'both',            -- 'tmdb' | 'imdb' | 'both'
  p_limit int default 300,
  p_offset int default 0,
  p_dry_run boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
  v_qs text;
  v_resp jsonb;
begin
  -- Prefer Vault secrets; fallback to built-in supabase.url setting if present
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'SUPABASE_URL';
  if v_url is null then
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'NEXT_PUBLIC_SUPABASE_URL';
  end if;
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

  v_qs := format('mode=%s&limit=%s&offset=%s%s',
                 p_mode,
                 p_limit,
                 p_offset,
                 case when p_dry_run then '&dryRun=true' else '' end);

  select content::jsonb into v_resp
  from net.http_post(
    url := v_url || '/functions/v1/backfill-external-ids?' || v_qs,
    headers := jsonb_build_object(
      'X-CRON-SECRET', v_secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );

  -- Optional: log minimal run info to imports
  insert into imports(tmdb_id, status, notes, imported_at)
  values (0, 'backfill_external_ids_run', concat('resp: ', coalesce(v_resp::text,'?')), now());
exception when others then
  insert into imports(tmdb_id, status, notes, imported_at)
  values (0, 'backfill_external_ids_error', SQLERRM, now());
end;
$$;

alter function admin.invoke_backfill_external_ids(text, int, int, boolean) owner to postgres;
revoke all on function admin.invoke_backfill_external_ids(text, int, int, boolean) from public;
grant execute on function admin.invoke_backfill_external_ids(text, int, int, boolean) to postgres;

-- 3. (Optional) pg_cron schedules (UNCOMMENT after verifying manually)
-- Hourly small batch (adjust limit/offset if needed):
-- select cron.schedule(
--   'backfill-external-ids-hourly',
--   '17 * * * *',
--   $$select admin.invoke_backfill_external_ids('both', 300, 0, false);$$
-- );

-- Daily larger batch at 03:10 UTC:
-- select cron.schedule(
--   'backfill-external-ids-daily',
--   '10 3 * * *',
--   $$select admin.invoke_backfill_external_ids('both', 1000, 0, false);$$
-- );

-- Manual test examples:
-- select admin.invoke_backfill_external_ids();                            -- defaults: both, 300, 0
-- select admin.invoke_backfill_external_ids('both', 100, 0, true);        -- dry run
-- select admin.invoke_backfill_external_ids('tmdb', 300, 0, false);
-- select admin.invoke_backfill_external_ids('imdb', 300, 0, false);

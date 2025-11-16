-- Backfill External IDs: wrapper + daily schedule (idempotent)
-- Run this in the Supabase SQL editor to avoid migration history issues.

-- 1) Ensure admin schema
create schema if not exists admin;

-- 2) SECURITY DEFINER wrapper for the Edge Function
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
  v_service_key text;
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
  select decrypted_secret into v_service_key from vault.decrypted_secrets where name = 'SUPABASE_SERVICE_ROLE_KEY';
  if v_url is null then
    raise exception 'Missing SUPABASE_URL (vault) and supabase.url setting';
  end if;
  if v_secret is null then
    raise exception 'Missing CRON_SECRET in vault';
  end if;
  if v_service_key is null then
    raise exception 'Missing SUPABASE_SERVICE_ROLE_KEY in vault';
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
      'Authorization', 'Bearer ' || v_service_key,
      'X-CRON-SECRET', v_secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );

  -- Optional minimal run log
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

-- 3) Daily schedule at 03:10 UTC (idempotent)
DO $$
BEGIN
  -- Unschedule existing job with same name if present
  BEGIN
    PERFORM cron.unschedule(jobid)
    FROM cron.job WHERE jobname = 'backfill-external-ids-daily';
  EXCEPTION WHEN others THEN
    -- ignore if not present
    NULL;
  END;

  PERFORM cron.schedule(
    'backfill-external-ids-daily',
    '10 3 * * *',
    $cron$select admin.invoke_backfill_external_ids('both', 1000, 0, false);$cron$
  );
END$$;
-- SECURITY DEFINER wrapper to invoke the backfill-directors edge function with Vault secrets
create schema if not exists admin;

create or replace function admin.invoke_backfill_directors(p_limit int default 200, p_offset int default 0, p_dry_run boolean default false)
returns json
language plpgsql
security definer
as $fn$
declare
  v_url text := coalesce(current_setting('vault.next_public_supabase_url', true), current_setting('vault.supabase_url', true));
  v_secret text := current_setting('vault.cron_secret', true);
  v_service text := current_setting('vault.supabase_service_role_key', true);
  v_resp json;
begin
  if v_url is null or v_secret is null or v_service is null then
    raise exception 'Missing Vault secrets for backfill-directors (url/cron/service)';
  end if;

  select content::json into v_resp
  from net.http_post(
    url := v_url || '/functions/v1/backfill-directors?limit='||p_limit||'&offset='||p_offset||'&dryRun='||case when p_dry_run then 'true' else 'false' end,
    headers := json_build_object('X-CRON-SECRET', v_secret, 'Authorization', 'Bearer '||v_service),
    body := ''
  );

  return v_resp;
end;
$fn$;

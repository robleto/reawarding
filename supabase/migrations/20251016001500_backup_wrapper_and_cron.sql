-- SECURITY DEFINER wrapper to call backup-export Edge Function with secret
create schema if not exists admin;

create or replace function admin.invoke_backup_export()
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
    url := current_setting('supabase.url', true) || '/functions/v1/backup-export',
    headers := jsonb_build_object('Authorization', 'Bearer ' || token)
  );
end $$;

alter function admin.invoke_backup_export() owner to postgres;
revoke all on function admin.invoke_backup_export() from public;
grant execute on function admin.invoke_backup_export() to postgres;

-- Create a daily schedule at 03:30 UTC if not already present
select cron.schedule(
  'daily-backup-export',
  '30 3 * * *',
  $$select admin.invoke_backup_export();$$
) where not exists (
  select 1 from cron.job where command = $$select admin.invoke_backup_export();$$
);

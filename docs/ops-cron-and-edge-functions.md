# Ops: Cron and Edge Functions

This project schedules Supabase Edge Functions from the database using pg_cron.

## Where jobs live
- Defined via SQL migrations under `supabase/migrations/*cron*.sql`.
- Visible in Supabase Dashboard → Database → Cron (pg_cron), or via:

```sql
select jobid, schedule, command, active from cron.job order by jobid;
```

## Secrets and permissions
- Cron reads `vault.decrypted_secrets` (e.g., `CRON_SECRET`) via a SECURITY DEFINER wrapper owned by `postgres`.
- Wrapper: `admin.invoke_tmdb_trending_movies()` calls `net.http_post` with the Authorization header.

## Freshness helper
- Run: `select * from admin.last_updates() order by last_update desc limit 20;`
- Helper is created by migration `20251015T0415_add_admin_helpers.sql`.

## Managing schedules
- Trigger a job now: `select cron.run_job(<jobid>);`
- Disable: `select cron.unschedule(<jobid>);`
- Create schedule template (example for fresh movies every 4h):

```sql
select cron.schedule(
  'tmdb-fresh-movies-4h',
  '0 */4 * * *',
  $$select admin.invoke_tmdb_fresh_movies();$$
);
```

## Troubleshooting
- Permission error `_crypto_aead_det_decrypt`: Ensure wrapper function owner is `postgres` and job calls the wrapper, not vault directly.
- Edge Function OK but cron failing: check `cron.job_run_details.return_message` for HTTP errors from `net.http_post`.
- Duplicate jobs: unschedule older ids.

## Deprecated/Retired jobs
- The following ingestion functions are retired in favor of `tmdb-fresh-movies`:
  - `tmdb-now-playing`
  - `tmdb-popular-movies`
  - `tmdb-trending-scraper`
- If any schedules still exist for these, unschedule them. The handlers return HTTP 410 Gone to prevent continued use.

## Alternate: GitHub/Vercel scheduling
If you prefer infra scheduling outside Postgres, add a GitHub Action with `on: schedule` that `curl` calls the Edge Function using a repo secret `CRON_SECRET`.
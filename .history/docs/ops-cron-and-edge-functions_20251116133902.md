# Ops: Cron and Edge Functions

This project schedules Supabase Edge Functions from the database using pg_cron.

## Where jobs live

- Defined via SQL migrations under `supabase/migrations/*cron*.sql`.
- Visible in Supabase Dashboard → Database → Cron (pg_cron), or via:

```sql
select jobid, schedule, command, active from cron.job order by jobid;
```

## Secrets and permissions

- Wrappers read from `vault.decrypted_secrets` (e.g., `CRON_SECRET`, `SUPABASE_URL`) via SECURITY DEFINER functions owned by `postgres`.
- Authorization header is not required; wrappers call Edge Functions with `X-CRON-SECRET`.

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

## Backfill: External IDs (tmdb_id + imdb_id)

- Edge Function: `backfill-external-ids` (deployed in `supabase/functions/backfill-external-ids/`)
- Wrapper: `admin.invoke_backfill_external_ids(mode text default 'both', limit int default 300, offset int default 0, dry_run boolean default false)`
- Secrets: via Vault — set `SUPABASE_URL` and `CRON_SECRET`. The function itself uses its own env (e.g., `TMDB_API_KEY`) set via `supabase functions secrets`.

### Manual runs

```sql
-- Defaults (both, 300 rows):
select admin.invoke_backfill_external_ids();

-- Dry run a small batch:
select admin.invoke_backfill_external_ids('both', 100, 0, true);

-- Only fill missing tmdb_id (via TMDB search):
select admin.invoke_backfill_external_ids('tmdb', 300, 0, false);

-- Only fill missing imdb_id for rows with tmdb_id:
select admin.invoke_backfill_external_ids('imdb', 300, 0, false);
```

### Scheduling templates

```sql
-- Hourly small batch
select cron.schedule(
  'backfill-external-ids-hourly',
  '17 * * * *',
  $$select admin.invoke_backfill_external_ids('both', 300, 0, false);$$
);

-- Daily larger pass at 03:10 UTC
select cron.schedule(
  'backfill-external-ids-daily',
  '10 3 * * *',
  $$select admin.invoke_backfill_external_ids('both', 1000, 0, false);$$
);
```

Notes:

- Start with a dry run to gauge matches; check `imports` table rows with status `backfill_external_ids_run` for a quick pulse.
- For very large catalogs, run multiple offsets (e.g., 0, 1000, 2000) in staggered schedules.
- The Edge Function rate-limits TMDB calls (`delay` and `concurrency` query params) to avoid quotas.
- Manual HTTP calls do not require Authorization header; only send `X-CRON-SECRET`.

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

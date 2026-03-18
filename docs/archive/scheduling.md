## Scheduling strategy and verification

This project previously used a mix of GitHub Actions and Supabase pg_cron. To avoid duplication and flaky runs, here’s the recommended setup and how to verify it.

### Recommendation

- Use GitHub Actions as the canonical scheduler for this project (consistent with your other repos).
- Keep Supabase pg_cron wrappers available for manual invocation and optional future use, but do not auto-create pg_cron schedules.
- Do not duplicate a job in both places—choose a single owner per job.

Current canonical jobs (GitHub):
- Hourly: TMDB trending refresh → calls Edge Function `/functions/v1/tmdb-trending-scraper`
- Daily at 04:15 UTC: Backup export → calls Edge Function `/functions/v1/backup-export`

Wrappers are created by migrations in `supabase/migrations` and read `CRON_SECRET` from Vault; they call your Edge Functions endpoint via `net.http_post`.

### Verify current pg_cron jobs (and disable if switching to GitHub)

Run in Supabase SQL editor (SQL tab):

-- List jobs
SELECT jobid, schedule, command, active, nodename, nodeport, jobname
FROM cron.job
ORDER BY jobid;

-- Recent runs
SELECT jobid, status, run_started, run_duration, return_message
FROM cron.job_run_details
ORDER BY run_started DESC
LIMIT 50;

If you see legacy/duplicate jobs (older IDs that point to functions you no longer use), disable them in the Dashboard or unschedule with `SELECT cron.unschedule(<jobid>);` (if you have perms). After moving to GitHub ownership, it’s fine to have zero pg_cron jobs.

### One-time prerequisites

1) Ensure `CRON_SECRET` exists in Vault (Project Settings → Database → Vault): key=`CRON_SECRET`, value set.
2) Ensure `http` and `pg_cron` extensions are enabled (Project Settings → Database → Extensions).
3) Apply the migrations in `supabase/migrations` so the wrappers exist (they won’t auto-schedule anymore):
   - `admin.last_updates()`
   - `admin.invoke_tmdb_trending_movies()`
   - `admin.invoke_backup_export()`

### Create or repair schedules (GitHub)

Add or update these workflows (ensure repo secrets SUPABASE_URL and CRON_SECRET are set):

Hourly trending (`.github/workflows/trending-refresh.yml`):
name: Trending Refresh
on:
  schedule:
    - cron: '7 * * * *'
  workflow_dispatch:
jobs:
  call:
    runs-on: ubuntu-latest
    steps:
      - name: Invoke tmdb-trending-scraper
        run: |
          curl -sS -X POST \
            "${{ secrets.SUPABASE_URL }}/functions/v1/tmdb-trending-scraper" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            --data '{"source":"github-action"}'

Daily backup (`.github/workflows/Daily Backup Export` already present):
name: Daily Backup Export
on:
  schedule:
    - cron: '15 4 * * *'
  workflow_dispatch:
jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - name: Call backup-export Edge Function
        run: |
          curl -sS -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            "${{ secrets.SUPABASE_URL }}/functions/v1/backup-export"

### Manual smoke tests

Run each wrapper once to verify secrets and connectivity:

SELECT admin.invoke_tmdb_trending_movies();
SELECT admin.invoke_backup_export();

Then re-check either workflow run logs (GitHub Actions) or `cron.job_run_details` (if you keep pg_cron) for success, and review:
- Trending logs table (if used) or your movies’ `updated_at` values
- Storage: a new folder under `backups/YYYYMMDD/` with JSON files

Keep either pg_cron OR GitHub for a given job, not both.

### Cleanup checklist

- [ ] Exactly one hourly trending job remains
- [ ] Exactly one daily backup job remains
- [ ] Last runs succeeded within expected windows
- [ ] `CRON_SECRET` present in Vault and/or GitHub secrets (depending on owner)
- [ ] Docs updated if you change the owner or cadence

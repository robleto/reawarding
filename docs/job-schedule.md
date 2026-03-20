# Job Schedule (Current)

This repo uses **GitHub Actions** for scheduled jobs. There are **no active Edge/pg_cron schedules** tracked in the repo; legacy cron jobs are being removed via migrations.

## Active GitHub Actions

- `enrich-movies` - runs every 6 hours to backfill missing movie metadata from TMDB/OMDb using `scripts/enrich_movies_enhanced.py`

The following workflows remain manual-only:

- `ingest-discover-enrich` - run on demand when you want to pull in a new batch of TMDB movies and enrich metadata
- `mirror-movie-images` - run on demand when you need to refresh cached poster/thumb assets in Supabase storage

## Non-scheduled (manual/one-off)

These are manual scripts you can run when needed:

- `npm run ingest:collections` — import franchise collections
- `npm run ingest:discover` — discovery importer (supports flags)
- `npm run ingest:enrich` — local TMDB enrichment
- `npm run ingest:images` — download poster/thumb images

## Retired/removed jobs

The following GitHub Actions and Edge-based schedules were removed in favor of the single GitHub Action pipeline:

- tmdb-now-playing / tmdb-popular / tmdb-trending (Edge)
- update-movie-batch (Edge)
- update-all-movies (Edge)
- enrich-movie-details (Edge)
- backup-export (Edge)
- mirror-movie-images (Edge)

## Supabase cron cleanup

Legacy pg_cron jobs are removed via these migrations:

- `20260115_remove_legacy_trending_cron_jobs.sql`
- `20260115_remove_backfill_cron_jobs.sql`

If you still see cron jobs in Supabase, apply migrations and re-check:

```sql
select jobid, schedule, command, active from cron.job order by jobid;
```

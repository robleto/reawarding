# Release Checklist

This checklist helps ensure safe deploys for the ReAwarding app.

## Preflight
- [x] `git pull` and confirm on `main` — pushed commit `38bdf3a` 2026-02-21
- [x] `npm ci` to ensure clean deps
- [x] `npm run build` passes locally
- [x] Environment variables verified — GitHub Actions secrets set 2026-02-21
- [x] CI workflow active — `.github/workflows/playwright.yml` (build → lint → 9 e2e tests)

## Database
- [x] Apply new migrations — production Supabase confirmed live
- [x] Verify schema changes
  - `movie_lists.list_type` exists and backfilled for Watchlist ✓
  - Unique index `uniq_user_watchlist` present ✓ (confirmed 2026-02-21)

## App Smoke Tests
- [ ] Home page renders correctly
- [ ] Film detail page
  - [ ] Community Stats show Total Ratings, Avg, Seen, On Watchlist, On Lists
  - [ ] Similar Movies, Videos, Photos render as single-row scrollers
- [ ] Create/login user and confirm
  - [ ] Auto-provisioned Watchlist exists (My Lists page)
  - [ ] Adding a movie to Watchlist works

## Edge Functions (if changed)
- [x] Deploy functions — 4 stale/missing functions deployed 2026-02-21:
  - `enrich-movie-details` (updated: film collections + telemetry)
  - `tmdb-fresh-movies` (updated: ingestion tuning)
  - `update-movie-batch` (updated: batch processing)
  - `enrich-movies` (new: first deploy)
- [ ] Verify CRON secrets and schedules

## Post-Deploy
- [ ] Monitor Supabase logs
- [ ] Quick real-user smoke test
- [x] Tag release in Git — `v0.2.0` pushed 2026-02-21

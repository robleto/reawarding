# Release Checklist

This checklist helps ensure safe deploys for the ReAwarding app.

## Preflight
- [ ] `git pull` and confirm on `main`
- [ ] `npm ci` to ensure clean deps
- [ ] `npm run build` passes locally
- [ ] Environment variables verified for target (Supabase URL/keys, TMDB, etc.)

## Database
- [ ] Apply new migrations
  - Local: `supabase db push` (or `db reset` for a full replay)
  - Cloud: run SQL from `supabase/migrations/*` in Supabase SQL editor or via CI
- [ ] Verify schema changes
  - `movie_lists.list_type` exists and backfilled for Watchlist
  - Unique index `uniq_user_watchlist` present

## App Smoke Tests
- [ ] Home page renders with “For Your Consideration”
- [ ] Film detail page
  - [ ] Community Stats show Total Ratings, Avg, Seen, On Watchlist, On Lists
  - [ ] Similar Movies, Videos, Photos render as single-row scrollers
- [ ] Create/login user and confirm
  - [ ] Auto-provisioned Watchlist exists (My Lists page)
  - [ ] Adding a movie to Watchlist works

## Edge Functions (if changed)
- [ ] Deploy functions: `supabase functions deploy <name>`
- [ ] Verify CRON secrets and schedules

## Post-Deploy
- [ ] Monitor Supabase logs
- [ ] Quick real-user smoke test
- [ ] Tag release in Git: `git tag -a vX.Y.Z -m "Release notes" && git push --tags`

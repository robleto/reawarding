# Feature Status

Reference before building anything new. Most features in this codebase already exist — some are active, some are dormant (built but disconnected from the nav or homepage).

Last updated: March 2026

---

## Active (visible to users)

| Feature | Entry point | Key files |
|---|---|---|
| Movie search + add | Homepage, Films page | `src/components/home/MovieSearchPicker.tsx` |
| Watch (seen_it) | Any film card | `src/components/movie/SeenItButton.tsx` |
| Rate (1–10) | Any film card | `src/components/movie/RatingModal.tsx` |
| Awards (Best Picture) | `/awards` | `src/app/awards/page.tsx`, `src/components/award/EditableYearSection.tsx` |
| Rankings | `/rankings` | `src/app/rankings/page.tsx` |
| Year ballot cards | Homepage | `src/components/home/ExpandableYearCard.tsx` |
| Guest mode | All pages | `src/hooks/useGuestRankingStore.ts`, `src/utils/guestMode.ts` |
| Film collections | `/films/collections/[slug]` | `src/app/films/collections/[slug]/page.tsx` |
| Public profiles | `/[username]` | `src/app/[username]/page.tsx` |

---

## Dormant (built, disconnected — restore, do not rebuild)

| Feature | Status | Key files | Notes |
|---|---|---|---|
| Watchlist | DB exists, no card UI | `src/utils/watchlist.ts`, `list_type='watchlist'` in DB | Needs `useWatchlist` hook + bookmark icon on cards |
| Manual list building | Pages exist, no nav link | `src/app/lists/` (all pages) | Restore nav link in `HeaderNav.tsx` + `MobileTabBar.tsx` |
| Ready-made / smart lists | Page exists, no homepage integration | `src/app/lists/ready-made/` | Extract detection into `useSmartListAlerts` hook |
| Public lists | Page exists, no homepage row | `src/app/lists/public.tsx` | Surface as `HorizontalListRow` for established users |
| Recognition feed | Component exists, queries may be empty | `src/components/home/RecognitionFeed.tsx`, `src/hooks/useRecognitionFeed.ts` | Fix query reliability |
| Profile: Lists tab | No `/[username]/lists` page | — | Port `src/app/lists/mine.tsx` into profile sub-page |
| Profile: Watchlist tab | No `/[username]/watchlist` page | — | New page reading `movie_list_items` for user's watchlist |
| Profile: Activity tab | No `/[username]/activity` page | — | New page reading `rankings` updates as timeline |
| Profile: Following tab | No `/[username]/following` page | — | Blocked on follows DB table (see New Builds) |

---

## New builds (does not exist, must be built)

| Feature | Phase | Key new files |
|---|---|---|
| Onboarding questions (post-login) | P3 | `src/app/onboarding/page.tsx` |
| Adaptive homepage (3 user states) | P4 | `src/app/page.tsx` (state detection logic) |
| Letterboxd / IMDb CSV import | P5 | `src/app/settings/import/page.tsx`, `src/app/api/import/library/route.ts` |
| Friends / following | P6 | `supabase/migrations/follows.sql`, `src/hooks/useFollowing.ts`, `src/hooks/useFriendFeed.ts` |
| OG image export (awards + lists) | P7 | `src/app/api/og/award/[year]/route.tsx`, `src/app/api/og/list/[listId]/route.tsx` |
| Share sheet (social platforms) | P7 | `src/components/ui/ShareSheet.tsx` |
| Storybook | P1 | `.storybook/`, `src/stories/*.stories.tsx` |

---

## Retired / do not restore

| Feature | Why retired |
|---|---|
| "Oscarworthy" branding | Renamed to Reawarding. Treat any occurrence as a bug. |
| Manual ballot commit step | Ballots form automatically — no "Create Ballot" button (CONSTRAINT 14) |
| Separate winner field | Winner derived from crown selection only (CONSTRAINT 15) |

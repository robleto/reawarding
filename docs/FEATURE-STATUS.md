# Feature Status

Reference before building anything new. Most features in this codebase already exist — some are active, some are dormant (built but disconnected from the nav or homepage).

Last updated: 2026-08-23 (Best Animated ballot UI re-enabled — moved from Dormant to Active; still has open gaps, see its row below)

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
| Ready-made / smart lists | Homepage nudge (director/actor/genre/decade alerts) + `/lists/ready-made` | `src/hooks/useSmartListAlerts.ts`, `src/app/page.tsx`, `src/app/lists/ready-made/page.tsx`, `src/app/lists/ready-made/[slug]/page.tsx`, save handler in `src/app/lists/home.tsx` | Full detect → save → view loop against real Supabase queries |
| Letterboxd / IMDb CSV import | `/settings/import`, linked from `/settings` | `src/app/settings/import/page.tsx`, `src/app/api/import/library/route.ts` | Ratings/watched import works; watchlist-only rows are parsed but not inserted (`// full watchlist import is a separate concern`) |
| Alternate Oscar History — per-year badge (free) | Year cards, via `AcademyStamp` | `src/components/award/AcademyStamp.tsx`, `src/data/officialAwardWinners.ts` (`getAcademyStatus`), rendered in `AwardCard.tsx` / `EditableYearSection.tsx` | Upheld/Reawarded/Unscreened per year, fully wired, not premium-gated — matches `PRODUCT_DECISION_LOG.md` |
| Alternate Oscar History — lifetime aggregate (premium) | Homepage Canon section (Mature-tier) | `src/hooks/useAlternateOscarHistory.ts`, `src/components/home/AlternateOscarHistoryPanel.tsx`, gated by `src/hooks/useIsPremium.ts` | Headline stats, by-decade breakdown, most-controversial-calls all built; entitlement now backed by real Stripe subscription status (`/api/stripe/webhook`) as of 2026-07-22 — previously a stub that always returned `false` |
| Shareable award cards | Share button under any set-ballot winner (`AwardCard`'s `onShare`, wired from `EditableYearSection`) on Home and `/[username]/awards` | `src/components/social/ShareSheet.tsx`, `src/app/api/og/award/route.tsx` | Generates 1200×630 (OG/Twitter) and 1080×1080 (IG/TikTok) share cards + copy-link/social-intent links; category label (`categoryLabel` prop, defaults "Best Picture") threads through to both the image and the share text via `AwardsTabs.tsx`'s `CATEGORY_LABELS` |
| Best Animated ballot UI | Tab on `/[username]/awards` (`AwardsTabs`), re-enabled 2026-08-23 | `src/components/award/AwardsTabs.tsx`, `src/app/[username]/awards/page.tsx`, `src/utils/categoryEligibility.ts`, `src/hooks/usePublicProfile.ts` (`category` param), `src/app/api/users/[username]/route.ts` (`?category=`), `src/hooks/useCreateAward.ts`/`useUserAwards.ts`/`src/data/officialAwardWinners.ts` (all category-aware, default `"best-picture"`) | Official winner data backfilled (25/25 matched, `scripts/data/best-animated-winners.json`). Derived nominees (rated 7+, `genres` includes `"Animation"`), editing/saving, and sharing (correct "Best Animated" label) all work correctly. **Known open gaps, shipped anyway:** no dedicated "add a new animated film" search flow (only pre-rated films surface as nominees); no per-category homepage maturity state (rides the global New/Building/Established/Mature state); Alternate Oscar History still best-picture-only, not extended to this category. |

---

## Dormant (built, disconnected — restore, do not rebuild)

| Feature | Status | Key files | Notes |
|---|---|---|---|
| Watchlist | DB exists, no card UI | `src/utils/watchlist.ts`, `list_type='watchlist'` in DB | Needs `useWatchlist` hook + bookmark icon on cards |
| Manual list building | Pages exist, no nav link | `src/app/lists/` (all pages) | Restore nav link in `HeaderNav.tsx` + `MobileTabBar.tsx` |
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
| Friends / following | P6 | `supabase/migrations/follows.sql`, `src/hooks/useFollowing.ts`, `src/hooks/useFriendFeed.ts` |
| Storybook | P1 | `.storybook/`, `src/stories/*.stories.tsx` |

---

## Post-launch (design exploration, no code yet — not scheduled)

Wireframed in chat on 2026-08-22, inspired by a competitor ad tracking per-year Oscar-nomination-watching progress. Not yet reconciled against a phase; treat as candidate ideas, not commitments.

| Feature | Status | Notes |
|---|---|---|
| Oscar Night Readiness | Wireframed, no code | Free, current-cycle only ("current year" = the film year running Jan 1 → ceremony date, i.e. the *prior* calendar year's crop). Plain per-category "X of Y seen" list, incomplete categories sorted first, so the user never has to do the math. Ceremony countdown shown as a separate plain typographic stat next to it — deliberately **not** wrapped in a ring, since a ring there would misleadingly read as depleting alongside the days remaining rather than showing category completion. Proposed home: inside Collections (not new nav), with seasonal homepage promotion Jan 1 → ceremony date, when the current-year Awards section is otherwise thin. |
| Collection detail view (e.g. "Best Picture Winners: 2000s") | Wireframed, no code | **Verify against the existing Film collections feature (`/films/collections/[slug]`, Active above) before building — this may just be a new collection type on that existing page, not a new screen.** Concept: header completion ring (valid here — a bounded, specific collection, unlike an all-categories rollup), flat list of films (poster, title, ceremony year, winner tag, seen/unseen check), unseen winners flagged with a gold accent. Plain browsing/tracking only — no ratings, opinions, or comparison on this screen. Should use `MovieCard`/`HorizontalListRow` per the component reuse mandate rather than the bespoke row markup used in the wireframe. |
| "Compare" screen — full year-by-year "They said vs. I said" browse | Wireframed, no code — **CONFIRMED duplicate of an Active feature's logic; only the presentation is new** | Verified by reading the actual implementation (2026-08-22): every data point this screen needs already exists as a reusable pure function/hook — Academy's per-year winner via `fetchOfficialAwardWinners()` (`src/data/officialAwardWinners.ts:61-94`); the user's own ballot winner via `UserAward.winnerId` resolved against that year's `Movie[]` (`src/utils/alternateOscarHistory.ts:108`), with the user's rating already on `movie.rankings[0].ranking`; the categorical status via `getAcademyStatus()` (`src/utils/academyStatus.ts:42-74`), aggregated across years by `computeAlternateOscarHistory()` (`src/utils/alternateOscarHistory.ts:51-148`); and the verdict-stamp visual itself already exists as `AcademyStamp.tsx` (rotated ink stamp, green Upheld / amber Reawarded, blank for Unscreened). None of that needs to be recomputed or redesigned. What's actually missing is presentation only: (1) a dedicated full-screen route for one collection — no such route exists; `AcademyStamp` currently renders one-at-a-time in a card corner (`AwardCard.tsx`, `EditableYearSection.tsx:1526-1528`), and `AlternateOscarHistoryPanel` shows numeric aggregates, not a scrollable per-year list; (2) a two-column poster layout with a per-film score badge — posters and scores aren't currently shown side-by-side anywhere in the Academy-comparison UI; (3) a placeholder treatment for Unscreened years in that two-column layout (today Unscreened is just "no stamp shown," not a designed empty state). **Any build here should be scoped as "new screen reusing `getAcademyStatus`/`computeAlternateOscarHistory`/`AcademyStamp`," not as a new feature** — and the wireframe's "Agreed" label should be renamed to **Upheld** to match. |

---

## Retired / do not restore

| Feature | Why retired |
|---|---|
| "Oscarworthy" branding | Renamed to Reawarding. Treat any occurrence as a bug. |
| Manual ballot commit step | Ballots form automatically — no "Create Ballot" button (CONSTRAINT 14) |
| Separate winner field | Winner derived from crown selection only (CONSTRAINT 15) |

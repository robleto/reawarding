# Session summary — 2026-08-24, logged-out home + guest year-walk

Paste this into a fresh chat to resume. Everything below is committed locally
on `fix/xcode-cloud-install-node` unless marked otherwise. **Nothing has been
pushed or PR'd** — batching by explicit instruction, don't open a PR without
being asked.

## First: fix the dirty working tree

Four files are uncommitted right now, on purpose, for local simulator testing:

```
capacitor.config.ts        → server.url temporarily http://localhost:3000, cleartext: true
public/offline.html        → APP_URL temporarily http://localhost:3000
ios/App/App/Info.plist     → has a temporary NSAllowsLocalNetworking exception
.claude/launch.json        → added an "reawarding-attach" preview config
```

**Do not `git add -A` or commit these three iOS/config files as-is.** This
exact swap was accidentally committed once already today (`1c7b7a1`, reverted
in `0755574`) — bundled into an unrelated commit by another concurrent
session. Before any real commit, `git status --short` these three by name and
leave them out, or revert them first:

```bash
git checkout capacitor.config.ts public/offline.html ios/App/App/Info.plist
npx cap sync ios
```

Revert before any App Store build regardless — the preview note below explains
why they're like this.

## What shipped (15 commits, `e37c693` → `91f6a29`)

Full spec: `docs/design/first-rating-payoff.md`. Built a 4-act flow for a
logged-out visitor, shared between the native app screen and the web hero via
one hook (`useLedgerWalk`, in `src/hooks/`):

- **Act 1 — Fill.** Rate any film → it lands in the `AcademyLedger`'s "Yours"
  slot next to the Academy's real pick for *that film's year* (re-keys
  correctly regardless of what year you pick — verified live with a 1994 film
  as someone's very first-ever pick).
- **Act 2 — Walk.** After the first fill, ask about one more year at a time:
  Academy's real pick + 4 curated contender posters to tap, or "Academy got
  it right" (agree) / "haven't seen enough" (skip). Years are an editorial
  list (`src/data/contestedYears.ts`) ordered by *how contested* they are
  (1994, 2010, 2016...), not recency — verified against the DB that the
  editorial pins actually surface the right posters (e.g. pinning The Social
  Network for 2010, since rating-order alone misses it).
- **Act 3 — Save.** After ~8 years or 2 skips, show the tally ("8 years on
  the record, you reawarded 7, agreed on 1") and the first real signup ask —
  deliberately not asked earlier, since guest data persists locally with
  nothing to lose until now.
- **Act 4 — Deepen.** Reused the existing `/onboarding/[year]` depth page
  rather than building new.

A walk answer is a *preference*, not a rating (Fork B, decided explicitly) —
recorded via `createAward`'s existing `seed_pick` source, no 1-10 score
required, so it can't inflate `setBallotCount` into a fake "set ballot."

## Real bugs found and fixed along the way

1. **Guests silently lost ~1/3 of ratings.** `fetchMoviesForKey`'s guest path
   loads only 3000-of-4400 movie rows with no `ORDER BY`, and had no rescue
   fetch for out-of-window films (the authenticated path already had one).
   Fixed in `e37c693`.
2. **Signing up made the guest's work disappear.** `formattedYears` only
   grouped by *rated* films; walk picks are awards with no rating attached,
   so they had no year entry at all. Fixed in `993de39` (`useAwardFilms`
   hook resolves award-referenced films outside the movie window too).
3. **The walk started before Act 1 even happened.** `askingYear` fell
   through to the first contested year on a truly cold guest (zero
   rankings). Never caught until web was wired up and tested cold for the
   first time. Fixed inside `useLedgerWalk`.
4. **Guest tab bar hid the walk's own "Next: {year}" button.** A guest tab
   bar had been added earlier in the day; reverted outright — guests get no
   bottom nav at all, at least for now. Fixed in `42c9f70`.
5. **The old onboarding modal was a dead end.** First-ever pick opened
   `OnboardingPickFlow`'s Watch→Rate→Form modal, and step 3 ("Form") had CTAs
   that predate the walk and never lead back to it. Added
   `autoCloseAfterRate` so a guest's first pick (and only that case) closes
   straight back to the filled ledger. Fixed in `82d033b`.
6. **"Try a different year" on the depth page bounced guests to `/login`.**
   Pre-existing bug in `/onboarding/[year]/page.tsx`, just never reachable by
   a guest until this session's "keep going" link started sending them
   there. Fixed in `1a82c69`.
7. **The search box mid-walk recorded the wrong year, and could eject you
   from the walk entirely.** Scoped it to the year being asked
   (`filterByYear`) in `cf49f61`.

## Instrumentation (new, `7f3a69d`)

New table `walk_events` (migration `20260824000000_create_walk_events.sql`,
already applied to the DB), API route `/api/walk/event`, hook
`useWalkTelemetry`. Logs `year_offered` / `year_reawarded` / `year_agreed` /
`year_skipped` / `walk_completed`. Two read views: `walk_year_funnel` (does
the editorial year list actually earn verdicts?) and `walk_abandonment`
(where do sessions stop). Nothing fires yet in production — this only runs
where the walk runs, which is nowhere deployed yet.

## Design pass, in progress when interrupted

Direct feedback: after cutting the empty-ledger + "Rate it 1-10" mechanic
text from the pristine (never-rated) screen, it "looks basic." Two rounds so
far:

1. `a79d76b` — cut the empty 2025 ledger and the mechanic line entirely from
   the pristine state. Verified reasoning, not just taste: no curation data
   exists for the *current* year the way `contestedYears.ts` has it for aged
   years (checked the DB — rating-order for 2025 returns anime/international
   titles with no Best Picture relevance), and the 7+ rule is already taught
   at the moment of rating in `RatingModal`/`OnboardingPickFlow`, so nothing
   was lost by cutting it.
2. `91f6a29` — the resulting single gold line read flat. Fixed by giving
   native the same two-tier header web already has (small gold kicker +
   bold white headline), reusing the *exact* H1 class every other state on
   this screen already uses. New copy constant `NATIVE_FIRST_OPEN.kicker`.

**Open, unresolved when this thread ended:** there's a large empty region
below "How Reawarding works" now. Two options on the table, neither built:
- Leave it — legitimate minimal/restraint choice, matches the product's own
  "first opinion in under 30 seconds, minimal distraction" goal.
- Add one restrained atmospheric element (e.g. a soft, desaturated poster
  wall low in the frame) to fill it without making any informational claim —
  flagged as needing explicit go-ahead before building, since this app has
  already been burned once today by imagery that implied a promise it
  couldn't keep (the old empty ledger).

Pick up here: decide leave-it vs. mockup-the-atmosphere, then implement.

## Testing

Deferred by explicit instruction — TestFlight issues are being sorted
separately. `tests/prelogin.spec.ts` covers the pre-walk-work baseline (8/8
passing); none of today's Acts 1-4 have real test coverage, only manual
Playwright scripts run ad hoc during the session (not committed, lived in
the session scratchpad).

## Environment notes for the next session

- **Shared dev server.** Port 3000 is shared across many concurrent Claude
  sessions on this machine (`ListAgents` showed 10 peers at one point today).
  Don't `npm run build` while it's running — it clobbers `.next` under the
  dev server and produces stale-chunk 404s. If chunks 404 with only one PID
  on the port, a plain restart (`kill <pid>` then `npm run dev`) fixed it
  once already today, without needing to touch `.next` on disk.
- **`mcp__Claude_Browser__*` and the iOS Simulator's `attach` action are
  both blocked by org policy** in this environment — don't retry them, work
  through Playwright scripts + the user's own simulator instead.
- **Stage explicit files, never `-A`/`.`** — this repo has multiple sessions
  committing to the same branch; it's how the capacitor.config.ts oversight
  happened once already today.
- Read `docs/design/first-rating-payoff.md` and
  `docs/design/logged-out-native-home.md` for the full design rationale
  before changing behavior — a lot of "why" lives there, not just in commit
  messages.

# Component Registry

Canonical UI components for Reawarding. Before adding a new component, check this list. If a suitable component exists, use it — do not clone, fork, or create a near-duplicate.

PRs that introduce a new card type not listed here must justify the addition explicitly.

**Audited 2026-08-19 against actual `grep` usage** — the previous version of
this doc had drifted from the real codebase (one listed component didn't
exist at all; several others were listed as "the" canonical choice while
having zero call sites anywhere). Entries below are corrected to what's
actually true today; verify with a fresh grep before trusting this doc again
in six months, docs drift.

---

## Cards

### `MovieCard` — the real canonical movie card (all variants)
**Path:** `src/components/award/MovieCard.tsx` (lives in the `award` folder
for historical reasons; it is not award-specific — this is THE shared movie
card for the whole app)
**Use for:** Any grid or row display of a single film. Confirmed used across
Films, Rankings, Watchlist, Collections, YearExplorer, and the Awards edit
screens — this is the one to reach for, not the two below.
**Variants (`variant` prop):** `"grid"` (dense poster tile — Films list mode,
older Awards candidate grids), `"large"` (bigger poster + richer overlay,
title below the poster — Films/Rankings grid view, the Awards candidate grid
as of 2026-08-19), `"compact"` (row layout; pass `native` for the glass-card
row treatment Rankings' list view uses, `native={false}` for the flatter
desktop-row look), `"featured"` (large single-poster display, no card chrome).
**Gap:** no Storybook story exists for this component despite being the most
heavily reused card in the app — worth adding if anyone reaches for one.

### `MovieRowCard` — real, but narrowly used, not general-purpose
**Path:** `src/components/movie/MovieRowCard.tsx`
**Use for:** Confirmed used in exactly one place today,
`src/components/home/AlternateOscarHistoryPanel.tsx`. Don't reach for this as
a general "movie row" component — that's `MovieCard variant="compact"` (see
above). Only extend this one if you're specifically working on the Alternate
Oscar History panel.
**Storybook:** `src/stories/MovieRowCard.stories.tsx`

### `AwardCard`
**Path:** `src/components/home/AwardCard.tsx`
**Use for:** The gilt-frame ceremonial winner card (animated gold shimmer
frame, metallic year plaque, trophy badge, museum-placard caption below the
frame). Confirmed used in the Awards edit screens, `[username]` profile
pages, and a couple of homepage panels. `fullWidth` prop toggles between the
shelf-card size and a standalone full-width display.
**Storybook:** `src/stories/AwardCard.stories.tsx`

### `ExpandableYearCard` — currently orphaned, zero call sites
**Path:** `src/components/home/ExpandableYearCard.tsx`
**Status:** Confirmed **not imported anywhere** in the app as of 2026-08-19,
despite this doc previously calling it "the primary ballot progress card."
Either it's slated to be wired in, or it should be treated as legacy —
confirm with the team before assuming it renders anywhere, and don't spend
design/polish effort on it without wiring it in first.
**Storybook:** `src/stories/ExpandableYearCard.stories.tsx` (story exists;
component isn't reachable from the app)

---

## Rows

### `HorizontalListRow`
**Path:** `src/components/list/HorizontalListRow.tsx`
**Use for:** Any horizontally scrollable row of films, lists, or awards.
Confirmed used in `src/app/lists/public.tsx`, `src/app/lists/mine.tsx`,
`src/components/list/ListCard.tsx`, and
`src/components/list/PublicListsHomeSection.tsx` — genuinely canonical.
**Storybook:** `src/stories/HorizontalListRow.stories.tsx`

### `RecognitionFeed` — currently orphaned, zero call sites
**Path:** `src/components/home/RecognitionFeed.tsx`
**Status:** Confirmed **not imported anywhere** as of 2026-08-19. Same caveat
as `ExpandableYearCard` above — don't assume it's live.
**Storybook:** `src/stories/RecognitionFeed.stories.tsx` (story exists;
component isn't reachable from the app)

---

## Actions

### `SeenItButton`
**Path:** `src/components/movie/SeenItButton.tsx`
**Use for:** Toggle Watch state (`seen_it = true/false`) on any film.
**Semantic:** "I have watched this film." NOT the same as watchlist.
**Storybook:** `src/stories/SeenItButton.stories.tsx`

### `RatingModal`
**Path:** `src/components/movie/RatingModal.tsx`
**Use for:** Rate a film 1–10. Shows post-rating confirmation (7+ = contender nudge).
**Storybook:** `src/stories/RatingModal.stories.tsx`

### `ShareButton` — currently orphaned, zero call sites
**Path:** `src/components/ui/ShareButton.tsx`
**Status:** Confirmed **not imported anywhere** as of 2026-08-19. Same caveat
as above.

---

## Awards-specific components not yet in this registry

Two components carry real, heavy usage in the Awards feature but were never
added here — worth knowing about even without full entries yet:

- **`EditableYearSection`** (`src/components/award/EditableYearSection.tsx`)
  — the actual view/edit surface for a year's ballot, reused on Home, My
  Awards, and (in `mode="workshop"`) inside `YearExplorer`. The single
  heaviest-used award component in the app; has no Storybook coverage.
- **`YearExplorer`** (`src/components/home/YearExplorer.tsx`) — the ballot
  workspace (drag-reorder nominees + candidate grid), reached from Home's
  "Edit ballot" and the standalone `/year/[year]` route. No Storybook
  coverage.

Also confirmed currently orphaned (zero call sites, same caveat as above):
`AwardsTabs` (`src/components/award/AwardsTabs.tsx`) and `AwardsEmptyState`
(`src/components/award/AwardsEmptyState.tsx`).

---

## Layout

### `HorizontalScroller`
**Path:** `src/components/ui/HorizontalScroller.tsx`
**Use for:** Scroll container for any horizontal content.

### `ScreenState`
**Path:** `src/components/ui/ScreenState.tsx`
**Use for:** Empty, loading, and error states. Never show a blank screen.

### `Banner`
**Path:** `src/components/ui/Banner.tsx`
**Use for:** Dismissible in-page notifications (smart list alerts, milestone nudges).
**Note:** Milestones must persist on canvas per LAW 7 — only use Banner for non-milestone nudges.

---

## Storybook

Run locally:
```bash
npm run storybook
```

All canonical components above have a story. When adding a new variant, add it to the existing story — do not create a new component.

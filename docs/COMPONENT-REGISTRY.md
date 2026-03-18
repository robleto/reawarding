# Component Registry

Canonical UI components for Reawarding. Before adding a new component, check this list. If a suitable component exists, use it — do not clone, fork, or create a near-duplicate.

PRs that introduce a new card type not listed here must justify the addition explicitly.

---

## Cards

### `MoviePosterCard`
**Path:** `src/components/movie/MoviePosterCard.tsx`
**Use for:** Any grid or row display of a single film as a poster.
**Variants:** default, ratingOnly, withWatchlist, incomplete
**Storybook:** `src/stories/MoviePosterCard.stories.tsx`

### `MovieRowCard`
**Path:** `src/components/movie/MovieRowCard.tsx`
**Use for:** List/row display of a film with metadata (title, year, rating, actions).
**Variants:** default, withRating, withWatchlistBtn
**Storybook:** `src/stories/MovieRowCard.stories.tsx`

### `ExpandableYearCard`
**Path:** `src/components/home/ExpandableYearCard.tsx`
**Use for:** Displaying a ballot year with leader, nominee count, and expandable film list.
**Variants:** collapsed, expanded, noLeader
**Storybook:** `src/stories/ExpandableYearCard.stories.tsx`
**Note:** This is the primary "ballot progress" card. Do not create bespoke continue-rating cards.

### `AwardCard`
**Path:** `src/components/home/AwardCard.tsx`
**Use for:** Compact award summary (winner + year + nominee count) for lists/grids.
**Variants:** complete, inProgress
**Storybook:** `src/stories/AwardCard.stories.tsx`

---

## Rows

### `HorizontalListRow`
**Path:** `src/components/list/HorizontalListRow.tsx`
**Use for:** Any horizontally scrollable row of films, lists, or awards.
**Variants:** default, readOnly, withAddBtn
**Storybook:** `src/stories/HorizontalListRow.stories.tsx`

### `RecognitionFeed`
**Path:** `src/components/home/RecognitionFeed.tsx`
**Use for:** Multiple stacked horizontal rows with labels (e.g., "Popular this year", "Friends are rating").
**Variants:** loading, withRows, empty
**Storybook:** `src/stories/RecognitionFeed.stories.tsx`

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

### `ShareButton`
**Path:** `src/components/ui/ShareButton.tsx`
**Use for:** Trigger share sheet for awards or lists.

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

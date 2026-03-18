# Product Loop — Watch → Rate → ReAward

This document defines the primary user loop and the four distinct action types that make it up. These must never be conflated in UI, copy, or code.

---

## The Loop

```
Watch → Rate → ReAward
```

### 1. Watch
- **What it means:** "I have seen this film."
- **DB:** `rankings.seen_it = true`
- **UI component:** `SeenItButton` (eye / check icon)
- **Tooltip:** "Mark as watched" / "Watched"
- **Triggers:** Nothing automatic. Just logs the watch.

### 2. Rate
- **What it means:** "Here is my score for this film."
- **DB:** `rankings.ranking = 1–10`
- **UI component:** `RatingModal` (star icon)
- **Tooltip:** "Rate this film"
- **Triggers:** If rating ≥ 7, film becomes a contender for its release year.

### 3. ReAward
- **What it means:** Your ballot has formed. Your nominees are set. Your winner has emerged.
- **DB:** Auto-derived from rankings (no user action required)
- **UI:** Awards page, `ExpandableYearCard`, `AwardCard`
- **Triggers:** Nominee count reaching thresholds (see PRODUCT_CONSTRAINTS §5)

---

## Watchlist — the prior step

Watchlist is a *separate concept* from Watch. It is the queue before the loop begins.

| Concept | Meaning | DB | Icon |
|---|---|---|---|
| Watchlist | "I want to see this someday" | `movie_list_items` where `list_type='watchlist'` | Bookmark |
| Watch | "I have seen this" | `rankings.seen_it = true` | Eye / Check |

**Rule:** Once a film is marked as Watched, it should be automatically removed from the Watchlist. A film cannot be both "want to watch" and "already watched."

---

## UI ordering on cards

When all states are possible, actions must appear in this order:

```
[Bookmark: Add to watchlist]   — only if seen_it = false
[Eye: Mark watched]            — always available
[Star: Rate]                   — always available; becomes primary if seen_it = true
```

On `MovieDetailModal`, this order must be respected in the action row.

---

## Copy conventions

| Action | Correct copy | Do NOT use |
|---|---|---|
| Watchlist add | "Add to watchlist" | "Track this film", "Save for later" |
| Watch | "Mark as watched" | "Track", "Log", "Check in" |
| Rate | "Rate this film" | "Score", "Review" |
| ReAward state | "Your [year] awards are taking shape" | "Your rankings", "Your list" |

The word **Track** was retired. It conflated Watch and Watchlist into one ambiguous action.

---

## Smart list relationship

As users Watch and Rate more films, groupings naturally emerge:
- 8 films by the same director
- 15 films from the same genre
- 20 films from the same decade

These groupings trigger **smart list alerts** — not manual list creation, but system detection that the user has *inadvertently* formed a list. The system surfaces it; the user confirms or dismisses.

This is the magic of the building → established transition: users discover they've built something they didn't set out to build.

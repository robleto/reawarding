# Ballot card states

This documents the states a single year's Best Picture card can be in, and the
design reasoning for each — the layer *below* the page-level states already
covered in `PRODUCT_DESIGN_PRINCIPLES.md` and the "Homepage states" table in
`CLAUDE.md`. Read those first; this doc doesn't repeat them.

**Scope distinction:**
- Page-level states (`New` / `Building` / `Established` / `Mature`) govern
  which *sections* render on Home — search vs. showcase, whether the Awards
  Gallery/Canon are eligible. Canonical in `CLAUDE.md` → "Homepage states."
- **Card-level states** (this doc) govern how a single year's ballot renders
  *within* the showcase, once a user is in Established/Mature and looking at
  their year archive. This is the layer with no dedicated spec today — the
  thresholds exist only as inline conditionals in
  `EditableYearSection.tsx`, with no shared type or named states.

Started 2026-08-22 after a review of the Established-state Home screen for a
user with ~8 ratings across 3 years (1 set ballot, 2 thin years) — see the
mockup at the bottom.

---

## Where the states actually live in code today

There is no `BallotCompletionState` enum. Every state boundary below is an
inline `nomineeCount` threshold, duplicated across a few render branches in
`src/components/award/EditableYearSection.tsx` (workshop copy: lines
1601–1619; view-mode copy: lines 1699–1714; the "Nominees" badge: lines
1553–1559). `nomineesNeededForComplete` (line 1042) is the one derived value
that exists as a named constant; the states themselves aren't named in code.

The four boundaries — `0`, `1–4`, `5–9`, `10` — are consistent everywhere
they're checked, which is good: the drift risk is that they're checked in
four separate places rather than one, so a future threshold change has to be
made four times.

---

## State 1 — No nominees (`nomineeCount === 0`)

**What's true:** the user hasn't rated anything from this year 7+ yet.

**What the user feels:** nothing yet — this is usually a year they've just
added to their timeline, not a year they've neglected. Per Law 3 ("Ballots
Must Form, Never Appear"), there is deliberately no ballot to show.

**Previous treatment:** a bare `"No winner selected yet."` line where the
winner poster would go, plus `"No nominees yet."` in the grid. No card-shell
distinction from a thin ballot — both got the full poster-column + 5-grid
frame.

**Methodology:** this state should read as an *invitation*, not an absence.
Per "Empty states feel intentional" (`PRODUCT_DESIGN_PRINCIPLES.md`), the old
gray placeholder text was the weakest point in the whole progression — the
one state that read as broken rather than forming, because there was no CTA
at all, just a null statement.

**Current treatment (built 2026-08-22):** folded into the same
`isThinBallot` branch as State 2 below, rather than a separate code path —
the compact-row shape is identical for 0 and 1–4 nominees; only the copy
changes. `EditableYearSection.tsx:1467–1490`: the poster slot shows a plain
film-icon placeholder tile (no `MovieCard`, since there's no film to show
yet), the descriptive line reads `"You haven't rated any {year} films yet."`
instead of naming a leading pick, the progress dots render 0-of-5, and the
CTA reads `"Rate a {year} film to start"` rather than the thin-ballot
`"Rate a {year} film →"` — same button, same destination (opens the
workshop), just first-visit framing instead of continuation framing.

## State 2 — Thin (`1 ≤ nomineeCount ≤ 4`)

**What's true:** the user has 1–4 films rated 7+ for this year. Below the
5-nominee floor Law 2 requires for a ballot to have "legitimacy" — this is a
preference, not yet a field.

**What the user feels:** early-stage curiosity about a year they've started
poking at. This is the exact state of the 2002 and 1999 cards in the
screenshot that prompted this doc — a new user's whole archive can easily be
2–3 years sitting in this state simultaneously.

**Previous treatment:** amber hint text, correctly de-escalated —
`"Rate {5 - count} more 7+ to fill the 5 nominee slots"`, plain language per
Guardrail 13 (no "Full Ballot"/"Standard Ballot" jargon below the
Established vocabulary threshold). **But the card shell around that line
didn't de-escalate with it** — it was the same full gilt-frame `AwardCard`
(`fullWidth`) plus 5-column poster grid as a 6- or 10-nominee year, just
with 4 of 5 grid tiles empty.

**Methodology (the finding that started this doc):** Law 4 — "Ballot
maturity … governs … visual weight … Thin ballots are provisional" — was
being honored in copy but not in layout. A thin-ballot card should be
visually quieter than a set one, not merely say quieter things while
occupying identical screen real estate.

**Current treatment (built 2026-08-22):** `EditableYearSection.tsx:1049`
(`isThinBallot`) branches the whole read-mode layout for `nomineeCount < 5`,
non-workshop, non-compact:
- No gilt `AwardCard` frame — gold ceremony is reserved for a Set ballot
  (`.impeccable.md`: "gold is for recognition, not decoration"). A thin year
  hasn't earned it yet.
- No 5-tile grid — a single small poster (`MovieCard variant="grid"`, the
  same tile the full grid already uses elsewhere, not a new poster
  treatment) plus a 5-dot progress indicator. The grid's job is to show a
  *field* of nominees; with one nominee there's no field to show.
- **The hint is now the primary action, not a footnote.** The old amber
  sentence is now a plain descriptive line, and the actual CTA is a real
  gold button ("Rate a {year} film →") that opens the same workshop "Edit
  ballot" already opened — Law 1 ("Awards Are The Face, Rankings Are The
  Engine") means this is the engine surfacing itself, and for a user with
  ~8 total ratings it's the single highest-leverage thing on the page.
- This is a rendering branch inside `EditableYearSection`, not a new
  component — Guardrail 6 requires Home and the Awards page render from one
  canonical source, and the component already computed `nomineeCount` in
  exactly the right place to branch on. (The codebase has a separate,
  **orphaned** component, `ExpandableYearCard.tsx`, that already solves this
  exact problem — collapsed row, state-driven border/glow, `Forming`/
  `Canonical` pills — for a *different*, simpler ballot model with no
  editing, Academy comparison, or workshop mode. It's a good reference for
  the visual language, but reviving it as a second live ballot-card
  implementation would itself violate Guardrail 6; the fix belongs inside
  `EditableYearSection`, which is what got built.)
- The old amber hint line is still live, unchanged, for the one case this
  branch deliberately excludes: `compact` mode (`EditableYearSection.tsx:
  1776–1777`). That's intentional, not a miss — compact already has its own
  reduced layout for a different embedding context (see the prop doc comment
  on `compact`), and extending this fix there wasn't part of this pass.

## State 3 — Forming (`5 ≤ nomineeCount ≤ 9`)

**What's true:** the ballot clears Law 2's legitimacy floor. This is a real
field of nominees now, without a winner necessarily locked.

**What the user feels:** this is where "Building has two leads"
(`PRODUCT_DESIGN_PRINCIPLES.md`) applies most directly — a 5/10 ballot and a
9/10 ballot are different emotional states even within this one bracket. The
principle's copy split ("N more nominees" vs. "one more film completes it")
is written for the single active-ballot card pre-Established, but the same
logic should carry into the archive: a 9-nominee year one film from Set is a
much hotter moment than a fresh 5-nominee year.

**Current treatment:** gray (not amber) "{10 - count} more films to
complete a Full Ballot" (line 1701) — note "Full Ballot" is allowed here
because Guardrail 13's jargon gate is about the *page title*/comparison
framing threshold (3+ ratings), not this specific line; by the time a year
has 5 nominees it's well past 3 ratings. Full-size `AwardCard` + full grid,
which is appropriate — this state has earned real visual presence.

**Methodology:** mostly correct as built. One gap worth closing later: no
distinct treatment for 9/10 (one-away) vs. 5/10 (just-cleared), even though
"Building has two leads" explicitly calls this out as different urgency. Low
priority relative to the thin-ballot fix — a forming ballot already reads as
"in progress, going fine," which isn't broken, just slightly under-lit at
the high end.

## State 4 — Set / Full Ballot (`nomineeCount === 10`)

**What's true:** the ballot is at its ceiling. Combined with an explicit
winner, this is what `CLAUDE.md` calls a "set ballot" for page-level state
purposes (the per-year gate is actually ≥5 there — see the note below on a
terminology seam).

**What the user feels:** authority, per Law 4 — "Mature ballots are
canonical." This is the only state where ceremony (gold, the `AwardCard`
frame, the "REAWARDED"/Academy-comparison stamp) is fully earned.

**Current treatment:** `"Full Ballot"` in emerald (line 1555) — note this is
the one spot using emerald rather than gold for a positive state; worth a
quick check on whether that's intentional (success-green semantics) or
drift, since `.impeccable.md`'s rule is "gold is for recognition" and emerald
reads as a different, more generic "done" signal than the rest of the
gold-reserved-for-ceremony system.

**Methodology:** this is the state the full gilt treatment is designed for;
no visual-weight gap here. Note a terminology seam worth resolving, not
urgent: `CLAUDE.md`'s "Homepage states" table defines *set ballot* as "≥5
nominees + explicit winner" (used for the page-level Established/Mature
math), while this component's `"Full Ballot"` label fires only at the
`nomineeCount === 10` ceiling. Both are correct for what they measure, but
the shared word "full"/"set" being used for two different thresholds (5 vs.
10) is a minor source of future confusion — consider whether the card-level
copy should say "Complete" or similar at 10 to keep "set" reserved for the
5-nominee page-level threshold.

---

## Related consistency notes (found in passing, not fixed here)

Two other on-brand-empty-state components already exist live and are worth
matching if/when the thin-ballot fix above gets built:
- `ListsEmptyState` (`src/components/lists/ListsEmptyState.tsx`) is the
  cleanest current reference: logomark, `font-unbounded uppercase` title,
  `text-gray-400` body, solid `gold-500` pill primary CTA.
- `RankingsEmptyState` and the inline empty state in `src/app/films/page.tsx`
  use `yellow-400`/`blue-600` instead of the `gold-500`/`gold-400` tokens —
  pre-existing drift from the palette in `.impeccable.md`, not something to
  propagate into a new thin-ballot CTA.

---

## Mockup

`thin-ballot-mockup.html` (sent separately) shows State 2 (Thin) before/after
using the exact 2002/1999 scenario from the reviewed screenshot, built from
the real tokens above (`gold-500 #D4AF37`, Unbounded/Inter, the amber hint
color already in use at line 1706). The Set-ballot row (2021/Encanto) is
shown unchanged for contrast — the point of the fix is that it should look
*more* different from the thin rows than it currently does, not that it
should change itself.

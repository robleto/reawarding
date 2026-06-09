# Reawarding Product Decision Log

Purpose: Record WHY major product direction decisions were made to prevent future regression.

---

## May 2026 — State Thresholds Made Depth-Aware; Gallery Gated; Transition Moment Added

### Decision

The four-state adaptive homepage now measures **depth, not breadth**. A "year touched" (≥1 rating in a year) no longer advances the user — a **depth year** is a year with 3+ ratings. The Established threshold becomes: 1+ set ballot, OR 2+ depth years, OR 20+ total ratings. Same logic at the Mature ceiling. The "completed ballot" term is replaced by **set ballot** (5+ nominees + an explicit winner) — the previous "10 nominees" definition is the cap, not the milestone.

The Awards Gallery is gated on at least one year having 3+ nominees. Below that bar the gallery is absent, not locked. The Building → Established crossing now renders a single persistent on-canvas line ("{Year} is set. Your first award.") at the top of the established home — fires once per user, dismissible, non-modal.

### Reason

A real returning user with 4 years touched, 6 total ratings, and 0 set ballots was landing in the Established state via the old `yearLeaders.length >= 2` arm of the threshold. The page rendered a 4-card Awards Gallery (with films that weren't even nominees, surfaced by a `galleryYears` fallback that took the highest-rated film when no nominees existed), a "Your Canon" stats wall reading "0 Ballots Complete," and a taste-chip rail derived from 6 ratings. The user saw a museum they had not built — false copy at every register.

The root cause was that `yearLeaders.length` is a breadth signal. Two ratings across two years was enough to promote a user to a register that assumed real investment. The fix is to count depth: years with 3+ ratings reflect actual engagement, not a curious tap.

The gallery gate is the same diagnosis at the section level. A ballot with 1 nominee is not a museum-ready award; calling it one is the kind of "ballots appearing fully-formed" feel that Law 3 forbids. We don't gate the *concept* of an award (emergence still holds — awards form from ratings the moment a single film is rated 7+), we gate when the gallery surfaces on Home. Thin ballots remain visible in the workshop where their formation context is intact.

The transition moment closes a UX hole. The single most important beat in the app — the user's first set ballot — was previously unmarked: the state just flipped on next render and a workbench became a gallery. Acknowledging it inline (not in a modal, not in a toast) gives the moment the canvas weight it deserves, per the "Milestones reshape the canvas" principle.

### What Changed

- `PRODUCT_DESIGN_PRINCIPLES.md` — five new principles: depth-not-breadth thresholds, gallery gate, the two-leads-of-Building, the marked transition moment, the screenshot-user test
- `CLAUDE.md` threshold table — rewritten with depth years + set ballots + gallery gate + transition note
- `src/app/page.tsx` (pending in subsequent commits on this branch): threshold formula replacement, gallery-gate guard, transition-moment rendering, cut list for users at the floor

### What Did NOT Change

- Awards still form from ratings the moment a film is rated 7+ — emergence holds
- Watch and Rate remain separate (Guardrail 10 holds)
- Mature is still strictly additive to Established
- The 7+ nominee threshold itself is unchanged
- The Mature workshop drawer pattern is unchanged (label refresh aside)

### Reversal Conditions

Loosen the depth-year bar back toward "year touched" only if research shows users are stalling in Building because they don't realize their light engagement isn't advancing them. The fix in that case is probably copy ("Rate 1 more 1972 to make it count") rather than threshold rollback. Re-introducing yearLeaders.length as the Established signal should be considered a regression.

---

## May 2026 — Onboarding Seed Lowered from 10 to 7; Ballot Framing Deferred to 3+ Ratings

### Decision

The auto-seed rating applied to a new user's first picked film is **7**, not 10. The "Best Picture Ballot" page title and "Will your ballot agree?" comparison prompt are deferred until the user has rated **3+ films for the year**. Below that threshold the surface reads as the neutral "Your {year}".

### Reason

A new user picking their first film for a year was being dropped into a fully-formed outcome: their pick was rated 10, auto-nominated, crowned with a winner trophy, and presented under the title "Your 2021 Best Picture Ballot" — all on action one. The onboarding tour's step 1 then asked them to *adjust* the rating, making the first user action a contradiction: undoing a verdict they didn't render.

This violated Law 3 (awards must form, never appear instantly) and Law 4 (visible formation) in spirit, even though the data pipeline technically respected emergence. The fully-formed-with-no-formation feel was the reported symptom.

Seeding at 7 instead of 10 keeps the loop visible on action one (the value of the seed mechanism) while changing the message from "you've already decided" to "this counts — now calibrate." The first user action becomes productive instead of corrective.

Deferring ballot framing until 3+ ratings lets the formal award language *earn* its appearance. After the seeded rating + two more explicit ratings, the page reframes — which is itself a "I did something, the page responded" formation moment.

### What Changed

- `YearExplorer.tsx` seeding effect — `ranking: 10` → `ranking: 7`
- Tour step 1 copy — was "Your pick is rated 10. Tap to adjust" — now "Starting score: 7. 7 is the threshold; tap to dial in how you actually felt."
- `YearExplorer` header title gated on `moviesWithRankings.length >= 3`
- "Will your ballot agree?" comparison hook gated on the same threshold
- `EditableYearSection.tsx` jargon line — "more films to reach a Standard Ballot" → "Rate N more 7+ to fill the 5 nominee slots"
- `PRODUCT_GUARDRAILS.md` Guardrails 12 and 13 added

### What Did NOT Change

- Watch and Rate remain separate actions (Guardrail 10 holds)
- The seed mechanism itself remains — the loop must be visible from action one
- Awards still emerge from ratings (emergence not gating)
- Three homepage states (new / building / established) unchanged
- The 7+ auto-nominate threshold itself is unchanged

### Reversal Conditions

Re-evaluate the seed value if user research shows that 7 produces enough cognitive friction that users churn before the ballot reframes at 3 ratings. The seed mechanism itself should not be reversed without first solving the formation-feel problem some other way; reverting to no-seed kills the action-one visibility of the loop, which was the original problem the seed was introduced to solve.

---

## March 2026 — Watch → Rate → ReAward Confirmed As Canonical Loop

### Decision

The primary product loop is: **Watch → Rate → ReAward.**

This replaces the earlier Opinion → Award → Nominees → Optional Rankings framing documented in previous versions of the product docs.

---

### Reason

The original Opinion → Award framing was written to prevent ratings from *gating* awards. That protection still holds — awards must form from ratings (emergence), not be unlocked by them (gating). But the framing created confusion: it suggested awards came first in the UX, when in practice users naturally watch a film, then rate it, then see their ballot form.

Watch → Rate → ReAward describes what actually happens. It matches user behavior and makes the product loop legible to new team members and AI coding assistants.

---

### What Changed

- Product Context Section 4 now documents Watch → Rate → ReAward as the primary loop
- Product Laws govern ballot formation, authority emergence, and user ownership
- Product Guardrails enforce the three-step distinction (Guardrail 10: Watch and Rate are distinct actions)
- All root-level product docs updated; contradictory docs archived

### What Did NOT Change

- Awards are still the primary emotional surface (Law 1)
- Awards must still form, never appear instantly (Law 3)
- Rankings are still a power tool, not a gate (Law 1)
- The system still suggests; the user still owns (Law 5)
- The anti-pattern remains forbidden: ratings required before awards can exist, awards hidden behind activity thresholds, ballots appearing fully-formed

---

### Key Distinction Preserved

Watch (seen_it = true) and Rate (1–10 score) are two separate user actions. They must never be collapsed into a single gesture. A user may watch without rating. A user may rate later. This was debated and resolved explicitly.

---

### Reversal Conditions

Re-evaluate only if user research shows the three-step model creates friction that the two-step model did not — and only if that friction cannot be solved through UX refinement.

---

## Feb 2026 — Awards-First Architecture Retention

### Decision

Continue forward with Awards-First architecture. Do not revert to the pre-overhaul model.

---

### Reason

The system engine is correct: single award pipeline, guest-to-auth migration working, ranking inference direction correct, year semantics normalized, award state machine implemented.

The issues at this stage are UX clarity, mode separation, and narrative continuity — not data architecture, core product model, or persistence model.

---

### Strategic Insight

We are in a refinement phase, not an exploration phase. We are shaping a working engine into a product voice — not designing a new system.

Mid-transition products feel worse before they feel better. This is expected when the old mental model has been removed, the new model is partially visible, and the narrative layer is incomplete. Temporary discomfort is not evidence of wrong direction.

---

### Operational Direction (Updated March 2026)

Completed or in progress:

- Award screen clarity → addressed through viewing/creation mode separation (Guardrail 8)
- Milestone visibility → addressed through Design Principles (milestones reshape the canvas)
- Component consolidation → cinematic card removed, ExpandableYearCard is now primary surface
- Storybook established for component drift prevention
- Adaptive homepage scoped across three user states (new, building, established)

Current focus:

- Restore watchlist, lists, and social features to existing surfaces
- Profile tab expansion (activity, lists)
- Export/sharing for awards and lists
- Smart list detection for building-to-established user transition

Long-term focus:

- Expand depth features only after core loop clarity is locked

---

### Risk Of Reverting

Reverting would destroy the working award pipeline, re-open data model questions, delay product maturation, and re-introduce solved architectural risks.

---

### Reversal Conditions

Re-evaluate only if: awards stop being the primary entity, awards require rankings before existence, multiple canonical awards appear per year, users cannot easily correct system inference, or year semantics drift from the release-year model.

If none are true → continue forward.

---

### Product Identity Protection

Product Laws override implementation convenience. If implementation conflicts with Product Laws, refactor the implementation — not the product philosophy.
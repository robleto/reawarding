# Reawarding Product Decision Log

Purpose: Record WHY major product direction decisions were made to prevent future regression.

---

## July 2026 — Premium Tier Direction: Scope-and-Reflection Model; First Feature Is Your Alternate Oscar History

### Decision

Reawarding will monetize on a "bigger, not faster" model: every premium feature expands what a user can *reach*; none let a user *skip* something the free tier already makes earnable through engagement.

- Free tier keeps the entire Watch → Rate → ReAward loop, Best Picture as a category, unlimited years, and Ready-Made Lists — still unlocked by investment (e.g. 10 seen films by a director), never by payment.
- Premium expands scope (the full Academy category slate beyond Best Picture; unlimited historical ballot construction beyond a free recency window) and adds a reflection/output layer that doesn't exist for free users at all.
- The first premium feature specified is **Your Alternate Oscar History** — a comparison between a user's own Best Picture ballots and the Academy's real historical winners, at both a per-year and a lifetime-aggregate level.

### Your Alternate Oscar History — Feature Spec

**Per-year status** (free, shown on the existing year card — `ExpandableYearCard`/`AwardCard`, no new card type):
- **Upheld** — the user's ballot winner matches the Academy's official winner for that year.
- **Reawarded** — the user rated the Academy's winner, but their own ballot winner differs. Tracks intensity: Academy's winner landed as the user's runner-up (mild) vs. rated below the user's own 7+ nominee bar (loud) — same disparity-magnitude idea as the existing film-level Hot Take, applied at the ballot level.
- **Unscreened** — the Academy's winner isn't in the user's rated data at all. Never presented as disagreement — a user can't be said to disagree with a film they haven't watched (Law 8).

**Gating** — status only computes for years with a **set ballot** (reuses the existing Gallery-gate definition: 5+ nominees + explicit winner). Thin/unset years show nothing.

**Aggregate view** (premium, lives inside Canon — the existing Mature-tier earned-reward surface): Upheld/Reawarded rate across all set-ballot years, trend by decade, and a ranked "most controversial call" surfaced by Reawarded intensity. Unscreened years are counted and shown separately ("N years not yet comparable"), never silently dropped from the denominator.

Naming note: "Reawarded" is the product's own name used as a verb — the exact act of picking a different winner than history did. "Upheld" mirrors it as an institutional-verdict term rather than "agreed," and "Unscreened" ties to the screening-room visual language and states a fact about sequencing, not a gap (no-shame, per "partial data is valid data"). If gold is reserved as the signature/untouchable accent elsewhere in the UI, keep the Reawarded badge in a secondary color — don't dilute gold on a comparison badge.

**Data prerequisite** — no queryable "official winner by year" data exists today; the only Oscar data in the app is a per-film lookup via a third-party Awards API (`src/app/api/awards/route.ts`), which can't answer "who won in 1994" without already knowing the film. This feature requires a one-time backfill (a stable public Oscar-winner dataset, matched to internal movie IDs, with ambiguous title/year matches surfaced for human confirmation rather than silently guessed) plus a small annual append. Full-category data should be pulled in that same backfill pass even though V1 only compares Best Picture, since a second backfill later would be wasted work.

**Craft/tag-emergent categories are never compared to the Academy** — not deferred pending a vocabulary mapping, decided outright. Tag-driven categories (Great score, Sharp screenplay, career-best performance, etc.) are bottom-up and personal; even the tags with an obvious institutional analog stay uncompared, because mapping them into official Academy category language would mismanage a personal artifact into an institutional one — directly against Law 8's line that personal awards are canon and the system never validates against the Academy. Only genre-based official categories (Animated, Documentary, International — determined by what a film institutionally *is*, not by a user's taste tags) are eligible for Academy-slate premium treatment and Alternate-Oscar-History-style comparison, since those map to real Academy categories by construction, not by inference.

### Reason

Paiges' premium model was the starting reference: free tier is the complete functional loop, premium is an added reflection/output layer (Wrap-Ups, shareable posters), never a gate on the core action. Reawarding's own Product Laws make that non-optional rather than a stylistic choice — Laws 3/4 forbid gating award formation behind activity or payment, and the V1 north star requires a new user to form a Best Picture award in under 30 seconds regardless of tier.

Within that constraint, Alternate Oscar History was chosen as the flagship premium feature over a generic annual-recap because it's structurally native to Reawarding's own premise — rewriting award history with hindsight — rather than a borrowed SaaS pattern. It also reuses an established product mechanic (Hot Take's rating-vs-consensus disparity) instead of inventing new interaction language.

The three-state model (Upheld/Reawarded/Unscreened), rather than a binary, exists specifically to avoid a false verdict on films a user hasn't seen — a direct application of Law 5 (never hide how a conclusion was reached) and Law 8 (identity over completion).

### What Changed

- Direction established: premium features are additive scope + reflection/output only; nothing in the free tier's core loop, Best Picture access, or Ready-Made earn-mechanic changes.
- Your Alternate Oscar History specified above as the first premium feature.
- Craft-category comparison against real Oscar categories ruled out permanently, not deferred — tag-emergent categories stay personal-only and are never compared to the Academy (Law 8). Only genre-based official categories are eligible for Academy-slate premium treatment and comparison.

### What Did NOT Change

- Watch → Rate → ReAward remains fully free and ungated, all tiers.
- Best Picture, unlimited years, remains free — only *other* categories beyond Best Picture and pre-recency-window historical range are premium scope expansions.
- Ready-Made Lists remain earned by investment, not payment.
- Laws 1–8 govern as before; nothing about ballot formation, emergence, or user ownership changes for any tier.

### Reversal Conditions

Re-evaluate the "bigger not faster" framing if user research shows real willingness to pay for convenience unlocks (e.g. skipping the Ready-Made investment threshold) that scope-only premium doesn't capture. Re-evaluate Alternate Oscar History's Best Picture-only scope once genre-based official categories (Animated, Documentary, etc.) exist with their own reference data — that's the intended expansion path. The craft/tag-category exclusion from Academy comparison is a direct application of Law 8, not a scoping gap, and shouldn't be revisited without revisiting Law 8 itself.

---

## July 2026 — Search Becomes the Primary Film-Finder; Rankings Replaces Films in Mobile Nav

### Decision

Finding a film is now a **search-first** action on every surface. Three coordinated changes:

1. **Global search added to the mobile header.** The desktop NavSearch gains a full-width `panel` variant that opens from a magnifier button in the mobile header. Previously mobile had no global search at all — the Films grid was the only finder.
2. **Rankings replaces Films in the mobile tab bar** (Home / Awards / Rankings / Profile). Films remains one tap away in the header hamburger menu, and the header `+` button still covers adding a film. This reverses the 2026-05-09 tab decision.
3. **The Films page is reshaped from an exhaustive catalog into a search-first surface.** Search and filters stay on top; below them, curated shelves (Recently added + featured collections) replace the full grid. The complete library is available behind an explicit "Browse the full library" control, progressively rendered (the same windowing fix that unstuck the rankings page — 1,000+ mounted cards lock up mobile browsers).

### Reason

The catalog outgrew browsing. At 1,000+ films, a poster wall is not an entry point — it froze mobile scroll outright and made "find the film I just watched" a chore. The 05-09 rationale for the Films tab ("the entry point for adding more films — the engine of the loop") eroded as the grid grew: an unusable grid isn't an engine. The `+` button covers adding; search covers finding; both do the Films tab's old job better than the Films tab did.

Meanwhile Rankings is the surface an invested user returns to daily — the tally sheet that is the product's soul — and it had no top-level home on mobile.

### What Changed

- `src/components/layout/NavSearch.tsx` — `variant="panel"` (full-width, always-expanded) + `autoFocus` + `onNavigate`
- `src/components/layout/HeaderNav.tsx` — mobile magnifier button + search panel below the header
- `src/components/layout/MobileTabBar.tsx` — Films → Rankings (LineChart icon)
- `src/app/films/page.tsx` — search-first overview (Recently added shelf, `FeaturedCollectionsSection`, "Browse the full library" toggle), progressive rendering of the grid, and `?query=` now shows all title matches instead of the first

### What Did NOT Change

- Films is still first-class: full catalog, filters, grid/list views all remain — one tap deeper, not removed
- Desktop header nav (Films / Rankings / Awards / Lists) is untouched
- Watch → Rate → ReAward loop and all component-reuse mandates hold (shelves reuse `CollectionRow`/`MovieCard`; no new card types)
- New-user onboarding paths through /films (guest mode) are unchanged

### Reversal Conditions

Re-evaluate if: mobile search usage stays near zero while hamburger→Films traffic dominates; users demonstrably fail to find the add-film path; or the Rankings tab proves to be dead weight for new users despite its empty-state invitation.

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
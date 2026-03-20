# Reawarding Product Decision Log

Purpose: Record WHY major product direction decisions were made to prevent future regression.

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
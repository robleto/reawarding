# Reawarding Product Constraints & Guardrails

Last Updated: Feb 2026  
Purpose: Prevent regression into previous product models or accidental feature drift.

---

## CORE PRODUCT TRUTH

Reawarding is an **opinion-expression tool**, not a cataloging tool.

Primary loop:
Opinion → Award → Nominees → Optional Rankings → Advanced Systems

NOT:
Seen → Ratings → Rankings → Unlock Awards

---

## BRAND IDENTITY — The Product Is Called Reawarding

The product name is **Reawarding**. Always.

- Do not use "Oscarworthy", "Oscar Worthy", or any variation — this was the previous name and has been fully retired.
- All code identifiers, localStorage keys, alt text, email addresses, UI copy, and documentation must use `reawarding`.
- The logomark file is `reawarding-logomark.svg`. No other logomark exists.
- If you encounter `oscarworthy` anywhere in code or copy, treat it as a bug.

---

## CONSTRAINT 1 — Awards Are The Primary Entity

The product must always center around awards.

Allowed:

- Rankings supporting awards
- Rankings generating awards
- Awards existing without rankings

Not Allowed:

- Rankings required before awards
- Awards hidden behind activity gates
- Awards treated as derived-only data

---

## CONSTRAINT 2 — Viewing vs Creating Must Be Separate Mental Modes

Viewing Mode:

- Who won
- Who was nominated
- Navigate to next award

Creation Mode:

- Build nominee pool
- Select or confirm winner
- Override if needed

Never mix these on the same visual layer.

If both must exist:
Viewing must be visually dominant.

---

## CONSTRAINT 3 — Nominee Pool Before Winner (Except Onboarding)

Normal Behavior:
Users should accumulate nominees via:

- Rankings
- Search add
- Imports
- Discovery flows

Winner should be selected FROM nominees.

Exception:
Onboarding may temporarily create:
Winner = Nominee = Single Entry

But system must quickly transition user toward ballot formation.

---

## CONSTRAINT 4 — Inference Must Never Overwrite Intent

Auto ranking rules:

- Only fill missing rankings
- Never overwrite user ratings
- Never silently reorder user data

Inference exists to reduce friction, not to decide for the user.

---

## CONSTRAINT 5 — Completion Must Feel Earned

Ballot formation thresholds:
1 & 2 nominees → Draft / Early Signal  
3 & 4 nominees → Forming Ballot  
5+ nominees → Valid Ballot  
7 to 10 nominees → Complete Ballot  

System must:
Celebrate when user crosses thresholds.

System must NOT:
Treat ballot completion as background math.

---

## CONSTRAINT 6 — Milestones Must Be Visible, Not Subtle

When a user crosses a milestone:

- Show it
- Celebrate it
- Persist the recognition

Avoid:
Small banners  
Transient toasts  
Silent unlocks  

---

## CONSTRAINT 7 — Guest Mode Must Never Feel Disposable

Guest mode is real usage, not demo mode.

Guest must be able to:

- Create awards
- Build ballots
- See shelf evolve

Conversion messaging should feel like:
"Protect what you built"  
Not:  
"Unlock the real product"  

---

## CONSTRAINT 8 — Year = Film Release Year (Invariant)

Never ceremony year.

This applies to:

- DB storage
- Static data
- API responses
- Imports
- UI copy
- Analytics

---

## CONSTRAINT 9 — No Feature May Hide The Core Loop

Features that are allowed:
Stats  
Lists  
Social  
Graph  
Smart collections  
Insights  

Only if:
They do not obscure or replace Award Creation.

---

## CONSTRAINT 10 — Power Must Emerge From Depth, Not Complexity

Advanced value comes from:
Accumulated rankings  
Multiple awards  
Cross-year coverage  
Large data sets  

NOT from:
More steps  
More gates  
More required setup  

---

## CONSTRAINT 11 — The Product Must Reward Both Types Of Users

Memory Anchored Users:
Know specific years deeply (e.g., 1994)

Exploratory Users:
Discover by ranking / browsing / reacting

Both must reach meaningful output quickly.

---

## CONSTRAINT 12 — Editing Must Always Be Safe

Users must always feel:
"I can fix this later."

System must avoid:
One-way flows  
Irreversible auto decisions  
Hidden data mutation  

---

## CONSTRAINT 13 — The Tool Must Feel Like Expression, Not Data Entry

If a flow feels like:
Form filling  
Database maintenance  
Mandatory categorization  

It is wrong.

If it feels like:
Declaring taste  
Arguing with history  
Curating legacy  

It is right.

---

## CONSTRAINT 14 — No Commit Step For Ballots

Ballots form automatically from user actions.

Forbidden:

Create Ballot button

Apply Changes step

Hidden save state for nominees

---

## CONSTRAINT 15 — Crown = Single Source of Winner Truth

Winner must always be derived from:
Gold Crown Selection

Not:
Ranking
Position
Separate winner field

---

## CONSTRAINT 16 — Ranking Drives Candidate Surfaces

Ranking determines:

- Contender eligibility
- Auto nominee promotion (≥7)
- Default ordering (until manual override)

---

## SYSTEM SAFETY CONSTRAINTS (Implementation Layer)

These exist to prevent subtle system drift that would violate Product Laws.

---

## SYSTEM CONSTRAINT A — Single Canonical Award Per Year

For Best Picture v1:

One year = One authoritative award result.

System may internally track:

- Revisions
- Draft states
- Mutation history

But UI must never show multiple canonical winners simultaneously.

---

## SYSTEM CONSTRAINT B — Ballot Formation Must Be Observable

Nominee pool growth must be visible to the user.

Ballots must feel like they are forming — not appearing fully assembled.

---

## SYSTEM CONSTRAINT C — Winner Authority Must Feel Derived

Unless explicitly set by the user:

Winner must appear to emerge from the nominee field.

System may suggest.
System may infer.
System must not declare prematurely.

---

## SYSTEM CONSTRAINT D — Empty State Must Feel Intentional

Never show:
Blank tables  
Null placeholders  
Raw system skeletons  

Always show:
Forming state  
Emergent state  
Guided next action  

## SYSTEM CONSTRAINT E — Canonical Data Source Must Be Singular

Awards page and Home must render award state from the same canonical source.

Derived or inferred data may:

- Pre-fill
- Suggest
- Preview

But must never override or visually conflict with saved award state.

## SYSTEM CONSTRAINT F — Defaults Must Collapse When Real Data Exists

If:
Saved award exists → show it

If not:
Show inferred ballot from rankings

Never:
Show both simultaneously

Never:
Let inferred ballot visually compete with saved ballot

---

## FINAL CHECK RULE

Before shipping any change ask:

Does this make it easier to express an opinion?

If no → Re-evaluate  
If unclear → Test with zero-context user  
If yes → Ship  

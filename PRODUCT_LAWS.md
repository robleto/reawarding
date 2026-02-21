# REAWARDING PRODUCT LAWS

## Purpose

Reawarding exists to turn personal movie taste into living award history.

The system is not a movie database, ranking tracker, or social feed. It is a taste interpretation engine that expresses user opinion through awards.

## Core Product Identity

Reawarding is:

- Named **Reawarding** — never "Oscarworthy" (retired name, treat as a bug if encountered)
- Opinion-first
- Comparison-driven
- Emergent (not manually constructed first)
- Human-authored, system-assisted
- Canonical in output, organic in formation

## LAW 1 — Awards Are The Face, Rankings Are The Engine

Users should primarily experience awards.

Rankings exist to power:

- Nominee formation
- Winner inference
- Smart lists
- Taste modeling

Rankings are never the primary emotional surface.

## LAW 2 — Viewing And Creation Must Never Collide

For any given award:

Viewing Mode shows:

- Winner
- Nominees
- Edit

Creation Mode shows:

- Nominees
- Winner selection
- Save

The same award must never display viewing and creation interfaces simultaneously.

## LAW 3 — Nominees Create Legitimacy

Awards require comparison to feel meaningful.

A single movie is a preference. A field of movies is a ballot.

Reawarding must preserve the psychological difference between:

- Declaring a favorite
- Evaluating a field

## LAW 4 — Ballots Have Maturity States

Ballots evolve through observable stages of authority and completeness:

- `0 nominees`: No ballot exists
- `1-2 nominees`: Ballot forming, winner is provisional
- `3-4 nominees`: Ballot emerging, field feels legitimate
- `5+ nominees`: Ballot established, award feels authoritative

Ballot maturity must influence:

- Language tone
- Visual weight
- Automation confidence
- Suggestion strength

The system must never present thin ballots with the same authority as mature ballots.

## LAW 5 — The System Suggests, The User Owns

The system may infer:

- Leading nominee
- Likely winner
- Emergent nominees

But must never present these as final unless user confirms or overrides.

Language must reflect suggestion, not declaration, until user action occurs.

## LAW 6 — Opinion-First Uses Seed Nominee, Not Forced Winner

Onboarding and fast entry should:

- Add first movie as a seed nominee
- Assign ranking only if needed to demonstrate system behavior
- Infer a provisional winner

The system demonstrates how awards are formed.
It must never bypass the formation process by presenting a fully constructed ballot or final-feeling award state immediately.

Seed nominee flows must always lead naturally toward ballot formation.

## LAW 7 — Milestones Must Live In The Main Canvas

Critical product moments must never be hidden in:

- Modals
- Toasts
- Transient alerts

Milestones must:

- Persist
- Reshape the page
- Become part of the user's normal environment

## LAW 8 — The Ballot Is A Living Projection Of Taste

Awards are not generated once.

Ballots evolve as:

- Ratings change
- Movies are added
- User overrides occur

Awards are living artifacts, not static records.

## LAW 9 — Structure Must Feel Canonical, Growth Must Feel Personal

Ballots should reflect real-world award structure (winner + nominee field).

But formation should feel organic and personalized.

Reawarding balances:

- Institutional legitimacy
- Personal authorship

## LAW 10 — Empty State Must Always Feel Intentional

Incomplete ballots must feel:

- Forming
- Emerging
- Waiting for signal

Never broken. Never missing data. Never "unfinished form".

## LAW 11 — Emergent Intelligence Must Be Visible

When the system detects meaningful structure (e.g., enough ratings to form nominees), it must reveal this clearly and persistently.

Users must never miss when their taste becomes structured output.

## LAW 12 — Ranking Is A Power Tool, Not A Gate

Ranking should unlock deeper automation and intelligence.

Ranking must never feel like:

- Required data entry
- Form completion
- Precondition to value

## LAW 13 — Authority Flows From User Taste, Not Algorithm Order

Ballots should not visually imply ranking order unless explicitly viewed in ranking context.

Nominees represent contenders. Winner represents conclusion.

Ranking is supporting signal, not ballot presentation.

## LAW 14 — Automation Must Feel Like Assistance, Not Replacement

The system may:

- Suggest
- Predict
- Infer

But must never:

- Override explicit user choice
- Remove human authorship
- Hide how conclusions were reached

## LAW 15 — Reawarding Is About Identity, Not Data Completion

Users are not filling in history.

Users are expressing:

- Taste
- Perspective
- Retrospective judgment

Progress is measured in meaning, not completeness.

## LAW 16 — Every Major Unlock Should Feel Like Leveling Up

Critical system milestones should feel like:

- Recognition
- Expansion of capability
- Deepening personalization

Not:

- Feature unlocking
- Checklist completion
- Tool tutorial

## LAW 17 — Ballots Must Form, Never Appear

Ballots must always feel like they are forming from user taste.

The system must never:

- Instantly generate full nominee fields
- Present fully populated ballots without visible formation
- Skip observable ballot growth stages

Automation may accelerate formation, but must never replace it.

Users must feel:

> "I built this ballot."

Not:

> "The system generated this ballot."

## LAW 18 — One Year Must Resolve To One Canonical Award State

For each award type (e.g., Best Picture), a year must resolve to a single canonical award outcome.

The system may internally track:

- Provisional states
- Revisions
- Inference suggestions
- Historical versions

But the user experience must always present:

- One authoritative winner
- One authoritative nominee field

The system must never present multiple competing canonical outcomes for the same year and category.

## LAW 19 — Authority Must Emerge, Not Be Declared

Award authority must scale with ballot maturity and user expression depth.

Thin ballots produce:

- Provisional authority
- Suggestive system language
- Flexible winner state

Mature ballots produce:

- Canonical authority
- Declarative system language
- Stronger visual hierarchy

Authority must be communicated through:

- Language
- Visual weight
- Interaction affordances
- Automation confidence

Authority must always feel earned through expressed taste, never assigned by system completeness alone.

## LAW 20 — Surfaces Must Have A Single Intent

Each primary surface must have one dominant mental model.

- Home → Workbench (Create, Continue, Express)
- Awards Page → Museum (Browse, Reflect, Explore History)

Surfaces must not mix:

- Archive navigation
- Creation workspace
- Data management tooling

If a surface tries to do more than one, split it.

## LAW 21 — Creation Must Be Initiable From The Primary Surface

Users must always be able to begin expressing taste from Home.

This may be via:

- Start Another Ballot
- Fix Another Year
- Pick A Movie → Award Creation

But creation must never require navigating to archive views first.

## LAW 22 — Workshop Mode Shows Formation, Not Ceremony

Workshop mode prioritizes:

- Structure building
- Completion signaling
- Direct manipulation

Ceremony visuals (hero winner card, presentation framing) are reserved for Award View mode.

## LAW 23 — Personal Awards Are Canon

ReAwarding never validates a user's ballot against the Academy's winner/nominees. Official winners may be shown as trivia, but never used to filter, rank, or discard user ballots.

## LAW 24 — Category-Scoped Awards

Any award lookup is keyed by (year + normalizedCategory). A year can contain multiple categories without collision.

## LAW 25 — Ballot Status Comes From Nominee Count

Emerging/Standard/Complete are computed solely from nominee count and are valid states.

## Implementation Guardrail

When making product decisions, default priority order:

1. Protect meaning of awards
2. Preserve emergent behavior
3. Maintain low-friction expression
4. Optimize data structure
5. Optimize performance

Never reverse this order without explicit reason.

## Non-Goals

Reawarding is not:

- A movie tracking database
- A pure ranking app
- A social popularity contest
- An Oscar prediction engine
- A completionist checklist system

## Product Success Signal

Reawarding succeeds when users feel:

> "My taste created this."

Not:

> "I filled this out."

## Revision Notes

### Feb 2026 — Post Awards-First Architecture Alignment

Updates:

- Strengthened Law 4 to include authority scaling
- Strengthened Law 6 to clarify seed nominee → formation progression
- Added Law 17: Ballots Must Form, Never Appear
- Added Law 18: Canonical Award Uniqueness Per Year
- Added Law 19: Authority Must Emerge, Not Be Declared

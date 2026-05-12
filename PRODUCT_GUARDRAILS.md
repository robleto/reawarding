# Reawarding — Product Guardrails

Last Updated: March 2026
Purpose: Prevent regression into previous product models or accidental feature drift.

For product philosophy, see Product Context. For governing principles, see Product Laws.

---

## BRAND IDENTITY

The product name is **Reawarding**. Always.

Do not use "Oscarworthy", "Oscar Worthy", or any variation — this was the previous name and has been fully retired. All code identifiers, localStorage keys, alt text, email addresses, UI copy, and documentation must use `reawarding`. The logomark file is `reawarding-logomark.svg`. No other logomark exists. If you encounter `oscarworthy` anywhere in code or copy, treat it as a bug.

---

## IMPLEMENTATION GUARDRAILS

### 1 — Year = Film Release Year (Invariant)

Never ceremony year. This applies to DB storage, static data, API responses, imports, UI copy, and analytics.

### 2 — Crown = Single Source of Winner Truth

Winner must always be derived from gold crown selection. Not from ranking position, not from a separate winner field.

### 3 — No Commit Step For Ballots

Ballots form automatically from user actions. Forbidden: "Create Ballot" buttons, "Apply Changes" steps, hidden save states for nominees.

### 4 — Editing Must Always Be Safe

Users must always feel "I can fix this later." The system must avoid one-way flows, irreversible auto-decisions, and hidden data mutation.

### 5 — Guest Mode Must Never Feel Disposable

Guest mode is real usage, not demo mode. Guests must be able to create awards, build ballots, and see their shelf evolve. Conversion messaging should feel like "Protect what you built" — not "Unlock the real product."

### 6 — Canonical Data Source Must Be Singular

Awards page and Home must render award state from the same canonical source. Derived or inferred data may pre-fill, suggest, or preview — but must never override or visually conflict with saved award state.

### 7 — Defaults Must Collapse When Real Data Exists

If a saved award exists, show it. If not, show the inferred ballot from rankings. Never show both simultaneously. Never let an inferred ballot visually compete with a saved ballot.

### 8 — Viewing vs Creating Must Be Separate Mental Modes

Viewing mode shows who won, who was nominated, and navigation to next award. Creation mode shows ballot building, winner selection, and override options. Never mix these on the same visual layer. If both must exist on a surface, viewing must be visually dominant.

### 9 — Ranking Drives Candidate Surfaces

Ranking determines contender eligibility, auto-nominee promotion (rated 7+), and default ordering until manual override.

### 10 — Watch and Rate Are Distinct Actions

Watch (seen_it = true) and Rate (1-10 score) are two separate user actions in the primary loop. Never collapse them into a single gesture, auto-prompt a rating on mark-seen, or require one to trigger the other. A user may watch without rating. A user may rate later. The loop is Watch → Rate → ReAward — three steps, not two.

### 11 — Poster Images Must Never Be Cropped

Film poster images are canonical art — they are always displayed at their full `aspect-[2/3]` ratio with `object-cover` only filling their container. Never use a fixed height that clips the poster on any viewport. On mobile, solve layout constraints by making the poster container narrower (e.g., side-by-side with actions), not by overriding the aspect ratio.

### 12 — Onboarding Must Not Auto-Seed a Maximal Rating

When a new user's first pick lands in a YearExplorer, the system may seed a rating to make the loop visible immediately — but the seed value must be **7** (the auto-nominate threshold), never 10 or any other maximal score.

Why: a seeded 10 declares "perfect film, this won the year" before the user has done anything. It makes the first user action a contradiction — undoing a verdict they didn't render. A seeded 7 declares "this counts" and makes the first action a calibration — dialing in their actual feeling. This preserves the formation feel that Law 4 (visible formation) and Law 3 (no instant awards) require, even while the system is doing the work of populating the ballot frame.

Equivalent rule for award framing: the formal "Best Picture Ballot" page title and "Will your ballot agree?" comparison prompt are deferred until the user has rated **3+ films for the year**. Below that threshold, the surface uses neutral framing ("Your 2021"). The ballot earns its title; it isn't asserted on action one.

### 13 — Onboarding Jargon Is Forbidden

Phrases like "Standard Ballot," "Full Ballot," "Auto-nominated," etc. assume the user already knows our taxonomy. In a new-user context, write the plain action: *"Rate 3 more 7+ to fill the 5 nominee slots."* Internal vocabulary is allowed once the user is in the Established state — never before.

---

## FINAL CHECK

Before shipping any change, ask:

Does this make it easier to express an opinion?

If no → re-evaluate.
If unclear → test with a zero-context user.
If yes → ship.
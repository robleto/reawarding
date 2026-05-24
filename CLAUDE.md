# CLAUDE.md — Reawarding

This file is read at the start of every AI-assisted session. It points to canonical product guardrails that must be consulted before making product or UI decisions.

---

## Product name

**Reawarding** — always. Never "Oscarworthy" (retired name, treat as a bug if found).

---

## Primary product loop

```
Watch → Rate → ReAward
```

- **Watch** = `seen_it = true` in rankings table. Logged via `SeenItButton`.
- **Rate** = `ranking = 1–10` in rankings table. Set via `RatingModal`.
- **ReAward** = films rated 7+ auto-emerge as nominees. Ballot forms. Winner rises.
- **Watchlist** = separate concept. Films the user *wants* to watch but hasn't yet.

Awards are the emotional output of this loop — not a gate, not a prerequisite.

---

## Canonical product documents

Read before making any product, UX, or architecture decision:

| Document | Purpose |
|---|---|
| `PRODUCT_LAWS.md` | 8 core laws + design principles governing product behavior — do not violate |
| `PRODUCT_GUARDRAILS.md` | Implementation constraints + system safety rules |
| `PRODUCT_DECISION_LOG.md` | Why major direction decisions were made |
| `PRODUCT_CONTEXT.md` | Philosophy, origin, core truths |

If this file conflicts with any of the above, the product doc wins. CLAUDE.md is a summary pointer, not a competing source of truth.

---

## Component reuse mandate

Do NOT introduce new card types. All UI uses these canonical components:

| Type | Component | Path |
|---|---|---|
| Movie card (poster) | `MoviePosterCard` | `src/components/movie/MoviePosterCard.tsx` |
| Movie card (row) | `MovieRowCard` | `src/components/movie/MovieRowCard.tsx` |
| Year/ballot card | `ExpandableYearCard` | `src/components/home/ExpandableYearCard.tsx` |
| Award card | `AwardCard` | `src/components/home/AwardCard.tsx` |
| Horizontal row | `HorizontalListRow` | `src/components/list/HorizontalListRow.tsx` |
| Discovery feed | `RecognitionFeed` | `src/components/home/RecognitionFeed.tsx` |
| Watch action | `SeenItButton` | `src/components/movie/SeenItButton.tsx` |
| Rate action | `RatingModal` | `src/components/movie/RatingModal.tsx` |

See `docs/COMPONENT-REGISTRY.md` for full registry and Storybook story index.

---

## Feature status

Before building something new, check `docs/FEATURE-STATUS.md` — most features already exist and need restoration, not rebuilding.

---

## Homepage states

The homepage is adaptive across four user states. The workbench scales DOWN as the user matures — established users still see a workbench-led layout; mature users see a museum-led layout with a collapsed workbench strip.

| State | Threshold (summary) | Primary content |
|---|---|---|
| New | 0 years touched AND < 5 rated | Search + recognition feed |
| Building | 1+ year touched, 0 set ballots | Active year card + year-scoped feed |
| Established | 1+ set ballot OR 2+ depth years OR 20+ rated | Workbench-led: search + year timeline + active ballot + (gallery, gated) + lists |
| Mature | Established + (3+ set ballots OR 5+ depth years OR 50+ rated) | Museum-led: compact strip + Awards Gallery + lists + recognition feed |

Definitions, gating rules, the transition moment, and the editorial leads per state are canonical in `PRODUCT_DESIGN_PRINCIPLES.md` — read it before changing state logic. Detection code lives in `src/app/page.tsx`.

A few things that bite often enough to call out here:
- **Depth year** = year with 3+ ratings. Years with 1–2 ratings are "touched," not "invested in," and do not advance state.
- **Set ballot** = year with ≥5 nominees + explicit winner. ("Completed" was the previous term — set, not complete, because the ballot can still grow to 10.)
- Mature is strictly additive to Established. A user can't leapfrog Building → Mature.
- The Awards Gallery is gated on ≥3 nominees in some year. Below that bar it's *absent*, not locked.

Keep these thresholds in sync if changed.

---

## Key anti-patterns to avoid

- Do NOT introduce a new bespoke card design. Use existing components.
- Do NOT gate awards behind ratings. Awards FORM from ratings (emergence ≠ gating).
- Do NOT collapse Watch and Rate into a single gesture. They are distinct actions (Guardrail 10).
- Do NOT show milestones in toasts or transient alerts — they must persist on the canvas.
- Do NOT mix Viewing and Creation modes on the same surface.
- Do NOT present a fully-formed ballot with no visible formation.
- Do NOT fill gaps with guesses. Ask the user if something is unclear.

---

## Branch strategy

- P0–P2 done: `feature/adaptive-homepage-phase1-3` (product docs, Storybook, feature restore)
- P3 Onboarding: `feature/onboarding`
- P4 Adaptive homepage: `feature/adaptive-homepage` (LAST — after P3)
- P5 Import, P6 Friends, P7 Export: one branch each

---

## Dev environment

**TypeScript check** — `node`/`npx` not in default PATH. Use:
`/opt/homebrew/bin/node /opt/homebrew/lib/node_modules/typescript/bin/tsc --noEmit`

**Git index.lock** — Cursor's Git extension repeatedly re-creates `.git/index.lock`.
Fix: retry loop: `for i in 1 2 3 4 5; do rm -f .git/index.lock && git commit ... && break || sleep 1; done`

**Storybook** — framework is `@storybook/react-webpack5` (NOT `@storybook/nextjs`), pinned to v8.
Webpack alias for `@/` paths required in `.storybook/main.ts`. Run: `npm run storybook`

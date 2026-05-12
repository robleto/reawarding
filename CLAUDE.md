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

| State | Threshold | Primary content |
|---|---|---|
| New | 0 active years, < 5 rated | Search + recognition feed |
| Building | 1+ active year, 0 completed ballots | Active year card + year-scoped feed |
| Established | 1+ completed ballot OR 2+ years OR 20+ rated | Workbench-led: search + year timeline + active ballot + gallery + lists |
| Mature | Established floor + (3+ completed ballots OR 5+ years OR 50+ rated) | Museum-led: compact strip (prominent "Welcome back, {name}." headline + "Update awards" gold text link toggling an inline workshop drawer + full-width hero search below) → Awards Gallery → Your Lists → Recognition Feed → Ready-Made → Watchlist → Canon |

**Detection (coded in `src/app/page.tsx`):**
- `isEstablished = completedBallots >= 1 || yearLeaders.length >= 2 || ratedMovies.length >= 20`
- `isMature = isEstablished && (completedBallots >= 3 || yearLeaders.length >= 5 || ratedMovies.length >= 50)` — mature is strictly additive to established, never a leapfrog
- Mature wins over Established in the render cascade when both are true.

**Mature workshop drawer:** The "Update awards" link toggles `workshopOpen` state and reveals the same year timeline rail + active `ExpandableYearCard` that the established state shows. It is NOT a modal. The drawer scrolls into view when opened and the link flips to "Done".

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

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
| `PRODUCT_LAWS.md` | 25 laws governing product behavior — do not violate |
| `PRODUCT_GUARDRAILS.md` | Specific constraints + system safety rules |
| `PRODUCT_DECISION_LOG.md` | Why major direction decisions were made |
| `PROJECT_CONTEXT.md` | Philosophy, origin, core truths |

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

The homepage is adaptive across three user states:

| State | Threshold | Primary content |
|---|---|---|
| New | 0 active years, < 5 rated | Search + recognition feed |
| Building | 1+ active year, 0 completed ballots | Active year card + year-scoped feed |
| Established | 1+ completed ballot OR 2+ years OR 20+ rated | Ballot grid + lists + taste |

---

## Key anti-patterns to avoid

- Do NOT introduce a new bespoke card design. Use existing components.
- Do NOT gate awards behind ratings. Awards FORM from ratings (emergence ≠ gating).
- Do NOT show milestones in toasts or transient alerts — they must persist on the canvas.
- Do NOT mix Viewing and Creation modes on the same surface.
- Do NOT present a fully-formed ballot with no visible formation.
- Do NOT fill gaps with guesses. Ask the user if something is unclear.

---

## Branch strategy

- Docs + immediate fixes: `feature/adaptive-homepage-phase1-3`
- Foundation + restoration (Storybook + feature restore): same branch
- Onboarding, Import, Social, Export: one branch each

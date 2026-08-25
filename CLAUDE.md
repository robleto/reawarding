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
| Movie card (all variants: grid/large/compact/featured) | `MovieCard` | `src/components/award/MovieCard.tsx` |
| Award card (gilt ceremonial winner card) | `AwardCard` | `src/components/home/AwardCard.tsx` |
| Horizontal row | `HorizontalListRow` | `src/components/list/HorizontalListRow.tsx` |
| Watch action | `SeenItButton` | `src/components/movie/SeenItButton.tsx` |
| Rate action | `RatingModal` | `src/components/movie/RatingModal.tsx` |

`MovieCard` lives in the `award` folder for historical reasons but is not
award-specific — it's the actual shared card used everywhere (Films,
Rankings, Watchlist, Collections, Awards). `MoviePosterCard` does not exist
in the codebase; if you see it referenced anywhere else, that's stale.
`ExpandableYearCard`, `RecognitionFeed`, `AwardsTabs`, `AwardsEmptyState`,
and `ShareButton` are built but currently unwired (zero call sites) — verify
before assuming any of them render anywhere.

See `docs/COMPONENT-REGISTRY.md` for full registry and Storybook story index.

---

## Feature status

Before building something new, check `docs/FEATURE-STATUS.md` — most features already exist and need restoration, not rebuilding.

---

## Homepage states

The homepage is no longer a different *layout* per tier. Once a user has started any ballot, Home renders the awards showcase directly (search + year timeline + the editable year archive) — there's no separate workbench-vs-museum layout switch. The four states now govern (a) which reward sections are earned below the showcase (Awards Gallery, Recognition Feed, Canon) and (b) which single contextual nudge, if any, is eligible to show above it — see "Nudges earn their place" in `PRODUCT_DESIGN_PRINCIPLES.md`.

| State | Threshold (summary) | Primary content |
|---|---|---|
| New | 0 years touched AND < 5 rated | Search + recognition feed (no ballot yet, nothing to showcase) |
| Building | 1+ year touched, 0 set ballots | Active year card + year-scoped feed |
| Established | 1+ set ballot OR 2+ depth years OR 20+ rated | Showcase (search + timeline + archive) + at most one eligible nudge; Ready-Made lists become eligible |
| Mature | Established + (3+ set ballots OR 5+ depth years OR 50+ rated) | Showcase, same layout as Established, plus Awards Gallery / Recognition Feed / Canon unlock |

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

**Reality as of 2026-08-23** — the phased plan below this line used to name
`feature/adaptive-homepage-phase1-3`, `feature/onboarding`,
`feature/adaptive-homepage`, and one branch each for import/friends/export.
None of those branches were ever created. What actually happened: nearly all
of it — product docs, Storybook, feature restore, the adaptive homepage
described above in "Homepage states," onboarding fixes, import fixes
(commits tagged `IMP-1`/`IMP-2`), plus a long tail of `AUTH`/`PAY`/`LOOP`/
`PERF`/`CC` fixes — landed through one long-lived branch,
`feature/lists-fullscreen-pager`, merged into `main` via PR #17
(2026-08-22). Don't plan against the phase names below; they don't map to
any branch that exists.

Current branches and their actual state:
- `feature/lists-fullscreen-pager` — merged into `main` (PR #17). Still
  exists locally/on origin post-merge but has nothing further to contribute.
- `explore/awards-alt-layout`, `explore/awards-as-home`, `feature/iphone-feel`,
  `feature/light-mode` — 0 commits ahead of `main`. No unique work; safe to
  ignore or delete.
- `codex/pre-strip-backup-2026-02-11`, `codex/snapshot-before-rewind-20260212`
  — safety snapshots, not active feature work (names describe what they
  preserve — state from before a strip/rewind). Do not merge; doing so would
  fight changes `main` made on purpose since.
- `feat/social-leaderboard-friends` — the closest thing to a "Friends"
  branch, but 182 commits behind `main` as of 2026-08-23. Merging surfaces a
  24-file conflict set including generated `src/types/supabase.ts` (needs
  regeneration from current schema, not a hand merge) and a modify/delete
  conflict on `guestDataMigration.ts`, which `main` has since removed
  entirely. Needs a dedicated integration pass — punted for now.
- `feature/design-team-review` — 109 commits behind `main`. Conflicts
  include this file's own component table: this branch treats
  `ExpandableYearCard` as the canonical live year/ballot card, while current
  `main` documents it as orphaned (see "Component reuse mandate" above).
  Resolving this means picking a direction, not merging text — punted for
  now.
- `feature/reenable-best-animated-tab`, `fix/stripe-client-lazy-init` —
  appeared on origin 2026-08-23, after the audit above; not yet assessed
  against `main`.

---

## Dev environment

**Secrets / security policy — do NOT read `.env` from shell commands.**
Any Bash command whose text touches `.env`/`.env.local` (`cat`, `grep`, `cut`,
`source`, etc.) trips a blocking company-security hook ("may violate TMF company
security policy"). Never extract `DATABASE_URL`, API keys, or any secret into a
shell variable or terminal output. Instead:

- **Database queries**: `/opt/homebrew/bin/node scripts/dev-db.mjs "SELECT ...;"`
  — loads credentials inside the process, never prints them, read-only guard,
  auto-falls back to the IPv4 pooler when the direct (IPv6-only) host times out.
- **Anything else needing env vars** (API keys, service role, etc.): write a
  Node script that reads `.env`/`.env.local` itself via `fs`/`dotenv` and uses
  the values internally without logging them. Scripts must live in the repo so
  `node_modules` resolves.
- Migrations/DDL: extend the same pattern (a script that connects itself);
  don't paste connection strings into psql commands.
- **`rm` also trips the hook.** Don't delete files via shell. Put throwaway
  scripts/screenshots in the session scratchpad dir (auto-cleaned) — from there,
  import repo packages by absolute path (e.g.
  `import puppeteer from "<repo>/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js"`).
  If a scratch file must live in the repo, name it `.tmp-*` (gitignored) and
  leave it for the user to delete.
- **Never run `rm`, `rm -f`, or `git rm` with a wildcard (`*`), and never run
  bare `rm -rf` on a directory** — against corporate policy, no exceptions,
  even for the assistant's own temp files/dirs. Don't use `pkill`/broad
  process kills as a cleanup shortcut either. Use a fresh, uniquely-named
  path instead of deleting an old one, and leave throwaway files for the
  user to remove.

**TypeScript check** — `node`/`npx` not in default PATH. The globally installed
TypeScript is v6+ and rejects this project's `baseUrl` config (TS5101); use the
project-local compiler:
`/opt/homebrew/bin/node node_modules/typescript/bin/tsc --noEmit`

**Git index.lock** — Cursor's Git extension repeatedly re-creates `.git/index.lock`.
Fix: retry loop: `for i in 1 2 3 4 5; do rm -f .git/index.lock && git commit ... && break || sleep 1; done`

**Storybook** — framework is `@storybook/react-webpack5` (NOT `@storybook/nextjs`), pinned to v8.
Webpack alias for `@/` paths required in `.storybook/main.ts`. Run: `npm run storybook`

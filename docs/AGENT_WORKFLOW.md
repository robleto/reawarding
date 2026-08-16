# Agent-led development workflow (launch runway)

This document defines how AI-agent development is organized for Reawarding as we
move toward launch. It is the operating contract; the human (Greg) sets direction
and approves scope, agents execute within it.

## Roles

| Role | Model | Responsibility |
|---|---|---|
| **Architect / lead** | Claude Fable | Minds the overall architecture, decomposes work into self-contained task briefs, launches and sequences agent work, synthesizes results, maintains the backlog. Does not do bulk implementation itself. |
| **Implementers / auditors** | Claude Sonnet | Execute one scoped task each. Every task brief must be self-contained: file paths, constraints, acceptance criteria. An implementer never expands its own scope. |
| **Verifier** | Claude Opus | Skeptical review of Sonnet output. For audits: confirm/reject each finding against the actual code. For implementation: verify acceptance criteria are met, tests pass, and no regressions or scope creep slipped in. Nothing merges into the backlog or the codebase as "done" without an Opus verdict. |

## Standing constraints for every agent task brief

These are non-negotiable and must be repeated in every agent prompt (corporate
security tooling on this machine enforces them):

- **Never read `.env`** in any form (cat/grep/source) — a blocking hook kills the call. Use `scripts/dev-db.mjs` for SQL; repo-local Node scripts self-load env.
- **Never run `rm`** or any destructive/wildcard delete. No exceptions, including agents' own temp files.
- Audit-type tasks are strictly read-only.
- Respect the design language (see memory / `PRODUCT_DESIGN_PRINCIPLES.md`): warm screening-room dark tokens, Spline Sans Mono for ballot data, the gilt frame is the signature, gold is untouchable.
- Use project-local `tsc` (global v6 breaks the build).

## The loop

1. **Fable** defines the phase (audit → fix → verify → automate) and writes task briefs.
2. **Sonnet** agents run in parallel via the Workflow tool (`.claude/workflows/*.js`), one brief each, returning structured output (findings or diffs), not prose.
3. **Opus** verifies each Sonnet result as it lands (pipelined, no barrier): CONFIRMED / REJECTED / UNCERTAIN per item, plus anything the Sonnet agent missed.
4. **Fable** synthesizes confirmed items into `docs/audits/` reports and the launch backlog, then cuts the next round of briefs.
5. **Greg** approves scope between phases; implementation phases run in git worktrees so parallel edits never collide.

## Saved workflows

- `.claude/workflows/launch-audit.js` — the launch-readiness audit: 7 Sonnet
  auditors (code correctness, performance, mobile UI, auth flows, imports,
  core loop, premium/payment), each verified by an Opus agent. Re-run any time
  with `Workflow({name: "launch-audit"})` or by asking Claude to
  "run the launch audit workflow".

Future workflows follow the same shape: add a `.js` file here with Sonnet
executors + Opus verifiers, and register it in this table.

## Audit dimensions (v1, defined 2026-08-15)

1. **Code correctness** — API routes, lib, hooks: unhandled errors, races, auth checks.
2. **Performance** — N+1 queries, pagination, bundle weight, waterfalls, image handling.
3. **Mobile UI** — desktop-only patterns: fixed widths, hover-only, tap targets, safe areas (Capacitor iOS is first-class).
4. **Auth flows** — signup, login, forgot/reset password, returning-user session + returnTo, OAuth incl. Capacitor in-app browser.
5. **Imports** — ease of bringing history from Letterboxd/IMDb/CSV; discoverability in onboarding; partial-failure handling.
6. **Core loop** — building lists, ranking, manual award updates: undo, empty states, save-state clarity, touch fallbacks for drag-and-drop.
7. **Premium/payment** — end-to-end wiring, webhook integrity, server-side entitlement enforcement, Apple IAP vs Stripe policy on iOS.

Audit reports land in `docs/audits/YYYY-MM-DD-<name>.md` with a prioritized,
effort-tagged backlog. Each backlog item is written as a ready-to-dispatch
Sonnet task brief.

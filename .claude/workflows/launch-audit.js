export const meta = {
  name: 'launch-audit',
  description: 'Launch-readiness audit: Sonnet auditors per dimension, Opus verification of every finding',
  phases: [
    { title: 'Audit', detail: 'Sonnet auditor per dimension', model: 'sonnet' },
    { title: 'Verify', detail: 'Opus verifier per dimension', model: 'opus' },
  ],
}

const REPO = '/Users/greg.robleto/Dropbox/Greg/01. Sites/01. ✅ Projects/Reawarding/reawarding'

const RULES = `
HARD RULES (corporate security tooling on this machine):
- NEVER read, cat, grep, or source any .env file — a blocking security hook will kill the call.
- NEVER run rm or any destructive/wildcard delete command. This audit is READ-ONLY: do not modify, create, or delete any files in the repo.
- Use Read/Grep/Glob for everything. You may run read-only commands like ls/find.
Repo root: ${REPO} (Next.js App Router in src/app, components in src/components, lib in src/lib, Supabase backend, Capacitor iOS wrapper, Tailwind).`

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings', 'summary'],
  properties: {
    summary: { type: 'string', description: 'Two-sentence overall assessment of this dimension' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'severity', 'files', 'description', 'suggested_task', 'effort'],
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          files: { type: 'array', items: { type: 'string' }, description: 'repo-relative paths, with line numbers where possible' },
          description: { type: 'string', description: 'What is wrong, with concrete evidence from the code' },
          suggested_task: { type: 'string', description: 'A self-contained task brief a Sonnet implementation agent could execute' },
          effort: { type: 'string', enum: ['small', 'medium', 'large'] },
        },
      },
    },
  },
}

const VERIFY_SCHEMA = {
  type: 'object',
  required: ['verdicts', 'missed', 'dimension_assessment'],
  properties: {
    dimension_assessment: { type: 'string' },
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'verdict', 'note'],
        properties: {
          title: { type: 'string', description: 'exact title of the finding being judged' },
          verdict: { type: 'string', enum: ['CONFIRMED', 'REJECTED', 'UNCERTAIN'] },
          note: { type: 'string', description: 'evidence for the verdict; if REJECTED, why the finding is wrong' },
        },
      },
    },
    missed: { type: 'array', items: { type: 'string' }, description: 'Real issues in this dimension the auditor failed to report (with file paths)' },
  },
}

const DIMENSIONS = [
  {
    key: 'code-correctness',
    prompt: `Audit the Reawarding codebase for CORRECTNESS BUGS and error-handling gaps. Focus on src/app/api (route handlers), src/lib, src/hooks, src/contexts. Hunt for: unhandled promise rejections, missing error states surfaced to users, race conditions in optimistic updates, incorrect auth checks in API routes, Supabase queries that silently swallow errors, stale-closure bugs in hooks, and inconsistent null handling. Report only issues you can evidence with specific code, not style opinions.`,
  },
  {
    key: 'performance',
    prompt: `Audit the Reawarding codebase for PERFORMANCE and EFFICIENCY problems. Look for: N+1 Supabase query patterns (queries inside loops or per-item fetches), missing pagination on large lists, oversized client components that should be server components, unnecessary re-renders (context misuse, missing memoization on hot paths), unoptimized images (raw <img> vs next/image, missing sizes), heavy dependencies in the client bundle, and waterfall data fetching on key pages (home, films, awards, rankings, profile). Evidence every finding with file paths.`,
  },
  {
    key: 'mobile-ui',
    prompt: `Audit the Reawarding UI for DESKTOP-ONLY / MOBILE-HOSTILE patterns. This app ships to iOS via Capacitor, so mobile is first-class. Sweep src/app and src/components for: fixed pixel widths and min-widths that overflow a 375px viewport, layouts with no sm:/md: responsive variants (grids that only make sense wide), hover-only interactions with no touch equivalent, tooltips/popovers unusable on touch, tap targets under 44px, tables that don't collapse on small screens, modals/drawers taller than the viewport, missing safe-area insets for the iOS notch/home bar, and horizontal-scroll traps. Prioritize the core screens: home, films, awards, rankings, lists, nominees, profile, onboarding, premium. For each finding name the component file and what breaks at mobile widths.`,
  },
  {
    key: 'auth-flows',
    prompt: `Audit the AUTH EXPERIENCE end-to-end in the Reawarding codebase: sign-up ease, login, forgot/reset password, OAuth providers, and the returning-user experience (session persistence, resuming where you left off). Examine src/app/login, src/app/onboarding, src/app/auth, src/app/reset-password, src/app/auth-code-error, middleware.ts, and src/components/auth. Hunt for: friction (too many steps, unclear errors, dead ends like auth-code-error with no recovery path), broken or confusing reset-password flows, session expiry that dumps users to login without preserving their intent (returnTo/redirect handling), OAuth edge cases, email-confirmation dead ends, and Capacitor/iOS-specific auth issues (in-app browser OAuth). Assess both bugs and UX friction; for friction, describe the user-visible pain.`,
  },
  {
    key: 'import-flows',
    prompt: `Audit the DATA IMPORT experience in the Reawarding codebase — how easily a new user brings their movie history in from other services (Letterboxd, IMDb, CSV, etc.). Examine the imports/ directory at the repo root, any import-related routes under src/app (search src for 'import' UI), src/app/api import endpoints, and onboarding for import prompts. Assess: which sources are supported, whether import is discoverable during onboarding, error handling for malformed files, matching quality (title/year mismatches), progress feedback during long imports, and whether a failed import leaves partial state. If import is script-only (not user-facing), report that as a high-severity launch gap.`,
  },
  {
    key: 'core-loop',
    prompt: `Audit the CORE PRODUCT LOOP ease-of-use in the Reawarding codebase: building lists, ranking films, and manually updating awards/ballots. Examine src/app/lists, src/app/rankings, src/app/awards, src/app/nominees, src/app/year, and src/components/{list,lists,rankings,award,nominees,movie}. Hunt for: multi-step flows that could be one step, missing empty states or unclear calls-to-action, no undo after destructive actions (deleting a list, clearing a ranking), save-state ambiguity (does the user know their edit persisted?), drag-and-drop that has no mobile/touch fallback, awards editing that requires understanding internal data structures, and any flow where an error leaves the user stuck. Report both bugs and concrete UX friction with file evidence.`,
  },
  {
    key: 'premium-payment',
    prompt: `Audit the PREMIUM / PAYMENT flow in the Reawarding codebase. Examine src/app/premium, any Stripe/payment/subscription/entitlement code (grep src for stripe, subscription, premium, entitlement, checkout, billing), related API routes, and webhook handlers. Assess: is the upgrade path actually wired end-to-end or partially stubbed, webhook signature verification and idempotency, what happens on payment failure or cancellation mid-checkout, whether entitlements are enforced server-side (not just hidden in the UI), restore-purchases / cross-device entitlement sync, Capacitor iOS constraints (Apple in-app-purchase policy vs Stripe web checkout), and refund/cancel handling. If the flow is incomplete, enumerate exactly what is missing for launch.`,
  },
]

phase('Audit')
const results = await pipeline(
  DIMENSIONS,
  (d) =>
    agent(`${d.prompt}\n${RULES}\nReturn your findings via the structured output tool. suggested_task must be self-contained (include file paths and acceptance criteria) so an implementation agent can pick it up without extra context.`, {
      label: `audit:${d.key}`,
      phase: 'Audit',
      model: 'sonnet',
      schema: FINDINGS_SCHEMA,
    }),
  (audit, d) => {
    if (!audit || !audit.findings) return null
    return agent(
      `You are a skeptical senior reviewer verifying an audit of the '${d.key}' dimension of the Reawarding app. Another agent reported these findings:\n\n${JSON.stringify(audit.findings, null, 2)}\n\nFor EACH finding, open the cited files yourself and judge it: CONFIRMED (evidence checks out), REJECTED (misread the code, already handled, or not a real problem — explain why), or UNCERTAIN (cannot verify statically). Default skeptical: do not confirm on plausibility alone. Then do a short independent pass of the same area and list real issues the auditor MISSED (with file paths). Judge titles exactly as given.\n${RULES}`,
      { label: `verify:${d.key}`, phase: 'Verify', model: 'opus', schema: VERIFY_SCHEMA }
    ).then((v) => ({ dimension: d.key, summary: audit.summary, findings: audit.findings, verification: v }))
  }
)

const clean = results.filter(Boolean)
log(`Audit complete: ${clean.length}/${DIMENSIONS.length} dimensions finished`)
return { dimensions: clean }

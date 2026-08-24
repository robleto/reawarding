/**
 * Copy for the logged-out home surfaces.
 *
 * Spec: docs/design/logged-out-native-home.md
 *
 * Everything a visitor reads before they have an account lives here so the
 * positioning can be changed without touching layout. That matters right now
 * because `docs/validation/landing-page-test.md` has an unresolved A/B test
 * between two framings, and the January (Wave 2) result is supposed to be a
 * one-line change, not a redesign.
 */

/**
 * The single string carrying the product's positioning on the native screen.
 *
 * - `ritual` — the current voice. Zero search demand (Step 3a), but native
 *   visitors already downloaded the app, so they aren't searching for it.
 * - `wedge`  — the Oscar-completion framing that *does* have documented
 *   search demand. Flip `ACTIVE_PROMISE` to this if Wave 2 says so.
 *
 * Do not inline either string at a call site — the point of this constant is
 * that there is exactly one place to change.
 */
export const PROMISE_LINE = {
  ritual: "The Academy had its say. Now so do you.",
  wedge: "Every nominee. Every category. Counted.",
} as const;

export type PromiseFraming = keyof typeof PROMISE_LINE;

/** Ships as `ritual` per the spec's open question 1. Flip after Wave 2. */
export const ACTIVE_PROMISE: PromiseFraming = "ritual";

/** Native, first open — no ratings yet. Job of the screen: activate, not sell. */
export const NATIVE_FIRST_OPEN = {
  promise: PROMISE_LINE[ACTIVE_PROMISE],
  /**
   * An imperative, not a claim. This is the inversion the spec is built on:
   * on web the pitch is the H1, on native the instruction is.
   */
  instruction: "Start with a film you've seen.",
  /**
   * The one thing the web hero never says plainly — what rating actually does.
   * The 7+ threshold is the product's real rule (CLAUDE.md, primary loop);
   * stating it makes the first action feel consequential rather than arbitrary.
   */
  mechanic:
    "Rate it 1–10. Anything you score 7 or higher becomes a nominee — and that year's ballot starts forming.",
  searchPlaceholder: "Search a film you've watched",
  assurance: "No account needed.",
  proofCaption: "One year, once it's formed:",
  escape: "How Reawarding works",
} as const;

/** Native, returning guest — has ratings, no account. Never re-pitch. */
export const NATIVE_RETURNING = {
  /** `{n} films rated.` — their state is the headline. */
  state: (ratedCount: number) =>
    `${ratedCount} ${ratedCount === 1 ? "film" : "films"} rated.`,
  /**
   * Shown when some year is within reach of setting (5+ nominees).
   *
   * The year itself is rendered separately by the component (it's gold), so
   * this is the remainder of the sentence — leading space intentional.
   */
  nextWithYear: (remaining: number) =>
    ` needs ${remaining} more to set a ballot.`,
  /** Fallback when nothing is close enough to name a number. */
  nextGeneric: "Add another and watch a year take shape.",
  searchPlaceholder: "Search a film you've watched",
} as const;

/**
 * Guest save prompts — portable, never permanent.
 *
 * `PanelReassurance` used to promise "Forever … Permanent." to a user with no
 * account, which the app itself contradicts three screens later ("These don't
 * auto-save"). What *is* true: guest ratings migrate to the account on signup
 * via `useAuthMigration`, wired globally in `providers.tsx`. So the honest
 * claim is portability. Keep it that way.
 */
export const GUEST_SAVE = {
  stat: "Yours to keep",
  label: "Sign up whenever",
  sub: "Your picks come with you when you do.",
  /** Inline bar on the native returning-guest screen. */
  bar: "Yours to keep — your picks come with you when you sign up.",
  cta: "Sign up",
} as const;

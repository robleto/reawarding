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
  /**
   * The small kicker above `promise`, matching web's own two-tier header
   * (HeroReveal.tsx: a small "Ever disagree..." line, then the bold
   * headline). Kept as a separate, non-A/B-tested string on purpose: it's a
   * framing question that reads fine ahead of either PROMISE_LINE variant,
   * so it doesn't need to flip when Wave 2 does.
   */
  kicker: "Ever disagree with the Academy?",
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
  escape: "How Reawarding works",

  /**
   * Once the ledger is filled, the screen stops instructing and starts
   * reflecting. The sub-line is Law 2 stated plainly — "a single movie is a
   * preference; a field of movies is a ballot" — which is the honest next ask.
   *
   * Deliberately not "{year} needs 4 more to set a ballot": that's completion
   * framing, and Law 8 measures progress in meaning rather than completeness.
   */
  filledInstruction: (year: number) => `${year} is yours.`,
  filledMechanic: (year: number) =>
    `One film is a preference. Add a few more and ${year} becomes a ballot.`,
} as const;

/**
 * The open ledger — the proof slot on the native first-open screen.
 *
 * Replaced a single large AwardCard showing one film with a trophy badge. That
 * card was the *end state* of the web hero's crossfade with the "before"
 * removed, so it showed a winner with nothing to have won against — while the
 * eyebrow directly above it promised a disagreement ("The Academy had its say.
 * Now so do you."). It also dominated the screen and out-weighed the search box.
 *
 * This shows the Academy's real pick beside an empty slot. Two rules it follows:
 *
 * 1. **Never fabricate the visitor's pick.** They haven't chosen anything, so
 *    nothing on screen may imply they have. The blank is the honest state and
 *    it doubles as the invitation — it points back at the search field.
 * 2. **Amend, don't award.** The product edits the record; it doesn't hand out
 *    prizes. No trophies, no laurels, no badges.
 */
export const NATIVE_LEDGER = {
  category: "Best Picture",
  academyLabel: "Academy",
  yoursLabel: "Yours",
  /** Sits in the empty slot, naming the action that fills it. */
  emptyPrompt: "Rate one film to fill this",
  foot: "This year is still open. So is every year back to 1927.",

  /**
   * Filled states. Agreement is a real verdict, not a failure to disagree — if
   * the visitor's pick matches the Academy's, say so plainly rather than
   * manufacturing a disagreement. "Agreed" is the compare-tool spec's word for
   * this; don't invent a synonym.
   */
  agreedLabel: "Agreed",
  footReawarded: (year: number) =>
    `${year} is yours now. Every year back to 1927 is still open.`,
  footAgreed: (year: number) =>
    `You and the Academy agree on ${year}. Plenty of years left to disagree.`,
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
 * The year walk — Act 2 of docs/design/first-rating-payoff.md.
 *
 * One question per year, and the question is deliberately not "name five films
 * from 1994." That's work. "Should something else have won?" is an opinion
 * people already hold, fully formed — the walk harvests those rather than
 * asking anyone to construct new ones.
 */
export const WALK = {
  /** Headline while asking. The first-open instruction is wrong here — they've
   *  already started, and re-telling them to start reads as a reset. */
  askHeadline: (year: number) => `What about ${year}?`,
  /** Replaces the ledger's default empty prompt: during the walk the action is
   *  tapping a poster, not rating a film. */
  slotPrompt: "Pick one below",
  /** The search narrows to the year on screen, so the placeholder must say so —
   *  otherwise results silently exclude everything else and look broken. */
  searchPlaceholder: (year: number) => `Search ${year} films`,
  prompt: (academyTitle: string) =>
    `The Academy gave it to ${academyTitle}. Seen something better?`,
  /** Agreement is a verdict, not a non-answer. Equal weight with picking. */
  agree: "The Academy got this one right",
  /** Must never read as failure — it's the honest answer most of the time. */
  skip: (year: number) => `Haven't seen enough of ${year}`,
  /** Advances the walk. Explicit tap, so the filled ledger isn't yanked away. */
  next: (year: number) => `Next: ${year}`,
} as const;

/**
 * Act 3 — the save moment, shown once the walk ends.
 *
 * Headline counts *verdicts*, not reawards: agreeing with the Academy is a
 * real decision, and "you've reawarded 6 years" would be false for anyone who
 * agreed with some of them.
 *
 * Language stays provisional throughout — "picks", never "awards". A year with
 * one pick is a preference, not a ballot (Law 2), and Law 4 keeps thin ballots
 * provisional until they've earned authority. Act 4 is where they become
 * ballots.
 */
export const WALK_DONE = {
  title: (count: number) =>
    `${count} ${count === 1 ? "year" : "years"} on the record.`,
  breakdown: (reawarded: number, agreed: number) => {
    if (reawarded > 0 && agreed > 0) {
      return `You reawarded ${reawarded}, and agreed with the Academy on ${agreed}.`;
    }
    if (agreed === 0) {
      return reawarded === 1
        ? "You overruled the Academy."
        : "You overruled the Academy every time.";
    }
    return agreed === 1
      ? "You and the Academy agreed."
      : "You and the Academy agreed on all of them.";
  },
  reawardedTag: "Reawarded",
  agreedTag: "Agreed",
  /**
   * The pivot from receipt to beginning, sat directly above the signup ask.
   *
   * Act 3 read as conclusive — "save your finished work" rather than "you've
   * just started". Three things caused it: a summed tally, a receipt list of
   * verdicts, and no mention anywhere of what comes next. The forward-looking
   * line existed only on the *filled* screen (NATIVE_LEDGER.footReawarded,
   * "Every year back to 1927 is still open"), which is backwards — the screen
   * asking for an account is the one that has to show there's more coming.
   *
   * Deliberately not "8 down, 90 to go". Law 8 measures progress in meaning
   * rather than completeness, which is the same reason the tally counts
   * verdicts instead of coverage; a remaining-years counter would turn the
   * walk into a chore with a denominator. "A century to disagree with" names
   * the field as open without quantifying it — the register footReawarded
   * already established.
   *
   * Every claim here is real: a year fills out into a ballot at 5+ nominees
   * with a winner, and /lists and Collections both ship. No "and more" — a
   * vague third promise is weaker than two concrete ones, and this screen has
   * already been burned once by implying something it couldn't keep.
   */
  onward:
    "A start, not a total — there's a century of Best Picture to disagree with. Fill these years out into full ballots, then into lists and collections of your own.",
  /** The onward step. Act 4 turns a preference into a ballot. */
  keepGoing: "Rate more films to turn these into ballots",
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

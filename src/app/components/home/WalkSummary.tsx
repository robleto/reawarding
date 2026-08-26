"use client";

import Link from "next/link";
import { GUEST_SAVE, WALK_DONE } from "@/copy/loggedOutHome";
import type { GuestPicksSummary } from "@/hooks/useGuestPicksSummary";

/**
 * Act 3 of docs/design/first-rating-payoff.md — what they built, then the ask.
 *
 * This is the first honest moment to ask for a signup. At the first rating
 * there was genuinely nothing to lose: guest picks persist locally and migrate
 * on signup via useAuthMigration, so urgency there would be manufactured, and
 * it would spend the one aha moment on a form. Here there's a visible stack of
 * verdicts, so the ask is against real work.
 *
 * **Rendered as a light strip, never gilt AwardCards.** Law 4 — thin ballots
 * are provisional, and a year with a single pick is a preference, not an award.
 * Presenting these as awards would be the "fully-formed ballot with no visible
 * formation" anti-pattern, and it would make Act 4's "turn these into ballots"
 * invitation incoherent.
 */
export default function WalkSummary({
  summary,
  onKeepGoing,
  showHeading = false,
}: {
  summary: GuestPicksSummary;
  onKeepGoing: () => void;
  /**
   * Native's FirstOpen renders the title/breakdown itself, in its own h1/sub,
   * so this stays false there — the screen keeps one heading hierarchy and one
   * `home-headline` testid across all its states. Surfaces with no such H1 to
   * borrow (the web hero, whose top headline is a fixed brand tagline, not a
   * state machine) set this true so the breakdown sentence still renders
   * somewhere; without it "You reawarded 7…" would simply be missing on web.
   * Deliberately an `h2`, not `h1` — it must never compete for the testid.
   */
  showHeading?: boolean;
}) {
  const { picks, reawardedCount, agreedCount } = summary;
  if (picks.length === 0) return null;

  return (
    <div>
      {showHeading && (
        <div className="mb-4">
          <h2 className="font-unbounded text-[20px] font-semibold leading-tight tracking-tight text-white">
            {WALK_DONE.title(picks.length)}
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-gray-400">
            {WALK_DONE.breakdown(reawardedCount, agreedCount)}
          </p>
        </div>
      )}
      <ul className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
        {picks.map((p) => (
          <li key={p.year} className="flex items-center gap-3 py-2">
            <span className="w-9 flex-none font-mono text-[11px] tabular-nums text-gold-300">
              {p.year}
            </span>
            <span className="h-11 w-[30px] flex-none overflow-hidden rounded-sm border border-white/10 bg-charcoal-900">
              <img src={p.posterUrl} alt="" className="h-full w-full object-cover" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] text-gray-200">
              {p.title}
            </span>
            <span
              className={`flex-none font-mono text-[8px] uppercase tracking-[0.14em] ${
                p.agreed ? "text-gray-500" : "text-[#D9694E]"
              }`}
            >
              {p.agreed ? WALK_DONE.agreedTag : WALK_DONE.reawardedTag}
            </span>
          </li>
        ))}
      </ul>

      {/* THE PIVOT — reframes the stack above as a beginning before the ask
          below reads as "archive this and be done". Sits between them on
          purpose: above the list it would be scrolled past (eight verdicts
          push it well off a 390pt frame), and below the ask it would arrive
          after the decision it exists to motivate. Renders on both surfaces,
          unlike the title/breakdown — web has no H1 to borrow, but it has the
          same conclusive problem. */}
      <p className="mt-4 text-[13px] leading-relaxed text-gray-400">
        {WALK_DONE.onward}
      </p>

      {/* Portable, never permanent — the claim has to stay true pre-account. */}
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-gold-500/30 bg-gold-500/[0.06] px-4 py-3">
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-gray-300">
          {GUEST_SAVE.bar}
        </p>
        <Link
          href="/login"
          className="inline-flex min-h-[36px] flex-none items-center justify-center rounded-lg bg-gold-500 px-3.5 text-xs font-semibold text-black transition-colors hover:bg-gold-400"
        >
          {GUEST_SAVE.cta}
        </Link>
      </div>

      {/* Act 4's door. Deliberately quiet — the ask above is the priority, and
          this shouldn't compete with it. */}
      <button
        type="button"
        onClick={onKeepGoing}
        className="mt-3 w-full px-1 py-2 text-center text-[11px] text-gray-500 underline decoration-white/20 underline-offset-4 transition-colors hover:text-gray-300"
      >
        {WALK_DONE.keepGoing}
      </button>
    </div>
  );
}

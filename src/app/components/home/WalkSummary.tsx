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
}: {
  summary: GuestPicksSummary;
  onKeepGoing: () => void;
}) {
  const { picks } = summary;
  if (picks.length === 0) return null;

  // The title and breakdown live in FirstOpen's h1/sub so the screen keeps one
  // heading hierarchy (and one `home-headline` testid) across all its states.
  return (
    <div>
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

      {/* Portable, never permanent — the claim has to stay true pre-account. */}
      <div className="mt-5 flex items-center gap-3 rounded-xl border border-gold-500/30 bg-gold-500/[0.06] px-4 py-3">
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

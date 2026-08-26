"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WALK } from "@/copy/loggedOutHome";
import type { YearCandidate } from "@/hooks/useYearCandidates";

interface YearWalkStripProps {
  year: number;
  /** What the Academy picked — endorsing it is the "Agreed" action. */
  academyTitle: string;
  candidates: YearCandidate[];
  onPick: (candidate: YearCandidate) => void;
  onAgree: () => void;
  onSkip: () => void;
  /**
   * Show the quiet "sign up" mention below the Agree/Skip rows. Callers
   * gate this on WALK_SAVE_HINT_AFTER (src/data/contestedYears.ts) — an
   * early save option for visitors who stop mid-walk, well before Act 3's
   * full ask fires at the walk's actual end.
   */
  showSaveHint?: boolean;
}

/**
 * The chooser for one year of the guest walk (Act 2 of
 * docs/design/first-rating-payoff.md).
 *
 * Three outcomes, all equal weight — that balance is the design, not styling.
 * If agreeing or skipping read as failure next to a big row of posters, people
 * tap a poster they don't mean just to make the screen respond, which poisons
 * the first real data about what anyone believes. "Haven't seen enough of 1994"
 * is a common, legitimate answer and has to look like one.
 */
export default function YearWalkStrip({
  year,
  academyTitle,
  candidates,
  onPick,
  onAgree,
  onSkip,
  showSaveHint = false,
}: YearWalkStripProps) {
  return (
    <div className="mt-5">
      <p className="text-[11px] leading-snug text-gray-400">
        {WALK.prompt(academyTitle)}
      </p>

      {candidates.length > 0 && (
        <ul className="mt-3 grid grid-cols-4 gap-2">
          {candidates.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onPick(c)}
                className="group w-full text-left"
                aria-label={`Reaward ${year} to ${c.title}`}
              >
                <span className="block aspect-[2/3] w-full overflow-hidden rounded border border-white/10 bg-charcoal-900 transition-colors group-hover:border-[#D9694E] group-active:border-[#D9694E]">
                  <img
                    src={c.posterUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </span>
                <span className="mt-1 block text-[9px] leading-tight text-gray-400 group-hover:text-gray-200">
                  {c.title}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-col gap-1.5 border-t border-white/10 pt-3">
        <button
          type="button"
          onClick={onAgree}
          className="flex items-center justify-between gap-2 rounded-lg px-1 py-2 text-left text-xs text-gray-300 transition-colors hover:text-white active:opacity-70"
        >
          {WALK.agree}
          <ArrowRight className="h-3 w-3 flex-none text-gray-500" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="flex items-center justify-between gap-2 rounded-lg px-1 py-2 text-left text-xs text-gray-300 transition-colors hover:text-white active:opacity-70"
        >
          {WALK.skip(year)}
          <ArrowRight className="h-3 w-3 flex-none text-gray-500" aria-hidden="true" />
        </button>
      </div>

      {/* Quiet early out — Act 3's gold bar is still the main ask, so this
          stays at the same muted weight as WalkSummary's "keep going" link
          rather than competing with it. */}
      {showSaveHint && (
        <Link
          href="/login"
          className="mt-3 block text-center text-[11px] text-gray-500 underline decoration-white/20 underline-offset-4 transition-colors hover:text-gray-300"
        >
          {WALK.saveHint}
        </Link>
      )}
    </div>
  );
}

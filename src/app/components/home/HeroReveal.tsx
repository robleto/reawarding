"use client";

// Redo (2026-08, third pass): the first redo replaced a ~6s bespoke GSAP
// crossfade show with a static AwardCard swap between an invented matchup
// and the visitor's pick. The second pass swapped that invented matchup for
// a real, widely-agreed-upon one (2010: The Social Network over The King's
// Speech) reasoning that visitors needed a disagreement they already held an
// opinion on. Both passes were still wrong in the same way: they were a demo
// of the concept, not the concept itself — a hypothetical the visitor has to
// interpret before the search box below means anything.
//
// This pass drops illustration entirely and reuses AcademyLedger — the same
// component the native first-open screen already uses (see
// docs/design/logged-out-native-home.md and NATIVE_LEDGER's own doc comment
// in src/copy/loggedOutHome.ts for why THAT replaced a single AwardCard: it
// showed a winner with nothing to have won against, and dominated the screen
// over the search box). The web hero shows the same thing: this year's real
// Academy pick beside an empty "Yours" slot — no example, no swap animation,
// just the actual first move, pointing back at the search field above it.
// Respects reducedMotion trivially now: there's no motion left to reduce
// beyond the shared arrival glow, which already no-ops under it.
//
// Fourth pass (2026-08): the ledger used to be static — it filled once via
// the general rate flow and then just sat there, with none of the native
// screen's walk (Act 2) or save summary (Act 3). Wired in via useLedgerWalk,
// the same hook FirstOpen uses, so this doesn't become a second
// implementation of the same flow that drifts from it. The static top
// headline ("The Academy had its say. Now so do you.") is untouched — it's a
// fixed brand tagline here, unlike native's, which doubles as the activation
// instruction because there's no room for both. Web has the room, so the
// state-dependent copy lives only in the region below it.

import { useRef } from "react";
import MovieSearchPicker from "@/components/home/MovieSearchPicker";
import AcademyLedger from "@/components/home/AcademyLedger";
import YearWalkStrip from "@/app/components/home/YearWalkStrip";
import WalkSummary from "@/app/components/home/WalkSummary";
import { useMotionReveal } from "@/hooks/useMotionReveal";
import { useLedgerWalk, type LedgerState } from "@/hooks/useLedgerWalk";
import { WALK } from "@/copy/loggedOutHome";
import { ArrowRight } from "lucide-react";
import type { Movie } from "@/types/types";

const R2 = "https://pub-6b3a2dfce3484ea291e496348a19d788.r2.dev/posters";

/**
 * The Academy's real Best Picture winner for THIS year — shared by both the
 * web hero below and the native first-open screen's ledger (see
 * NATIVE_LEDGER in src/copy/loggedOutHome.ts).
 *
 * Deliberately a constant rather than a `fetchOfficialAwardWinners()` call.
 * That data exists and is per-year correct, but it's a Supabase round trip, and
 * this renders on the logged-out first-open screen — the one surface where a
 * loading state costs the most. The ledger names its year explicitly, so a
 * constant can go stale but can never be *wrong*: it stays an accurate
 * statement about 2025 even after the next ceremony.
 *
 * Refresh after each ceremony to keep it current.
 */
export const ACADEMY_REFERENCE = {
  year: 2025,
  title: "One Battle After Another",
  posterUrl: `${R2}/fb4f7c6c-efa9-4bb2-9698-f1d9d83299d1.jpg`,
} as const;

interface HeroRevealProps {
  reducedMotion: boolean;
  onSelectMovie: (movie: Movie) => void;
  ledger: LedgerState;
  movies: Movie[];
  onPickForYear: (pick: { id: string; title: string; year: number }) => void;
  onDeepenYear: (year: number) => void;
}

export default function HeroReveal({
  reducedMotion,
  onSelectMovie,
  ledger,
  movies,
  onPickForYear,
  onDeepenYear,
}: HeroRevealProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const arrived = useMotionReveal(reducedMotion, cardRef);

  const {
    askingYear,
    walkAcademy,
    candidates,
    shownLedger,
    filled,
    showSummary,
    summary,
    decide,
    advance,
    walk,
  } = useLedgerWalk(ledger, movies, onPickForYear, "web");

  return (
    <div className="flex flex-col">
      {/* ─── Headline + search — visible from first paint ─── */}
      <div className="max-w-4xl mx-auto text-center px-4 pt-10 pb-4">
        <h2
          className="font-unbounded font-normal text-gold-400 sm:whitespace-nowrap"
          style={{ fontSize: "clamp(1rem, 2vw, 1.25rem)", letterSpacing: "-0.005em" }}
        >
          Ever disagree with the Academy?
        </h2>
        {/* tests/prelogin.spec.ts asserts on this testid. It used to live only
            in HomeHero/HomeEmptyState, both of which are orphaned (zero call
            sites), so the assertion had been failing against a component the
            guest path never renders. It belongs on whatever is actually the
            logged-out H1 — here for web, NativeGuestHome for native. */}
        <h1
          data-testid="home-headline"
          className="home-headline font-unbounded sm:whitespace-nowrap mt-2"
          style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
        >
          The Academy
          <br className="sm:hidden" />
          {" "}had its say.
          <br />
          Now so do you.
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-base text-white/80">
          Rate the films you&apos;ve seen, reaward your own nominees — and your
          own winner.
        </p>
      </div>

      {/* Mid-walk this scopes to the year being asked and records a verdict
          for it, rather than staying global — same fix as the native screen's
          search box, and for the same two reasons: an unscoped pick would
          disagree with the question on screen, and it could hand off to the
          general rate flow instead of the walk. See NativeGuestHome.tsx's
          FirstOpen for the fuller rationale; identical logic here via the
          shared useLedgerWalk hook. */}
      <div className="pt-6 pb-2 px-4 text-center">
        <div className="home-hero__search mx-auto" style={{ maxWidth: 560 }}>
          <MovieSearchPicker
            key={askingYear ?? "global"}
            onSelect={(movie) =>
              askingYear
                ? decide(
                    {
                      id: String(movie.id),
                      title: movie.title,
                      posterUrl: movie.poster_url ?? "",
                    },
                    walkAcademy?.movieId != null &&
                      String(walkAcademy.movieId) === String(movie.id)
                  )
                : onSelectMovie(movie)
            }
            placeholder={
              askingYear
                ? WALK.searchPlaceholder(askingYear)
                : "Search for a film you've watched"
            }
            filterByYear={askingYear ?? undefined}
            className="home-search-picker"
          />
          {!askingYear && (
            <p className="home-hero__microcopy">No account needed to get started.</p>
          )}
        </div>
      </div>

      {/* ─── The ledger, now stateful across Acts 1–3: fills on the first
          pick, continues into the year walk below it, then gives way to the
          save summary once the walk ends. Same components and hook the
          native screen uses — see the file header for why the top headline
          above stays fixed while this region carries all the state-dependent
          copy. ─── */}
      <div
        ref={cardRef}
        className={`max-w-md mx-auto w-full px-4 mt-4 pt-6 border-t border-white/10 award-year-enter ${arrived ? "award-year-arrived" : ""}`}
      >
        {showSummary ? (
          <WalkSummary
            summary={summary}
            onKeepGoing={() => onDeepenYear(summary.picks[0]?.year ?? shownLedger.academy.year)}
            showHeading
          />
        ) : (
          <AcademyLedger
            academy={shownLedger.academy}
            yours={shownLedger.yours}
            agreed={shownLedger.agreed}
            emptyPrompt={askingYear ? WALK.slotPrompt : undefined}
          />
        )}

        {askingYear && walkAcademy && (
          <YearWalkStrip
            year={askingYear}
            academyTitle={walkAcademy.reference.title}
            candidates={candidates}
            onPick={(c) =>
              decide({ id: c.id, title: c.title, posterUrl: c.posterUrl }, false)
            }
            onAgree={() =>
              walkAcademy.movieId
                ? decide(
                    {
                      id: walkAcademy.movieId,
                      title: walkAcademy.reference.title,
                      posterUrl: walkAcademy.reference.posterUrl,
                    },
                    true
                  )
                : undefined
            }
            onSkip={() => walk.skip(askingYear)}
          />
        )}

        {filled && walk.currentYear !== null && (
          <button
            type="button"
            onClick={advance}
            className="mt-4 flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-xs font-medium text-gray-200 transition-colors hover:bg-white/[0.07] active:scale-[0.99]"
          >
            {WALK.next(walk.currentYear)}
            <ArrowRight className="h-3.5 w-3.5 flex-none text-[#D9694E]" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

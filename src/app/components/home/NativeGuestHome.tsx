"use client";

// Logged-out home for the wrapped native app.
//
// Spec: docs/design/logged-out-native-home.md
//
// Why this exists at all: capacitor.config.ts points the iOS WebView at
// reawarding.com, so before this component a user who had *already downloaded
// the app from the App Store* was served the six-panel cold-visitor sales
// funnel — six viewport-heights of acquisition marketing aimed at convincing
// them to try a product they had already installed and opened. That also broke
// PROJECT_CONTEXT.md §5 ("first award in under 30 seconds") and §8 ("new users
// see an action screen — one primary CTA, minimal distraction").
//
// Web converts. Native activates. This is the native half.
//
// Two states, and the difference between them is the whole point:
//   - First open (no ratings) — one screen: promise / instruction / mechanic /
//     action / proof. The pitch demotes to an eyebrow; the instruction becomes
//     the headline.
//   - Returning guest (has ratings) — no pitch at all. They already said yes;
//     lead with their own work. Previously this user got a save banner AND
//     then the entire funnel again, which was the worst case in the app.

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import MovieSearchPicker from "@/components/home/MovieSearchPicker";
import AwardCard from "@/components/home/AwardCard";
import AcademyLedger, {
  type AcademyLedgerPick,
} from "@/components/home/AcademyLedger";
import { useMotionReveal } from "@/hooks/useMotionReveal";
import {
  GUEST_SAVE,
  NATIVE_FIRST_OPEN,
  NATIVE_RETURNING,
  WALK,
} from "@/copy/loggedOutHome";
import YearWalkStrip from "@/app/components/home/YearWalkStrip";
import { useYearWalk } from "@/hooks/useYearWalk";
import { useYearCandidates } from "@/hooks/useYearCandidates";
import { useAcademyPickForYear } from "@/hooks/useAcademyPickForYear";
import type { Movie } from "@/types/types";

/** The four how-it-works steps, mirrored from HowItWorksSection. */
const STEPS = [
  { number: 1, title: "Search for any movie you love.", body: "Start rating films naturally, as they come to mind." },
  { number: 2, title: "Each rating finds its year.", body: "Your scores quietly shape each ballot." },
  { number: 3, title: "Watch the years take form.", body: "Nominees and winners emerge automatically." },
  { number: 4, title: "Change anything you disagree with.", body: "Your Academy. Your final say." },
] as const;

/** The user's closest-to-set year, for the returning-guest "next" line. */
export interface NativeNextYear {
  year: number;
  /** Films still needed to reach a set ballot (5 nominees). */
  remaining: number;
}

/** Their top forming ballot, rendered with the canonical AwardCard. */
export interface NativeTopBallot {
  year: number;
  winnerTitle: string;
  winnerPoster?: string | null;
  winnerMovieId?: string | number | null;
  nomineeCount: number;
}

/** The Academy's real pick — the filled half of the first-open ledger. */
export interface NativeAcademyReference {
  year: number;
  title: string;
  posterUrl: string;
}

/** What the ledger should render right now. */
export interface NativeLedgerState {
  academy: NativeAcademyReference;
  /** Null until the visitor has a pick for `academy.year`. */
  yours: AcademyLedgerPick | null;
  agreed: boolean;
}

interface NativeGuestHomeProps {
  reducedMotion: boolean;
  onSelectMovie: (movie: Movie) => void;
  /** Number of films the guest has rated. */
  ratedCount: number;
  nextYear: NativeNextYear | null;
  topBallot: NativeTopBallot | null;
  ledger: NativeLedgerState;
  /** Client movie set — lets the walk resolve posters without refetching. */
  movies: Movie[];
  /** Records a walk verdict as a guest award (`seed_pick`), not a rating. */
  onPickForYear: (pick: { id: string; title: string; year: number }) => void;
  /**
   * Whether the guest has enough breadth to warrant the archive view.
   *
   * NOT `ratedCount > 0`. That was the bug: one rating swapped this whole
   * screen out for a different layout, so the ledger the visitor had just
   * filled vanished and they landed on what reads as an awards page. The
   * screen now evolves in place and only hands off once there's genuinely
   * something to browse. See docs/design/first-rating-payoff.md.
   */
  showArchive: boolean;
}

export default function NativeGuestHome({
  reducedMotion,
  onSelectMovie,
  ratedCount,
  nextYear,
  topBallot,
  ledger,
  movies,
  onPickForYear,
  showArchive,
}: NativeGuestHomeProps) {
  return (
    <div className="w-full min-w-0 px-4 pt-6 pb-24">
      {showArchive ? (
        <ReturningGuest
          reducedMotion={reducedMotion}
          onSelectMovie={onSelectMovie}
          ratedCount={ratedCount}
          nextYear={nextYear}
          topBallot={topBallot}
        />
      ) : (
        <FirstOpen
          reducedMotion={reducedMotion}
          onSelectMovie={onSelectMovie}
          ledger={ledger}
          movies={movies}
          onPickForYear={onPickForYear}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   First open — before and after the first pick.
   One screen that evolves, not two that swap (Law 3: ballots form, never
   appear — a layout swap hides the formation).
   ──────────────────────────────────────────────────────────────────── */

function FirstOpen({
  reducedMotion,
  onSelectMovie,
  ledger,
  movies,
  onPickForYear,
}: {
  reducedMotion: boolean;
  onSelectMovie: (movie: Movie) => void;
  ledger: NativeLedgerState;
  movies: Movie[];
  onPickForYear: (pick: { id: string; title: string; year: number }) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const arrived = useMotionReveal(reducedMotion, cardRef);
  const [showSteps, setShowSteps] = useState(false);

  // ── The walk (Act 2) ──────────────────────────────────────────────────
  // `result` holds a just-decided year so the visitor sees their pick land
  // before anything advances. Without it the walk would swallow its own
  // payoff — the award is recorded instantly, so the next year would replace
  // the filled ledger in the same frame.
  const walk = useYearWalk();
  const [result, setResult] = useState<NativeLedgerState | null>(null);
  /** The props-derived first result (from the search flow) needs one ack too. */
  const [ackedFirst, setAckedFirst] = useState(false);

  const showFirstResult = ledger.yours !== null && !ackedFirst && !result;
  const askingYear = !showFirstResult && !result ? walk.currentYear : null;

  const walkAcademy = useAcademyPickForYear(askingYear, movies);
  const candidates = useYearCandidates(askingYear, walkAcademy?.movieId ?? null);

  // What the ledger renders right now: a fresh verdict, the year being asked
  // about, or the props ledger before the walk has started.
  const shownLedger: NativeLedgerState =
    result ??
    (askingYear && walkAcademy
      ? { academy: walkAcademy.reference, yours: null, agreed: false }
      : ledger);

  const filled = shownLedger.yours !== null;

  const decide = (pick: AcademyLedgerPick & { id: string }, agreed: boolean) => {
    if (askingYear == null || !walkAcademy) return;
    onPickForYear({ id: pick.id, title: pick.title, year: askingYear });
    setResult({
      academy: walkAcademy.reference,
      yours: { title: pick.title, posterUrl: pick.posterUrl },
      agreed,
    });
  };

  const advance = () => {
    setResult(null);
    setAckedFirst(true);
  };

  return (
    <div className="mx-auto max-w-md">
      {/* PROMISE — the only positioning string on this screen, and the only
          one that changes if the Wedge/Ritual test flips. Small on purpose:
          they already downloaded, so this nods at why rather than arguing it.
          Retired once they've acted: the pitch has done its job. */}
      {!filled && !askingYear && (
        <p className="font-unbounded text-[13px] leading-snug text-gold-400">
          {NATIVE_FIRST_OPEN.promise}
        </p>
      )}

      {/* INSTRUCTION — the largest thing on the screen. An imperative before
          they act; a reflection of what they did after. */}
      <h1
        data-testid="home-headline"
        className={`font-unbounded text-[26px] font-semibold leading-[1.15] tracking-tight text-white ${filled || askingYear ? "" : "mt-2"}`}
      >
        {filled
          ? NATIVE_FIRST_OPEN.filledInstruction(shownLedger.academy.year)
          : askingYear
            ? WALK.askHeadline(askingYear)
            : NATIVE_FIRST_OPEN.instruction}
      </h1>

      {/* MECHANIC — the 7+ rule before, Law 2's preference-vs-ballot after.
          Suppressed mid-walk: the strip below the ledger already asks the
          question, and repeating it here just crowds the year. */}
      {!askingYear && (
        <p className="mt-3 text-sm leading-relaxed text-gray-400">
          {filled
            ? NATIVE_FIRST_OPEN.filledMechanic(shownLedger.academy.year)
            : NATIVE_FIRST_OPEN.mechanic}
        </p>
      )}

      {/* ACTION — deliberately not autofocused. Popping the keyboard on cold
          app open covers the proof card below and reads as aggressive on iOS. */}
      <div className="mt-5">
        <MovieSearchPicker
          onSelect={onSelectMovie}
          placeholder={NATIVE_FIRST_OPEN.searchPlaceholder}
          variant="hero"
        />
        <p className="mt-2 text-center text-xs text-gray-500">
          {NATIVE_FIRST_OPEN.assurance}
        </p>
      </div>

      {/* PROOF — the open ledger, now shared with the web hero (see
          AcademyLedger for the two rules it follows and what it replaced). */}
      <div
        ref={cardRef}
        className={`mt-8 border-t border-white/10 pt-4 award-year-enter ${arrived ? "award-year-arrived" : ""}`}
      >
        <AcademyLedger
          academy={shownLedger.academy}
          yours={shownLedger.yours}
          agreed={shownLedger.agreed}
          emptyPrompt={askingYear ? WALK.slotPrompt : undefined}
        />

        {/* THE WALK (Act 2) — one year at a time, below the ledger it fills.
            Advancing is an explicit tap rather than a timer: the filled ledger
            is the reward, and pulling it away after a beat undercuts it. It
            also avoids content shifting under a finger mid-tap. */}
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

      {/* ESCAPE — how-it-works stops being four mandatory screens and becomes
          one optional tap. Inline disclosure rather than a route, so the user
          never leaves the activation surface. */}
      <div className="mt-8 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={() => setShowSteps((v) => !v)}
          aria-expanded={showSteps}
          className="mx-auto flex items-center gap-1.5 text-sm text-gray-400 underline decoration-white/20 underline-offset-4 transition-colors hover:text-gray-200"
        >
          {NATIVE_FIRST_OPEN.escape}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${showSteps ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>

        {showSteps && (
          <ol className="mt-5 space-y-4">
            {STEPS.map((step) => (
              <li key={step.number} className="flex gap-3">
                <span
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-full border border-gold-500/30 bg-gold-500/[0.06] font-mono text-xs text-gold-300"
                  aria-hidden="true"
                >
                  {step.number}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug text-white">{step.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Returning guest — has ratings, no account
   ──────────────────────────────────────────────────────────────────── */

function ReturningGuest({
  reducedMotion,
  onSelectMovie,
  ratedCount,
  nextYear,
  topBallot,
}: {
  reducedMotion: boolean;
  onSelectMovie: (movie: Movie) => void;
  ratedCount: number;
  nextYear: NativeNextYear | null;
  topBallot: NativeTopBallot | null;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const arrived = useMotionReveal(reducedMotion, cardRef);

  return (
    <div className="mx-auto max-w-md">
      {/* STATE — their own progress is the headline. No promise, no mechanic,
          no proof: they've seen the proof, they made some. */}
      <h1
        data-testid="home-headline"
        className="font-unbounded text-[24px] font-semibold leading-tight tracking-tight text-white"
      >
        {NATIVE_RETURNING.state(ratedCount)}
      </h1>

      <p className="mt-2 text-sm leading-relaxed text-gray-400">
        {nextYear ? (
          <>
            <span className="font-semibold text-gold-300">{nextYear.year}</span>
            {NATIVE_RETURNING.nextWithYear(nextYear.remaining)}
          </>
        ) : (
          NATIVE_RETURNING.nextGeneric
        )}
      </p>

      <div className="mt-5">
        <MovieSearchPicker
          onSelect={onSelectMovie}
          placeholder={NATIVE_RETURNING.searchPlaceholder}
          variant="hero"
        />
      </div>

      {/* THEIR WORK — their own forming ballot, same canonical card. */}
      {topBallot && (
        <div className="mt-8">
          <div
            ref={cardRef}
            className={`award-year-enter ${arrived ? "award-year-arrived" : ""}`}
          >
            <AwardCard
              year={topBallot.year}
              winnerTitle={topBallot.winnerTitle}
              winnerPoster={topBallot.winnerPoster}
              winnerMovieId={topBallot.winnerMovieId}
              nomineeCount={topBallot.nomineeCount}
              fullWidth
              academyStatus={null}
            />
          </div>
        </div>
      )}

      {/* SAVE — portable, never permanent. Guest ratings really do migrate on
          signup (useAuthMigration in providers.tsx), so this claim is true as
          written; "Forever / Permanent" was not. */}
      <div className="mt-8 flex items-center gap-3 rounded-xl border border-gold-500/30 bg-gold-500/[0.06] px-4 py-3">
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
    </div>
  );
}

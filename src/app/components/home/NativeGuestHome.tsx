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
import { ChevronDown } from "lucide-react";
import MovieSearchPicker from "@/components/home/MovieSearchPicker";
import AwardCard from "@/components/home/AwardCard";
import { useMotionReveal } from "@/hooks/useMotionReveal";
import {
  GUEST_SAVE,
  NATIVE_FIRST_OPEN,
  NATIVE_RETURNING,
} from "@/copy/loggedOutHome";
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

interface NativeGuestHomeProps {
  reducedMotion: boolean;
  onSelectMovie: (movie: Movie) => void;
  /** Number of films the guest has rated. 0 → first-open screen. */
  ratedCount: number;
  nextYear: NativeNextYear | null;
  topBallot: NativeTopBallot | null;
  /** Demo year used as proof on the first-open screen. */
  proof: NativeTopBallot;
}

export default function NativeGuestHome({
  reducedMotion,
  onSelectMovie,
  ratedCount,
  nextYear,
  topBallot,
  proof,
}: NativeGuestHomeProps) {
  const isReturning = ratedCount > 0;

  return (
    <div className="w-full min-w-0 px-4 pt-6 pb-24">
      {isReturning ? (
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
          proof={proof}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   First open — no ratings yet
   ──────────────────────────────────────────────────────────────────── */

function FirstOpen({
  reducedMotion,
  onSelectMovie,
  proof,
}: {
  reducedMotion: boolean;
  onSelectMovie: (movie: Movie) => void;
  proof: NativeTopBallot;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const arrived = useMotionReveal(reducedMotion, cardRef);
  const [showSteps, setShowSteps] = useState(false);

  return (
    <div className="mx-auto max-w-md">
      {/* PROMISE — the only positioning string on this screen, and the only
          one that changes if the Wedge/Ritual test flips. Small on purpose:
          they already downloaded, so this nods at why rather than arguing it. */}
      <p className="font-unbounded text-[13px] leading-snug text-gold-400">
        {NATIVE_FIRST_OPEN.promise}
      </p>

      {/* INSTRUCTION — the largest thing on the screen. An imperative, not a
          claim. This is the inversion the whole spec turns on. */}
      <h1
        data-testid="home-headline"
        className="mt-2 font-unbounded text-[26px] font-semibold leading-[1.15] tracking-tight text-white"
      >
        {NATIVE_FIRST_OPEN.instruction}
      </h1>

      {/* MECHANIC — states the 7+ rule the web hero leaves to be inferred. */}
      <p className="mt-3 text-sm leading-relaxed text-gray-400">
        {NATIVE_FIRST_OPEN.mechanic}
      </p>

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

      {/* PROOF — the canonical AwardCard showing a formed year. Same artifact
          the real /awards surface renders, not marketing chrome. */}
      <div className="mt-8">
        <p className="mb-2 text-xs italic text-gray-500">
          {NATIVE_FIRST_OPEN.proofCaption}
        </p>
        <div
          ref={cardRef}
          className={`award-year-enter ${arrived ? "award-year-arrived" : ""}`}
        >
          <AwardCard
            year={proof.year}
            winnerTitle={proof.winnerTitle}
            winnerPoster={proof.winnerPoster}
            winnerMovieId={proof.winnerMovieId}
            nomineeCount={proof.nomineeCount}
            fullWidth
            academyStatus={null}
          />
        </div>
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

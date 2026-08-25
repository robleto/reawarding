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
import AcademyLedger, {
  type AcademyLedgerPick,
} from "@/components/home/AcademyLedger";
import { useMotionReveal } from "@/hooks/useMotionReveal";
import {
  GUEST_SAVE,
  NATIVE_FIRST_OPEN,
  NATIVE_RETURNING,
  WALK,
  WALK_DONE,
} from "@/copy/loggedOutHome";
import YearWalkStrip from "@/app/components/home/YearWalkStrip";
import WalkSummary from "@/app/components/home/WalkSummary";
import { useLedgerWalk } from "@/hooks/useLedgerWalk";
import { useGuestPicksSummary } from "@/hooks/useGuestPicksSummary";
import type { Movie } from "@/types/types";

/** The four how-it-works steps, mirrored from HowItWorksSection. */
const STEPS = [
  { number: 1, title: "Search for any movie you love.", body: "Start rating films naturally, as they come to mind." },
  { number: 2, title: "Each rating finds its year.", body: "Your scores quietly shape each ballot." },
  { number: 3, title: "Watch the years take form.", body: "Nominees and winners emerge automatically." },
  { number: 4, title: "Change anything you disagree with.", body: "Your Academy. Your final say." },
] as const;

/**
 * Their top forming ballot. Not rendered on this screen — the gilt AwardCard
 * treatment it fed was retired below (see "Fix the returning-guest screen" in
 * docs/design/first-rating-payoff.md) — but page.tsx still derives
 * NativeLedgerState from it, so the type stays exported.
 */
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
  ledger: NativeLedgerState;
  /** Client movie set — lets the walk resolve posters without refetching. */
  movies: Movie[];
  /** Records a walk verdict as a guest award (`seed_pick`), not a rating. */
  onPickForYear: (pick: { id: string; title: string; year: number }) => void;
  /** Act 4 door — the year-scoped depth page that turns picks into ballots. */
  onDeepenYear: (year: number) => void;
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
  ledger,
  movies,
  onPickForYear,
  onDeepenYear,
  showArchive,
}: NativeGuestHomeProps) {
  return (
    <div className="w-full min-w-0 px-4 pt-6 pb-24">
      {showArchive ? (
        <ReturningGuest
          onSelectMovie={onSelectMovie}
          ratedCount={ratedCount}
          onDeepenYear={onDeepenYear}
        />
      ) : (
        <FirstOpen
          reducedMotion={reducedMotion}
          onSelectMovie={onSelectMovie}
          ledger={ledger}
          movies={movies}
          onPickForYear={onPickForYear}
          onDeepenYear={onDeepenYear}
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
  onDeepenYear,
}: {
  reducedMotion: boolean;
  onSelectMovie: (movie: Movie) => void;
  ledger: NativeLedgerState;
  movies: Movie[];
  onPickForYear: (pick: { id: string; title: string; year: number }) => void;
  onDeepenYear: (year: number) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const arrived = useMotionReveal(reducedMotion, cardRef);
  const [showSteps, setShowSteps] = useState(false);

  // Acts 1–3 (fill / walk / summary) are shared with the web hero via this
  // hook — see docs/design/first-rating-payoff.md, "Wire the walk into the
  // web guest ledger too". Behavior is identical on both surfaces by
  // construction; only the surrounding copy and layout differ per screen.
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
  } = useLedgerWalk(ledger, movies, onPickForYear, "native");

  // True first open: nothing filled, no walk in progress, no summary. Cut
  // down 2026-08-24 per direct feedback on the running app — the empty ledger
  // (Academy pick + a dashed "Yours" slot for 2025) implied a tap-to-fill
  // mechanic that doesn't actually exist for the current year: every other
  // year in the walk offers a curated row of real contenders to tap
  // (CONTESTED_YEARS' pinned rival + rating-ordered fill), but 2025 has no
  // settled consensus yet to curate from — checked directly, imdb_rating
  // ordering for 2025 returns anime and international titles with high
  // ratings but no Best Picture relevance, unlike the aged catalogs that make
  // the walk's chooser rows work. Building that mechanic for the current year
  // isn't viable right now, so showing its empty slot was a promise the
  // screen couldn't keep. It also implied "pick a 2025 film" when the product
  // doesn't actually care what year they start with — any film re-keys the
  // ledger correctly (proven live: a guest's first-ever pick was a 1994 film,
  // and the ledger correctly filled 1994 against Forrest Gump, not 2025).
  //
  // The 7+ mechanic line is cut too, not just moved: RatingModal and the
  // rating step of OnboardingPickFlow already state "rate 7 or higher to
  // nominate" at the moment someone is actually about to do it. Explaining it
  // here first was pure duplicate exposition.
  const isPristine = !filled && !askingYear && !showSummary;

  return (
    <div className="mx-auto max-w-md">
      {isPristine ? (
        // The only positioning string on this screen, and the only one that
        // changes if the Wedge/Ritual test flips (docs/design/
        // logged-out-native-home.md). Promoted from a small eyebrow to the
        // actual headline — with the instruction and ledger both gone, it's
        // the one thing this state has to say, so it should read like it.
        // Sized up from web's H1 clamp but not copied verbatim: native has
        // roughly a third of web's width, and web's clamp wraps this same
        // line across 2-3 lines even there.
        <h1
          data-testid="home-headline"
          className="font-unbounded text-[22px] font-semibold leading-[1.25] tracking-tight text-gold-400"
        >
          {NATIVE_FIRST_OPEN.promise}
        </h1>
      ) : (
        <>
          {/* INSTRUCTION — the largest thing on the screen. An imperative
              before they act; a reflection of what they did after. */}
          <h1
            data-testid="home-headline"
            className={`font-unbounded text-[26px] font-semibold leading-[1.15] tracking-tight text-white ${filled || askingYear ? "" : "mt-2"}`}
          >
            {showSummary
              ? WALK_DONE.title(summary.picks.length)
              : filled
                ? NATIVE_FIRST_OPEN.filledInstruction(shownLedger.academy.year)
                : askingYear
                  ? WALK.askHeadline(askingYear)
                  : NATIVE_FIRST_OPEN.instruction}
          </h1>

          {/* MECHANIC — Law 2's preference-vs-ballot line once filled, the
              walk's breakdown once summarized. Suppressed mid-walk: the strip
              below the ledger already asks the question, and repeating it
              here just crowds the year. Never the 7+ rule — see isPristine's
              comment for why that's gone from this screen entirely. */}
          {!askingYear && (
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              {showSummary
                ? WALK_DONE.breakdown(summary.reawardedCount, summary.agreedCount)
                : NATIVE_FIRST_OPEN.filledMechanic(shownLedger.academy.year)}
            </p>
          )}
        </>
      )}

      {/* ACTION — deliberately not autofocused. Popping the keyboard on cold
          app open covers the proof card below and reads as aggressive on iOS. */}
      {/* Mid-walk the search narrows to the year on screen and records a
          verdict for it, rather than staying global and running the general
          rate flow. Two things were wrong before:

          - The question and the record disagreed. Searching a 1970 film while
            the walk asked about 1994 created an award for 1970.
          - It could eject you. `showArchive` keys off rated years, so rating a
            second film from another year replaced the entire walk surface
            mid-flow. A verdict is an award, not a rating (Fork B), so a scoped
            pick can't trip that.

          Kept rather than hidden: the four tiles won't always hold the film
          someone has in mind, and that's the whole point of the year. */}
      <div className="mt-5">
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
              : NATIVE_FIRST_OPEN.searchPlaceholder
          }
          filterByYear={askingYear ?? undefined}
          variant="hero"
        />
        {!askingYear && (
          <p className="mt-2 text-center text-xs text-gray-500">
            {NATIVE_FIRST_OPEN.assurance}
          </p>
        )}
      </div>

      {/* PROOF — the open ledger, now shared with the web hero (see
          AcademyLedger for the two rules it follows and what it replaced).
          Absent entirely while isPristine — see that flag's comment above
          for why the empty-2025-slot version of this was cut, not just
          restyled. It appears the moment there's something real to show:
          filled, mid-walk, or the save summary. */}
      {!isPristine && (
      <div
        ref={cardRef}
        className={`mt-8 border-t border-white/10 pt-4 award-year-enter ${arrived ? "award-year-arrived" : ""}`}
      >
        {showSummary ? (
          <WalkSummary
            summary={summary}
            onKeepGoing={() => onDeepenYear(summary.picks[0]?.year ?? shownLedger.academy.year)}
          />
        ) : (
          <AcademyLedger
            academy={shownLedger.academy}
            yours={shownLedger.yours}
            agreed={shownLedger.agreed}
            emptyPrompt={askingYear ? WALK.slotPrompt : undefined}
          />
        )}

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
      )}

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
  onSelectMovie,
  ratedCount,
  onDeepenYear,
}: {
  onSelectMovie: (movie: Movie) => void;
  ratedCount: number;
  onDeepenYear: (year: number) => void;
}) {
  const summary = useGuestPicksSummary();
  const hasRecord = summary.picks.length > 0;

  return (
    <div className="mx-auto max-w-md">
      {/* Counts verdicts, not ratings. "2 films rated" was badly wrong for
          anyone who came through the year walk — eight picks plus a couple of
          ratings read as almost nothing, because walk verdicts are awards
          rather than ratings (Fork B). Same phrasing as the end of the walk,
          so the number never appears to reset between screens. */}
      <h1
        data-testid="home-headline"
        className="font-unbounded text-[24px] font-semibold leading-tight tracking-tight text-white"
      >
        {hasRecord
          ? WALK_DONE.title(summary.picks.length)
          : NATIVE_RETURNING.state(ratedCount)}
      </h1>

      {/* Was "{year} needs 4 more to set a ballot" — completion framing, which
          Law 8 pushes against: progress is measured in meaning, not
          completeness. The breakdown says what they actually did instead. */}
      <p className="mt-2 text-sm leading-relaxed text-gray-400">
        {hasRecord
          ? WALK_DONE.breakdown(summary.reawardedCount, summary.agreedCount)
          : NATIVE_RETURNING.nextGeneric}
      </p>

      <div className="mt-5">
        <MovieSearchPicker
          onSelect={onSelectMovie}
          placeholder={NATIVE_RETURNING.searchPlaceholder}
          variant="hero"
        />
      </div>

      {/* THEIR WORK — the same provisional strip the walk ends on, not the gilt
          AwardCard this screen used to lead with.

          Two reasons the card was wrong here. It's the trophy treatment removed
          from first open, so it reintroduced the gamification everywhere else
          rejects. And it presented whatever year happened to be strongest as a
          finished award even when it held one or two nominees — Law 4 keeps
          thin ballots provisional, and authority is earned rather than
          assigned. Ceremony for a genuinely set ballot belongs on the archive
          after signup, where the ballot is canonical. */}
      {hasRecord ? (
        <div className="mt-8">
          <WalkSummary
            summary={summary}
            onKeepGoing={() => onDeepenYear(summary.picks[0].year)}
          />
        </div>
      ) : (
        // WalkSummary carries the save prompt, so this branch needs its own.
        // Reachable: rating a film outside the home flow (e.g. from /films)
        // writes a ranking without creating an award, so a guest can have rated
        // years and no record. Without this they'd have no way to save at all.
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
      )}
    </div>
  );
}

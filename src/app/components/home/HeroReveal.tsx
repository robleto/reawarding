"use client";

// Redo (2026-08): the previous version staged a ~6s bespoke GSAP show —
// FLIP-sliding poster clones between grid cells, an elastic slam-in stamp,
// separate mobile/desktop choreography — that existed nowhere else in the
// product, and it gated the real headline/search behind that sequence.
// The real Awards page presents this exact "your winner vs. the Academy's"
// moment completely at rest (see EditableYearSection.tsx's read-mode card:
// a static AwardCard, a static AcademyStamp, no slam, no slide). This
// version borrows that real language instead of inventing new marketing
// chrome:
//   - Headline + search render immediately, not gated behind any animation.
//   - Both mobile and desktop use the same real AwardCard(fullWidth)
//     artifact EditableYearSection uses — the old desktop path rendered a
//     plain WinnerCard with no gold-frame ceremony, which is why the
//     hero read as a notch below the rest of the app.
//   - Exactly one motion beat: after a short hold on the Academy's actual
//     2025 pick, the winner card cross-fades (CSS opacity only, no GSAP,
//     no DOM measurement) to the visitor's pick, and AcademyStamp settles
//     in at rest.
//   - Nominees render in their final, real state from the start — one
//     focal motion moment, not a second simultaneous nominee-list swap.
//   - The card plays the same one-shot arrival glow (award-year-enter /
//     award-year-arrived) real /awards year-sections get on scroll-into-view.
// Respects reducedMotion: renders the settled "reawarded" state immediately.

import { useEffect, useRef, useState } from "react";
import { Trophy } from "lucide-react";
import MovieSearchPicker from "@/components/home/MovieSearchPicker";
import AwardCard from "@/components/home/AwardCard";
import MovieCard from "@/components/award/MovieCard";
import { useMotionReveal } from "@/hooks/useMotionReveal";
import type { Movie } from "@/types/types";
import type { AcademyStatusResult } from "@/data/officialAwardWinners";

const R2 = "https://pub-6b3a2dfce3484ea291e496348a19d788.r2.dev/posters";
const FIXED_CREATED_AT = "2026-01-01T00:00:00.000Z";

function makeMovie(id: string, title: string, rating: number): Movie {
  const posterUrl = `${R2}/${id}.jpg`;
  return {
    id,
    title,
    release_year: 2025,
    poster_url: posterUrl,
    thumb_url: posterUrl,
    created_at: FIXED_CREATED_AT,
    rankings: [{ seen_it: true, ranking: rating, user_id: "mockup" }],
  };
}

// Real 2025 titles + real DB ids/posters — same curated demo year as before,
// not tied to the visiting user's own data.
const ONE_BATTLE = makeMovie("fb4f7c6c-efa9-4bb2-9698-f1d9d83299d1", "One Battle After Another", 9);
const SINNERS = makeMovie("1659d7dd-dcda-4d25-a5d2-c2dbd5b9e9e8", "Sinners", 10);
const HAMNET = makeMovie("8d923f0d-a395-4ec3-9a65-17710ca4c905", "Hamnet", 8);
const MARTY_SUPREME = makeMovie("91f59cd0-af51-4c50-a9f1-bd1959e6fa1b", "Marty Supreme", 8);
const HOUSE_OF_DYNAMITE = makeMovie("0772e4f6-01ef-459f-adf7-3b81971f8c7c", "A House of Dynamite", 7);
const WICKED_FOR_GOOD = makeMovie("df23fd76-3087-4f22-91f3-0dfe788f1546", "Wicked: For Good", 8);
const KPOP_DEMON_HUNTERS = makeMovie("fb95f933-0c39-4c7f-90c1-e82fd05062be", "KPop Demon Hunters", 9);

// Final, real nominee set — shown from the start, unanimated. Only the
// winner slot crosses over from the Academy's pick to the visitor's.
const NOMINEES = [ONE_BATTLE, SINNERS, HAMNET, MARTY_SUPREME, HOUSE_OF_DYNAMITE, WICKED_FOR_GOOD, KPOP_DEMON_HUNTERS];

const REAWARDED_STATUS: AcademyStatusResult = {
  status: "reawarded",
  intensity: "loud",
  officialTitle: "One Battle After Another",
};

/**
 * The settled "reawarded" state of the demo year, as plain data.
 *
 * NativeGuestHome renders the same 2025 card as its proof slot but without the
 * crossfade (one screen, no scroll choreography). Exported so the demo year is
 * defined once rather than drifting between the web hero and the native screen.
 */
export const HERO_DEMO_PROOF = {
  year: 2025,
  winnerTitle: SINNERS.title,
  winnerPoster: SINNERS.poster_url,
  winnerMovieId: SINNERS.id,
  nomineeCount: NOMINEES.length,
} as const;

const HOLD_MS = 1100;
const CROSSFADE_MS = 550;

interface HeroRevealProps {
  reducedMotion: boolean;
  onSelectMovie: (movie: Movie) => void;
}

export default function HeroReveal({ reducedMotion, onSelectMovie }: HeroRevealProps) {
  const [reawarded, setReawarded] = useState(reducedMotion);
  const cardRef = useRef<HTMLDivElement>(null);
  const arrived = useMotionReveal(reducedMotion, cardRef);

  // Hold starts once the card has actually scrolled into view, not at
  // mount — otherwise the swap can finish before a visitor on a shorter
  // viewport (where the card sits below the headline/search) ever scrolls
  // down far enough to see the "before" state at all.
  useEffect(() => {
    if (reducedMotion || reawarded || !arrived) return;
    const t = window.setTimeout(() => setReawarded(true), HOLD_MS);
    return () => window.clearTimeout(t);
  }, [reducedMotion, reawarded, arrived]);

  return (
    <div className="flex flex-col">
      {/* ─── Headline + search — visible from first paint, never gated
          behind the card's own crossfade ─── */}
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
        {/* Social proof, folded up from the retired PanelHook — the one line
            in that panel making an argument the hero doesn't already make.
            See docs/design/logged-out-native-home.md (web funnel, 6 → 3). */}
        <p className="mt-3 max-w-xl mx-auto text-sm text-gray-500">
          The 2010 Academy chose <em className="not-italic text-gray-400">The King&apos;s Speech</em>.
          Most of the internet disagreed.
        </p>
      </div>

      <div className="pt-6 pb-2 px-4 text-center">
        <div className="home-hero__search mx-auto" style={{ maxWidth: 560 }}>
          <MovieSearchPicker
            onSelect={onSelectMovie}
            placeholder="Search for a film you've watched"
            className="home-search-picker"
          />
          <p className="home-hero__microcopy">No account needed to get started.</p>
        </div>
      </div>

      {/* ─── The card — same YearSection scaffold real /awards renders
          (rotated year label + dot rail + dark-glass card), reused as-is,
          not reinvented. No max-width here — AppShell's <main> already
          caps content at max-w-screen-xl. ─── */}
      <div className="flex flex-col justify-center px-4 py-10">
        <div
          ref={cardRef}
          className={`relative flex flex-col gap-3 md:flex-row md:gap-8 award-year-enter ${arrived ? "award-year-arrived" : ""}`}
        >
          <h2 className="hidden md:block md:absolute top-0 md:top-[125px] left-0 text-3xl font-bold text-gray-400 mt-2 md:rotate-[-90deg] origin-left font-['Unbounded'] tracking-widest">
            2025
          </h2>
          <div className="top-0 bottom-0 flex-col items-center hidden md:absolute md:flex left-4">
            <div className="w-5 h-5 mt-2 rounded-full bg-gray-400 border-2 border-gray-800" />
            <div className="w-[2px] flex-1 bg-gray-600" />
          </div>
          <div className="hidden md:inline-block w-0 md:w-[20px] shrink-0" />

          <div className="award-editable-section relative flex flex-col w-full rounded-2xl shadow-md dark-glass p-4 md:p-8 overflow-hidden">
            <div className="flex flex-col gap-6 md:flex-row md:gap-8">
              {/* Winner column — same real AwardCard for both breakpoints,
                  matching EditableYearSection's desktop treatment (the old
                  hero's desktop path used a plain WinnerCard here, with no
                  gold-frame ceremony). */}
              <div className="w-full md:w-1/3">
                <div className="hidden md:flex items-center gap-2 mb-3">
                  <Trophy className="w-3.5 h-3.5 text-gold-500/60" />
                  <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-gold-500/60">Best Picture</p>
                </div>
                {/* Capped narrower than AwardCard's own 360px ceiling on
                    mobile — at full width the poster (aspect 2:3) ran
                    taller than a phone viewport could show alongside the
                    headline/search above it, so the crossfade played
                    partly or fully off-screen. Desktop keeps the real cap. */}
                <div className="relative flex justify-center md:block max-w-[210px] mx-auto md:max-w-none md:mx-0">
                  {/* Before layer — Academy's actual pick, normal flow,
                      establishes the box size. Fades out on reawarded. */}
                  <div
                    aria-hidden={reawarded || undefined}
                    inert={reawarded ? true : undefined}
                    style={{
                      opacity: reawarded ? 0 : 1,
                      transition: `opacity ${CROSSFADE_MS}ms var(--home-ease, ease)`,
                    }}
                  >
                    <AwardCard
                      year={2025}
                      winnerTitle={ONE_BATTLE.title}
                      winnerPoster={ONE_BATTLE.poster_url}
                      winnerMovieId={ONE_BATTLE.id}
                      nomineeCount={NOMINEES.length}
                      fullWidth
                      academyStatus={null}
                    />
                  </div>
                  {/* After layer — visitor's real pick, absolute overlay.
                      Fades in on reawarded; inert until then so it never
                      steals keyboard focus from the visible layer. */}
                  <div
                    className="absolute inset-0"
                    aria-hidden={!reawarded || undefined}
                    inert={reawarded ? undefined : true}
                    style={{
                      opacity: reawarded ? 1 : 0,
                      transition: `opacity ${CROSSFADE_MS}ms var(--home-ease, ease)`,
                      pointerEvents: reawarded ? "auto" : "none",
                    }}
                  >
                    <AwardCard
                      year={2025}
                      winnerTitle={SINNERS.title}
                      winnerPoster={SINNERS.poster_url}
                      winnerMovieId={SINNERS.id}
                      nomineeCount={NOMINEES.length}
                      fullWidth
                      academyStatus={REAWARDED_STATUS}
                    />
                  </div>
                </div>
              </div>

              <div className="hidden w-px bg-white/10 md:block" />

              {/* Nominees column — desktop only, final real set from the
                  start (see file header: one focal motion moment, not two). */}
              <div className="hidden md:block md:w-2/3">
                <div className="flex items-baseline gap-3 mb-3">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-gray-500">Nominees</p>
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-sm font-medium tabular-nums text-gray-300">
                    {NOMINEES.length}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {NOMINEES.map((movie) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      variant="grid"
                      isWinner={reawarded ? movie.id === SINNERS.id : movie.id === ONE_BATTLE.id}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

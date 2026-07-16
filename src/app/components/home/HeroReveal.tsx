"use client";

// Replaces HomeHero + PanelPremise on the logged-out homepage. Instead of
// opening on an empty search box, it leads with a real Awards-card reveal
// (built from the same production components as EditableYearSection —
// AwardCard, WinnerCard, MovieCard, AcademyStamp — not a bespoke marketing
// panel) before asking the visitor to act. See PRODUCT_DECISION_LOG for the
// July 2026 "show the payoff before the prompt" direction.
//
// Staged reveal sequence:
//   0. On load: "Ever disagree with the Academy?" (compact, gold) is visible
//      immediately, above where the real headline will land. Below it, the
//      awards card plays its own four steps:
//        1. Hold — real 2025 Academy nominees, One Battle After Another as
//           winner.
//        2. Wicked: For Good + KPop Demon Hunters just appear in place of
//           The Secret Agent + It Was Just an Accident. Winner unchanged.
//        3. The winner drag-and-drop: Sinners and One Battle physically
//           slide/cross between the winner slot and the nominee grid — the
//           same FLIP technique used for Forrest Gump → Shawshank, retargeted
//           at this real card layout. Desktop only; mobile cuts straight to
//           the settled state (still gets the stamp).
//        4. The "Reawarded" stamp slams in with an overshoot, like a rubber
//           stamp coming down.
//   1. Once the card settles, the intro line fades out and the real header
//      ("The Academy had its say. Now so do you.") + closing line collapse in
//      together, right where the intro line was.
//   2. Once that settles, the real search collapses in below the header,
//      above the card.
// Respects reducedMotion: skips straight to the fully settled state with no
// timers/slide/stamp animation, matching the rest of the home panels.

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import gsap from "gsap";
import MovieSearchPicker from "@/components/home/MovieSearchPicker";
import AwardCard from "@/components/home/AwardCard";
import WinnerCard from "@/components/award/WinnerCard";
import MovieCard from "@/components/award/MovieCard";
import AcademyStamp from "@/components/award/AcademyStamp";
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

// Real 2025 titles + real DB ids/posters. A curated fixed demo year, same
// pattern as PanelHook's 2010 King's Speech/Social Network comparison — not
// tied to the visiting user's own data.
const ONE_BATTLE = makeMovie("fb4f7c6c-efa9-4bb2-9698-f1d9d83299d1", "One Battle After Another", 9);
const SINNERS = makeMovie("1659d7dd-dcda-4d25-a5d2-c2dbd5b9e9e8", "Sinners", 10);
const HAMNET = makeMovie("8d923f0d-a395-4ec3-9a65-17710ca4c905", "Hamnet", 8);
const MARTY_SUPREME = makeMovie("91f59cd0-af51-4c50-a9f1-bd1959e6fa1b", "Marty Supreme", 8);
const HOUSE_OF_DYNAMITE = makeMovie("0772e4f6-01ef-459f-adf7-3b81971f8c7c", "A House of Dynamite", 7);
const SECRET_AGENT = makeMovie("f78b7458-dacc-4381-97d5-afb7b8e6678e", "The Secret Agent", 7);
const JUST_AN_ACCIDENT = makeMovie("acaa6cef-ea9c-4fd6-8359-85075cfcc8e7", "It Was Just an Accident", 7);
const WICKED_FOR_GOOD = makeMovie("df23fd76-3087-4f22-91f3-0dfe788f1546", "Wicked: For Good", 8);
const KPOP_DEMON_HUNTERS = makeMovie("fb95f933-0c39-4c7f-90c1-e82fd05062be", "KPop Demon Hunters", 9);

// Step 0 — the real Academy's 2025 Best Picture nominee conversation.
const ACADEMY_NOMINEES = [ONE_BATTLE, SINNERS, HAMNET, MARTY_SUPREME, HOUSE_OF_DYNAMITE, SECRET_AGENT, JUST_AN_ACCIDENT];
const ACADEMY_WINNER = ONE_BATTLE;

// Step 1 — Wicked: For Good + KPop Demon Hunters just appear in place of The
// Secret Agent + It Was Just an Accident. Winner hasn't changed yet.
const NOMINEES_SWAPPED = [ONE_BATTLE, SINNERS, HAMNET, MARTY_SUPREME, HOUSE_OF_DYNAMITE, WICKED_FOR_GOOD, KPOP_DEMON_HUNTERS];

// Step 2/3 — Sinners promoted to winner (drag-and-drop slide), stamp slams in.
const REAWARDED_NOMINEES = [SINNERS, ONE_BATTLE, HAMNET, MARTY_SUPREME, HOUSE_OF_DYNAMITE, WICKED_FOR_GOOD, KPOP_DEMON_HUNTERS];
const REAWARDED_WINNER = SINNERS;

const REAWARDED_STATUS: AcademyStatusResult = {
  status: "reawarded",
  intensity: "loud",
  officialTitle: "One Battle After Another",
};

const HOLD_BEFORE_SWAP_MS = 1800;
const NOMINEES_SWAP_SETTLE_MS = 900;
const SLIDE_DURATION_S = 0.9;
const SETTLE_AFTER_SWAP_MS = 700;
const SETTLE_AFTER_HEADLINE_MS = 1400;

// Poster boxes are always aspect-[2/3] (see MovieCard's FeaturedCard/GridCard)
// with the title sitting below — derive just the poster sub-rect from the
// full container rect so the sliding clone doesn't drag the title along.
function posterRectFromContainer(el: HTMLElement): DOMRect {
  const rect = el.getBoundingClientRect();
  const posterHeight = rect.width * 1.5;
  return new DOMRect(rect.left, rect.top, rect.width, Math.min(posterHeight, rect.height));
}

// Animates both directions: mounts + grows in when `show` flips true, and
// shrinks back out (rather than snapping away) when it flips back to false.
// If `show` is already true on first render (reducedMotion skip-ahead), it
// mounts already expanded — no animation plays.
function CollapseIn({
  show,
  durationMs = 700,
  children,
}: {
  show: boolean;
  durationMs?: number;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(show);
  const [expanded, setExpanded] = useState(show);

  useEffect(() => {
    if (show) {
      setMounted(true);
      const raf1 = requestAnimationFrame(() => {
        requestAnimationFrame(() => setExpanded(true));
      });
      return () => cancelAnimationFrame(raf1);
    }
    setExpanded(false);
    const t = window.setTimeout(() => setMounted(false), durationMs);
    return () => window.clearTimeout(t);
  }, [show, durationMs]);

  if (!mounted) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: expanded ? "1fr" : "0fr",
        opacity: expanded ? 1 : 0,
        transition: `grid-template-rows ${durationMs}ms cubic-bezier(0.22,1,0.36,1), opacity ${durationMs}ms ease`,
      }}
    >
      <div style={{ overflow: "hidden", minHeight: 0 }}>{children}</div>
    </div>
  );
}

function AwardsCardReveal({
  reducedMotion,
  onSettled,
}: {
  reducedMotion: boolean;
  onSettled: () => void;
}) {
  const [phase, setPhase] = useState<"before" | "nomineesSwapped" | "swapping" | "after">(
    reducedMotion ? "after" : "before"
  );
  const [overlayRects, setOverlayRects] = useState<{ winner: DOMRect; challenger: DOMRect } | null>(null);

  const winnerBoxRef = useRef<HTMLDivElement>(null);
  const challengerBoxRef = useRef<HTMLDivElement>(null);
  const overlayWinnerRef = useRef<HTMLDivElement>(null);
  const overlayChallengerRef = useRef<HTMLDivElement>(null);
  const stampWrapperRef = useRef<HTMLDivElement>(null);

  // Step 0 → 1: hold, then let Wicked/KPop appear.
  useEffect(() => {
    if (reducedMotion) return;
    const holdTimer = window.setTimeout(() => setPhase("nomineesSwapped"), HOLD_BEFORE_SWAP_MS);
    return () => window.clearTimeout(holdTimer);
  }, [reducedMotion]);

  // Step 1 → 2: brief settle, then measure the two real poster boxes and
  // kick off the winner slide.
  useEffect(() => {
    if (reducedMotion || phase !== "nomineesSwapped") return;
    const t = window.setTimeout(() => {
      const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
      const winnerEl = winnerBoxRef.current;
      const challengerEl = challengerBoxRef.current;
      if (!isDesktop || !winnerEl || !challengerEl) {
        setPhase("after");
        return;
      }
      setOverlayRects({
        winner: posterRectFromContainer(winnerEl),
        challenger: posterRectFromContainer(challengerEl),
      });
      setPhase("swapping");
    }, NOMINEES_SWAP_SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [phase, reducedMotion]);

  // Drive the actual GSAP slide once both overlay clones are mounted.
  useEffect(() => {
    if (phase !== "swapping" || !overlayRects) return;
    const winnerEl = overlayWinnerRef.current;
    const challengerEl = overlayChallengerRef.current;
    if (!winnerEl || !challengerEl) {
      setPhase("after");
      return;
    }

    const { winner: winnerRect, challenger: challengerRect } = overlayRects;

    gsap.set(winnerEl, {
      position: "fixed",
      top: winnerRect.top,
      left: winnerRect.left,
      width: winnerRect.width,
      height: winnerRect.height,
      margin: 0,
    });
    gsap.set(challengerEl, {
      position: "fixed",
      top: challengerRect.top,
      left: challengerRect.left,
      width: challengerRect.width,
      height: challengerRect.height,
      margin: 0,
    });

    const tl = gsap.timeline({
      onComplete: () => {
        setPhase("after");
        setOverlayRects(null);
      },
    });
    // One Battle shrinks from the winner slot into the challenger's grid cell...
    tl.to(
      winnerEl,
      {
        top: challengerRect.top,
        left: challengerRect.left,
        width: challengerRect.width,
        height: challengerRect.height,
        duration: SLIDE_DURATION_S,
        ease: "power2.inOut",
      },
      0
    );
    // ...while Sinners grows from its grid cell into the winner slot.
    tl.to(
      challengerEl,
      {
        top: winnerRect.top,
        left: winnerRect.left,
        width: winnerRect.width,
        height: winnerRect.height,
        duration: SLIDE_DURATION_S,
        ease: "power2.inOut",
      },
      0
    );

    return () => {
      tl.kill();
    };
  }, [phase, overlayRects]);

  // Step 3: the stamp slams in — starts big, rotated, and invisible, then
  // punches down to rest with an overshoot, like an actual rubber stamp.
  useEffect(() => {
    if (phase !== "after") return;
    if (!reducedMotion) {
      const el = stampWrapperRef.current;
      if (el) {
        gsap.fromTo(
          el,
          { scale: 2.6, opacity: 0, rotate: 14 },
          { scale: 1, opacity: 1, rotate: 0, duration: 0.55, ease: "back.out(2.4)" }
        );
      }
    }
    const t = window.setTimeout(onSettled, reducedMotion ? 0 : SETTLE_AFTER_SWAP_MS);
    return () => window.clearTimeout(t);
  }, [phase, onSettled, reducedMotion]);

  // "before" and "nomineesSwapped" both show One Battle as winner — the
  // winner only actually changes once the slide completes ("after").
  const winner = phase === "after" ? REAWARDED_WINNER : ACADEMY_WINNER;
  const nominees =
    phase === "before" ? ACADEMY_NOMINEES : phase === "after" ? REAWARDED_NOMINEES : NOMINEES_SWAPPED;
  const academyStatus = phase === "after" ? REAWARDED_STATUS : null;
  const nomineeCount = nominees.length;
  const isSwapping = phase === "swapping";
  // Sinners is still a plain nominee (not yet winner) during before/swapped/swapping.
  const showingBefore = phase !== "after";

  return (
    <>
      {/* Outer wrapper matches the real per-year timeline treatment (see
          src/components/award/YearSection.tsx lines 46-59) — vertical rotated
          year label + dot-and-line rail to the left of the card, exactly as
          it renders on the real Awards archive. Not reinvented, just reused. */}
      <div className="relative flex flex-col gap-3 md:flex-row md:gap-8">
        <h2 className="hidden md:block md:absolute top-0 md:top-[125px] left-0 text-3xl font-bold text-gray-400 mt-2 md:rotate-[-90deg] origin-left font-['Unbounded'] tracking-widest">
          2025
        </h2>
        <div className="top-0 bottom-0 flex-col items-center hidden md:absolute md:flex left-4">
          <div className="w-5 h-5 mt-2 rounded-full bg-gray-400 border-2 border-gray-800" />
          <div className="w-[2px] flex-1 bg-gray-600" />
        </div>
        <div className="hidden md:inline-block w-0 md:w-[20px] shrink-0" />

        <div className="award-editable-section relative flex flex-col w-full rounded-xl shadow-md dark-glass p-4 md:p-8 overflow-hidden">
          <div className="relative flex flex-col gap-6 md:flex-row md:gap-8">
            {/* Academy stamp — slams in once the reawarding has happened */}
            <div
              ref={stampWrapperRef}
              className="pointer-events-none absolute -bottom-10 left-[20%] z-10 hidden md:block"
            >
              <AcademyStamp academyStatus={academyStatus} />
            </div>

            {/* Winner column */}
            <div className="w-full md:w-1/3">
              <div className="hidden md:flex items-center gap-2 mb-3">
                <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-gold-500/60">Best Picture</span>
              </div>
              <div className="flex justify-center md:hidden">
                <AwardCard
                  year={2025}
                  winnerTitle={winner.title}
                  winnerPoster={winner.poster_url}
                  winnerMovieId={winner.id}
                  nomineeCount={nomineeCount}
                />
              </div>
              <div
                ref={winnerBoxRef}
                className="hidden md:block"
                style={{ opacity: isSwapping ? 0 : 1 }}
              >
                <WinnerCard movie={winner} hideRating />
              </div>
            </div>

            <div className="hidden w-px bg-gray-700/40 md:block" />

            {/* Nominees column */}
            <div className="w-full md:w-2/3">
              <div className="flex items-baseline gap-3 mb-3">
                <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-gray-500">Nominees</p>
                {nomineeCount >= 10 ? (
                  <span className="text-sm font-medium text-emerald-400">Full Ballot</span>
                ) : (
                  <span className="font-mono text-sm font-medium tabular-nums text-gray-400">{nomineeCount}</span>
                )}
              </div>
              <div className="hidden md:grid md:grid-cols-5 gap-2">
                {nominees.map((movie) => {
                  const isChallenger = movie.id === SINNERS.id && showingBefore;
                  return (
                    <div
                      key={movie.id}
                      ref={isChallenger ? challengerBoxRef : undefined}
                      style={{ opacity: isChallenger && isSwapping ? 0 : 1 }}
                    >
                      <MovieCard movie={movie} variant="grid" isWinner={winner.id === movie.id} />
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col gap-2 md:hidden">
                {nominees.map((movie, index) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    variant="compact"
                    rank={index + 1}
                    isWinner={winner.id === movie.id}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sliding overlay clones — fixed to the viewport so the card's own
          overflow-hidden doesn't clip them mid-flight. Poster art only, no
          title (matches ReawardAnimation precedent: titles crossfade in
          place, only the art physically travels). */}
      {overlayRects && (
        <>
          <div
            ref={overlayWinnerRef}
            className="pointer-events-none rounded-xl overflow-hidden shadow-2xl shadow-black/60"
            style={{ zIndex: 200 }}
          >
            <img
              src={ACADEMY_WINNER.poster_url}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
          <div
            ref={overlayChallengerRef}
            className="pointer-events-none rounded-lg overflow-hidden shadow-2xl shadow-black/60"
            style={{ zIndex: 200 }}
          >
            <img
              src={SINNERS.poster_url}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        </>
      )}
    </>
  );
}

interface HeroRevealProps {
  reducedMotion: boolean;
  onSelectMovie: (movie: Movie) => void;
}

export default function HeroReveal({ reducedMotion, onSelectMovie }: HeroRevealProps) {
  // 0 = reveal only · 1 = + headline · 2 = + big search
  const [stage, setStage] = useState<0 | 1 | 2>(reducedMotion ? 2 : 0);

  const handleRevealSettled = useCallback(() => {
    setStage((s) => (s < 1 ? 1 : s));
  }, []);

  useEffect(() => {
    if (reducedMotion || stage !== 1) return;
    const t = window.setTimeout(() => setStage(2), SETTLE_AFTER_HEADLINE_MS);
    return () => window.clearTimeout(t);
  }, [stage, reducedMotion]);

  return (
    <div className="flex flex-col">
      {/* ─── Text block — question visible from load, above the header.
          Header + closing line collapse in below it together, once the
          reveal card settles ─── */}
      <div className="max-w-4xl mx-auto text-center px-4 pt-10 pb-4">
        <CollapseIn show={stage < 1} durationMs={500}>
          <h2
            className="font-unbounded font-normal text-gold-400 sm:whitespace-nowrap"
            style={{ fontSize: "clamp(1rem, 2vw, 1.25rem)", letterSpacing: "-0.005em" }}
          >
            Ever disagree with the Academy?
          </h2>
        </CollapseIn>
        <CollapseIn show={stage >= 1}>
          <h1
            className="home-headline font-unbounded sm:whitespace-nowrap"
            style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
          >
            The Academy had its say.
            <br />
            Now so do you.
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-base text-white/80">
            Rate the films you&apos;ve seen, reaward your own nominees — and your
            own winner.
          </p>
        </CollapseIn>
      </div>

      {/* ─── Search — collapses in below the headline block, above the
          reveal card, once the headline has settled ─── */}
      <CollapseIn show={stage >= 2}>
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
      </CollapseIn>

      {/* ─── The reveal itself, always present, plays on load ───
          No max-width here — AppShell's <main> already caps content at
          max-w-screen-xl; the card should fill that same column like the
          real Awards page does, not get boxed into a narrower one. ─── */}
      <div className="flex flex-col justify-center px-4 py-10">
        <AwardsCardReveal reducedMotion={reducedMotion} onSettled={handleRevealSettled} />
      </div>
    </div>
  );
}

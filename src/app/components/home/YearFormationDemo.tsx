"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type YearFormationDemoProps = {
  year: number;
  primaryFilm: string;
  reducedMotion?: boolean;
};

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * Films are ordered by stagger position — Inception (primary/winner) sits in
 * the centre slot so it emerges from among peers, not as an upfront anchor.
 * Posters confirmed present in /public/posters/.
 */
const FILMS = [
  {
    title: "The Social Network",
    poster: "/posters/the-social-network-2010.jpg",
    cell: "col-start-1 row-start-1",
  },
  {
    title: "Inception",
    poster: "/posters/inception-2010.jpg",
    cell: "col-start-2 row-start-1",
    isPrimary: true,
  },
  {
    title: "The King's Speech",
    poster: "/posters/the-king-s-speech-2010.jpg",
    cell: "col-start-3 row-start-1",
  },
  {
    title: "Black Swan",
    poster: "/posters/black-swan-2010.jpg",
    cell: "col-start-1 row-start-2",
  },
  {
    title: "True Grit",
    poster: "/posters/true-grit-2010.jpg",
    cell: "col-start-2 row-start-2",
  },
  {
    // Fills the bottom-right slot — no more dashed empty placeholder
    title: "The Fighter",
    poster: "/posters/the-fighter-2010.jpg",
    cell: "col-start-3 row-start-2",
  },
];

export default function YearFormationDemo({
  year,
  primaryFilm,
  reducedMotion = false,
}: YearFormationDemoProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  /** Winner label — "▲ Your {year} winner" — appears below the grid after cards settle */
  const primaryLabelRef = useRef<HTMLDivElement | null>(null);
  /** Absolute overlay div that carries the animated gold border on the primary card */
  const winnerOverlayRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef<HTMLParagraphElement | null>(null);

  useLayoutEffect(() => {
    if (reducedMotion || !rootRef.current) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const panel = rootRef.current?.closest<HTMLElement>("#panel-how-it-works");
      const winnerOverlay = winnerOverlayRef.current;
      const primaryLabel = primaryLabelRef.current;
      const status = statusRef.current;
      // All 5 film cards — selected by shared attribute; order matches FILMS array (DOM order)
      const allCards = gsap.utils.toArray<HTMLElement>("[data-hiw-card]");

      if (!panel || !winnerOverlay || !primaryLabel || !status || allCards.length === 0) return;

      // ── Initial state: everything invisible ──────────────────────────────
      gsap.set(allCards, { autoAlpha: 0, scale: 0.94, y: 16 });
      gsap.set(winnerOverlay, { autoAlpha: 0 });
      gsap.set(primaryLabel, { autoAlpha: 0, y: 8 });
      gsap.set(status, { autoAlpha: 0, y: 10 });

      const tl = gsap.timeline({ defaults: { ease: EASE } });

      // ── Phase 1: films accumulate one by one (equal treatment, no spotlight) ──
      tl.to(allCards, {
        autoAlpha: 1,
        scale: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.22,   // sequential — feels like films "arriving" over time
      })

      // ── Phase 2: scroll dwell — gives the eye a moment to register the full grid ──
      .to({}, { duration: 0.45 })

      // ── Phase 3: winner highlight emerges on its own, no user action ──────
      .to(winnerOverlay, { autoAlpha: 1, duration: 0.9 }, "+=0.2")
      // Winner label rises just below primary card's column
      .to(primaryLabel, { autoAlpha: 1, y: 0, duration: 0.7 }, "<0.15")

      // ── Phase 4: status line confirms the system did this ─────────────────
      .to(status, { autoAlpha: 1, y: 0, duration: 0.72 }, "+=0.1");

      ScrollTrigger.create({
        trigger: panel,
        start: "top top",
        // Keep handoff clean: unpin exactly when this section's bottom reaches the top.
        end: "bottom top",
        pin: true,
        pinSpacing: true,
        scrub: 1,
        animation: tl,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        refreshPriority: 25,
        preventOverlaps: "home-panels",
      });
    }, rootRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <div
      ref={rootRef}
      className="relative w-full overflow-hidden rounded-2xl border border-[#d4af3726] bg-[rgba(10,16,31,0.92)] p-4 sm:p-6"
      aria-label={`Year formation demo for ${year}`}
    >
      {/* Panel chrome: year label + tab label */}
      <div className="mb-4 flex items-center justify-between">
        <span className="font-[var(--font-unbounded,_Unbounded,_sans-serif)] text-xs font-bold tracking-[0.16em] text-[#d4af37]">
          {year}
        </span>
        <span className="text-[11px] uppercase tracking-[0.14em] text-white/45">Year Explorer</span>
      </div>

      {/* Inner card grid ─────────────────────────────────────────────────── */}
      <div className="relative mx-auto w-full max-w-[470px] rounded-xl border border-white/10 bg-[#0d1428] p-3 sm:p-4">

        {/* Placeholder slots — static, always visible beneath the film cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`placeholder-${i}`}
              className="aspect-[2/3] rounded-md border border-dashed border-white/20 bg-white/[0.03]"
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Film cards — absolutely overlaid on the same grid ───────────── */}
        <div className="pointer-events-none absolute inset-3 grid grid-cols-3 gap-2 sm:inset-4 sm:gap-3">
          {FILMS.map((film) => {
            const isPrimary = film.isPrimary === true;
            // Reduced-motion: render all cards in final state immediately
            const baseOpacity = reducedMotion ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-4";

            return (
              <div
                key={film.title}
                data-hiw-card="true"
                className={`${film.cell} ${baseOpacity}`}
              >
                {/* Base poster card — no border (border is on the winner overlay) */}
                <div className="relative h-full w-full overflow-hidden rounded-md border border-white/20 bg-black/30">
                  <img
                    src={film.poster}
                    alt={film.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />

                  {/* Winner overlay: animated gold border + glow, layered on top of poster.
                      Only rendered for the primary card; starts invisible, GSAP reveals it. */}
                  {isPrimary && (
                    <div
                      ref={winnerOverlayRef}
                      className={`absolute inset-0 rounded-md border-2 border-[#d4af37] shadow-[0_0_0_1px_rgba(212,175,55,0.3),_0_0_16px_2px_rgba(212,175,55,0.18)] ${
                        reducedMotion ? "opacity-100" : "opacity-0"
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Winner label — rises below the grid once winner border appears.
            Positioned below the centre column (col 2) where Inception sits. */}
        <div
          ref={primaryLabelRef}
          className={`mt-3 flex justify-center text-xs font-semibold text-[#d4af37] ${
            reducedMotion ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
          aria-live="polite"
        >
          ▲ Your {year} winner
        </div>
      </div>

      {/* Status line — confirms the system did this automatically */}
      <p
        ref={statusRef}
        className={`mt-4 text-center text-sm text-white/72 ${
          reducedMotion ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        Winner emerges from your ratings.
      </p>
    </div>
  );
}

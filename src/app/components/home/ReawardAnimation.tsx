"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionReveal } from "@/hooks/useMotionReveal";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface MovieCard {
  title: string;
  posterUrl: string;
}

export interface ReawardAnimationProps {
  year: string | number;
  /** The original Oscar winner — visually starts in the center winner slot */
  originalWinner: MovieCard;
  /** The ReAwarded winner — starts in contenders, then moves to center */
  newWinner: MovieCard;
  /** Other contenders (not involved in the swap, shown as small cards) */
  contenders: MovieCard[];
  reducedMotion?: boolean;
  /** Panel id — defaults to "panel-premise" for backward compatibility */
  panelId?: string;
  /** Section headline — defaults to the Premise headline */
  headline?: string;
  /** Section body copy — defaults to the Premise body */
  body?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the pixel center of a bounding rect */
function center(rect: DOMRect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function normalizeImageSrc(src: string): string {
  if (!src) return src;

  try {
    // Unwrap URLs that were already passed through Next's image optimizer.
    if (src.includes("/_next/image")) {
      const parsed = new URL(src, "https://reawarding.com");
      const originalUrl = parsed.searchParams.get("url");
      if (originalUrl) return decodeURIComponent(originalUrl);
    }
  } catch {
    // Fall through to original value if parsing fails.
  }

  return src;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReawardAnimation({
  year,
  originalWinner,
  newWinner,
  contenders,
  reducedMotion = false,
  panelId = "panel-premise",
  headline = "Revisit film history—through your eyes.",
  body = "Every year has winners. Not every year feels settled. ReAwarding lets you step in—with personal taste and the vantage of hindsight—to correct the record.",
}: ReawardAnimationProps) {
  const sectionRef = useRef<HTMLElement>(null);

  // Animated card refs — both rendered in their INITIAL positions
  const origCardRef = useRef<HTMLDivElement>(null);   // FG  → winner zone
  const newCardRef  = useRef<HTMLDivElement>(null);   // SR  → contenders zone

  // Caption refs — both stacked in the winner zone
  const oscarCaptionRef    = useRef<HTMLSpanElement>(null);
  const rewardedCaptionRef = useRef<HTMLSpanElement>(null);

  // Badge on SR card (hidden until swap complete)
  const rewardedBadgeRef = useRef<HTMLSpanElement>(null);
  const winnerTitleOriginalRef = useRef<HTMLSpanElement>(null);
  const winnerTitleNewRef = useRef<HTMLSpanElement>(null);
  const contenderTitleNewRef = useRef<HTMLSpanElement>(null);
  const contenderTitleOriginalRef = useRef<HTMLSpanElement>(null);

  const revealThreshold = panelId === "panel-hook" ? 0.28 : 0.1;
  const panelVisible = useMotionReveal(reducedMotion, sectionRef, revealThreshold);
  // Track which poster titles have failed to load — keyed by movie title
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const markImgError = (title: string) =>
    setImgErrors((prev) => { const next = new Set(prev); next.add(title); return next; });

  // ── GSAP ScrollTrigger setup ────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    const section         = sectionRef.current;
    const origCard        = origCardRef.current;
    const newCard         = newCardRef.current;
    const oscarCaption    = oscarCaptionRef.current;
    const rewardedCaption = rewardedCaptionRef.current;
    const rewardedBadge   = rewardedBadgeRef.current;
    const winnerTitleOriginal = winnerTitleOriginalRef.current;
    const winnerTitleNew = winnerTitleNewRef.current;
    const contenderTitleNew = contenderTitleNewRef.current;
    const contenderTitleOriginal = contenderTitleOriginalRef.current;

    if (
      !section ||
      !origCard ||
      !newCard ||
      !winnerTitleOriginal ||
      !winnerTitleNew ||
      !contenderTitleNew ||
      !contenderTitleOriginal ||
      !oscarCaption ||
      !rewardedCaption
    ) return;

    let ctx: gsap.Context | null = null;

    // Measure center positions before any transforms
    const raf = requestAnimationFrame(() => {
      const origRect   = origCard.getBoundingClientRect();
      const newRect    = newCard.getBoundingClientRect();
      const origCenter = center(origRect);
      const newCenter  = center(newRect);

      // SR travels from its contender position INTO the winner centerpoint
      const newDx = origCenter.x - newCenter.x;
      const newDy = origCenter.y - newCenter.y;

      // FG travels from winner INTO the contender centerpoint
      const origDx = newCenter.x - origCenter.x;
      const origDy = newCenter.y - origCenter.y;

      // Scale ratios — each card needs to END at the other's apparent size
      const growRatio   = origRect.width  / newRect.width;
      const shrinkRatio = (newRect.width  / origRect.width) * 0.88;
      const isHookPanel = panelId === "panel-hook";
      const pinStart = isHookPanel ? "top top+=24" : "top top";
      const pinEnd = isHookPanel
        ? "bottom top"
        : () => `+=${Math.round(window.innerHeight * 1.35)}`;
      const pinScrub = isHookPanel ? 1.2 : 1.5;
      const priority = panelId === "panel-premise" ? 30 : isHookPanel ? 22 : 10;

      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            pin: true,
            pinSpacing: true,
            scrub: pinScrub,
            anticipatePin: 1,
            start: pinStart,
            end: pinEnd,
            invalidateOnRefresh: true,
            refreshPriority: priority,
            preventOverlaps: "home-panels",
          },
        });

        // ── Phase 1 (0–25%): FG loses prominence ────────────────────
        tl.to(origCard, {
          opacity: 0.75,
          scale: 0.96,
          duration: 0.25,
        }, 0);

        // ── Phase 2 (20–78%): SR moves to winner zone + scales to fill it
        tl.to(newCard, {
          x: newDx,
          y: newDy,
          scale: growRatio,
          opacity: 1,
          zIndex: 20,
          duration: 0.58,
          ease: "power2.inOut",
        }, 0.20);

        // ── Phase 3 (25–78%): FG retreats + shrinks to contender size ─
        tl.to(origCard, {
          x: origDx,
          y: origDy,
          scale: shrinkRatio,
          opacity: 0.72,
          zIndex: 1,
          duration: 0.53,
          ease: "power2.inOut",
        }, 0.25);

        // ── Phase 4a (62–78%): oscar caption out ─────────────────────
        tl.to(oscarCaption, { opacity: 0, y: -10, duration: 0.16 }, 0.62);

        // ── Phase 4b (72–86%): rewarded caption in ───────────────────
        tl.to(rewardedCaption, { opacity: 1, y: 0, duration: 0.18 }, 0.72);

        // ── Phase 4c (66–78%): rewarded badge appears ────────────────
        if (rewardedBadge) {
          tl.to(rewardedBadge, { opacity: 1, scale: 1, duration: 0.18 }, 0.66);
        }

        // ── Phase 5 (68–84%): title flip/crossfade in place ──────────
        tl.to(
          [winnerTitleOriginal, contenderTitleNew],
          { opacity: 0, y: -8, rotateX: 65, duration: 0.16, ease: "power2.out" },
          0.68,
        );
        tl.to(
          [winnerTitleNew, contenderTitleOriginal],
          { opacity: 1, y: 0, rotateX: 0, duration: 0.2, ease: "power2.out" },
          0.74,
        );
      }, section);
    });

    return () => {
      cancelAnimationFrame(raf);
      ctx?.revert();
    };
  }, [panelId, reducedMotion]);

  // ── Reduced-motion: show final (swapped) state immediately ────────
  if (reducedMotion) {
    return (
      <section
        ref={sectionRef}
        id={panelId}
        data-panel-id={panelId}
        className="home-panel"
        aria-labelledby={`${panelId}-heading`}
      >
        <div className="home-panel__inner">
          <header className="space-y-6 max-w-3xl">
            <h2 id={`${panelId}-heading`} className="motion-reveal motion-reveal--visible">
              {headline}
            </h2>
            <p className="home-panel__body motion-reveal motion-reveal--visible" style={{ transitionDelay: "120ms" }}>
              {body}
            </p>
          </header>
          <AwardsStage
            year={year}
            winnerLabel={<><span>★</span> ReAwarded</>}
            winnerLabelClass="ra-side-heading ra-side-heading--rewarded"
            winnerCaption={<span className="ra-caption ra-caption--rewarded">{year} ReAwarded Winner</span>}
            winnerMovie={newWinner}
            winnerBadge={<span className="ra-badge ra-badge--rewarded">★ ReAwarded</span>}
            contenderMovies={[originalWinner, ...contenders]}
          />
        </div>
      </section>
    );
  }

  // ── Normal (animated) render ────────────────────────────────────────
  return (
    <section
      ref={sectionRef}
      id={panelId}
      data-panel-id={panelId}
      className="home-panel"
      aria-labelledby={`${panelId}-heading`}
    >
      <div className="home-panel__inner">
        <header className="space-y-6 max-w-3xl">
          <h2
            id={`${panelId}-heading`}
            className={`motion-reveal ${panelVisible ? "motion-reveal--visible" : ""}`}
          >
            {headline}
          </h2>
          <p
            className={`home-panel__body motion-reveal ${panelVisible ? "motion-reveal--visible" : ""}`}
            style={{ transitionDelay: panelVisible ? "120ms" : "0ms" }}
          >
            {body}
          </p>
        </header>

        {/* ── Awards-style glass card stage ─────────────────────── */}
        <div className="ra-stage-wrap">
          {/* Year label — rotated vertically on the left, matching Awards page */}
          <span className="ra-year-label" aria-hidden="true">{year}</span>
        <div
          className={`ra-stage motion-reveal motion-crossfade ${panelVisible ? "motion-reveal--visible" : ""}`}
          style={{ transitionDelay: panelVisible ? "240ms" : "0ms" }}
        >
          {/* ── LEFT: Winner column ─────────────────────────────── */}
          <div className="ra-winner-side">
            {/* Section heading — toggles caption as scroll progresses */}
            <div className="ra-side-head">
              <span className="ra-side-heading ra-side-heading--winner" aria-hidden>
                <span>🏆</span> Winner
              </span>
              {/* Animated caption crossfade */}
              <div className="ra-caption-wrap" aria-live="polite">
                <span ref={oscarCaptionRef} className="ra-caption">
                  {year} Award Winner
                </span>
                <span
                  ref={rewardedCaptionRef}
                  className="ra-caption ra-caption--rewarded"
                  style={{ opacity: 0, transform: "translateY(6px)" }}
                >
                  {year} ReAwarded Winner
                </span>
              </div>
            </div>

            {/*
             * FG poster — ref points to the image box only.
             * GSAP translates + shrinks it rightward into the contenders grid.
             */}
            <div className="ra-movie-item">
              <div
                ref={origCardRef}
                className="ra-poster-box ra-poster-box--winner"
                style={{ position: "relative", willChange: "transform, opacity", zIndex: 2 }}
              >
                {imgErrors.has(originalWinner.title) ? (
                  <div className="ra-poster-fallback">{originalWinner.title}</div>
                ) : (
                  <Image
                    src={normalizeImageSrc(originalWinner.posterUrl)}
                    alt={originalWinner.title}
                    fill
                    sizes="(max-width:640px) 40vw, 220px"
                    className="ra-poster-img"
                    priority
                    draggable={false}
                    onError={() => markImgError(originalWinner.title)}
                  />
                )}
                <div className="ra-poster-overlay" />
                <span className="ra-badge ra-badge--oscar">Academy Pick</span>
              </div>
              <p className="ra-movie-title" style={{ position: "relative", minHeight: "3.2em" }}>
                <span
                  ref={winnerTitleOriginalRef}
                  style={{ position: "absolute", inset: 0, transformOrigin: "50% 0%", willChange: "transform, opacity" }}
                >
                  {originalWinner.title}
                </span>
                <span
                  ref={winnerTitleNewRef}
                  style={{ position: "absolute", inset: 0, opacity: 0, transform: "translateY(8px) rotateX(-65deg)", transformOrigin: "50% 0%", willChange: "transform, opacity" }}
                >
                  {newWinner.title}
                </span>
              </p>
            </div>
          </div>

          {/* Divider (matches Awards YearSection divider) */}
          <div className="ra-divider" aria-hidden />

          {/* ── RIGHT: Contenders column ────────────────────────── */}
          <aside className="ra-contenders-side" aria-label={`${year} Contenders`}>
            <div className="ra-side-head">
              <span className="ra-side-heading ra-side-heading--contenders">
                <span>✉️</span> Contenders
              </span>
            </div>

            <div className="ra-nominee-grid">
              {/*
               * SR card — top-left of the 3-up grid.
               * ref points to the image box only.
               * GSAP translates + grows it leftward to fill the winner slot.
               */}
              <div className="ra-movie-item">
                <div
                  ref={newCardRef}
                  className="ra-poster-box ra-poster-box--nominee"
                  style={{ position: "relative", willChange: "transform, opacity", zIndex: 2 }}
                >
                  {imgErrors.has(newWinner.title) ? (
                    <div className="ra-poster-fallback">{newWinner.title}</div>
                  ) : (
                    <Image
                      src={normalizeImageSrc(newWinner.posterUrl)}
                      alt={newWinner.title}
                      fill
                      sizes="(max-width:640px) 33vw, 140px"
                      className="ra-poster-img"
                      priority
                      draggable={false}
                      onError={() => markImgError(newWinner.title)}
                    />
                  )}
                  <div className="ra-poster-overlay" />
                  <span
                    ref={rewardedBadgeRef}
                    className="ra-badge ra-badge--rewarded"
                    style={{ opacity: 0, transform: "scale(0.4)" }}
                  >
                    ★ ReAwarded
                  </span>
                </div>
                <p className="ra-movie-title" style={{ position: "relative", minHeight: "3.2em" }}>
                  <span
                    ref={contenderTitleNewRef}
                    style={{ position: "absolute", inset: 0, transformOrigin: "50% 0%", willChange: "transform, opacity" }}
                  >
                    {newWinner.title}
                  </span>
                  <span
                    ref={contenderTitleOriginalRef}
                    style={{ position: "absolute", inset: 0, opacity: 0, transform: "translateY(8px) rotateX(-65deg)", transformOrigin: "50% 0%", willChange: "transform, opacity" }}
                  >
                    {originalWinner.title}
                  </span>
                </p>
              </div>

              {/* Static contenders */}
              {contenders.map((c) => (
                <div key={c.title} className="ra-movie-item">
                  <div className="ra-poster-box ra-poster-box--nominee">
                    {imgErrors.has(c.title) ? (
                      <div className="ra-poster-fallback">{c.title}</div>
                    ) : (
                      <Image
                        src={normalizeImageSrc(c.posterUrl)}
                        alt={c.title}
                        fill
                        sizes="(max-width:640px) 33vw, 140px"
                        className="ra-poster-img"
                        draggable={false}
                        onError={() => markImgError(c.title)}
                      />
                    )}
                    <div className="ra-poster-overlay" />
                  </div>
                  <p className="ra-movie-title">{c.title}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
        </div>
      </div>
    </section>
  );
}

// ─── AwardsStage — reduced-motion final state ─────────────────────────────────

function AwardsStage({
  year,
  winnerLabel,
  winnerLabelClass,
  winnerCaption,
  winnerMovie,
  winnerBadge,
  contenderMovies,
}: {
  year: string | number;
  winnerLabel: React.ReactNode;
  winnerLabelClass: string;
  winnerCaption: React.ReactNode;
  winnerMovie: MovieCard;
  winnerBadge: React.ReactNode;
  contenderMovies: MovieCard[];
}) {
  return (
    <div className="ra-stage-wrap">
      <span className="ra-year-label" aria-hidden="true">{year}</span>
    <div className="ra-stage">
      <div className="ra-winner-side">
        <div className="ra-side-head">
          <span className={winnerLabelClass}>{winnerLabel}</span>
          <div className="ra-caption-wrap">{winnerCaption}</div>
        </div>
        <div className="ra-movie-item">
          <div className="ra-poster-box ra-poster-box--winner">
            <Image src={normalizeImageSrc(winnerMovie.posterUrl)} alt={winnerMovie.title} fill sizes="220px" className="ra-poster-img" priority draggable={false} />
            <div className="ra-poster-overlay" />
            {winnerBadge}
          </div>
          <p className="ra-movie-title">{winnerMovie.title}</p>
        </div>
      </div>
      <div className="ra-divider" />
      <aside className="ra-contenders-side">
        <div className="ra-side-head">
          <span className="ra-side-heading ra-side-heading--contenders"><span>✉️</span> Contenders</span>
        </div>
        <div className="ra-nominee-grid">
          {contenderMovies.map((c) => (
            <div key={c.title} className="ra-movie-item">
              <div className="ra-poster-box ra-poster-box--nominee">
                <Image src={normalizeImageSrc(c.posterUrl)} alt={c.title} fill sizes="140px" className="ra-poster-img" draggable={false} />
                <div className="ra-poster-overlay" />
              </div>
              <p className="ra-movie-title">{c.title}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
    </div>
  );
}

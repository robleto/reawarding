"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { Trophy, ArrowRight } from "lucide-react";
import type { Movie } from "@/types/types";
import { normalizeImageUrl } from "@/utils/imageUrl";
import { getRatingStyle } from "@/utils/getRatingStyle";

// Three-tier reveal that lets the ballot earn its framing:
//   Tier 1 (1–2 rated)  → "You started {year}"        — neutral, intimate
//   Tier 2 (3–4 rated)  → "Your {year} ballot is forming"
//   Tier 3 (5+ rated)   → "Your {year} Best Picture: {Title}" + trophy
// See PRODUCT_GUARDRAILS §12 / PRODUCT_DECISION_LOG (May 2026) for rationale.

interface Props {
  year: number;
  ratedFilms: Movie[]; // sorted by ranking desc
  onOpen: (year: number) => void;
}

type Tier = "started" | "forming" | "ballot";

export default function YearFormingCard({ year, ratedFilms, onOpen }: Props) {
  const tier: Tier = ratedFilms.length >= 5 ? "ballot" : ratedFilms.length >= 3 ? "forming" : "started";
  const leader = ratedFilms[0] ?? null;
  const nomineeCount = useMemo(
    () => ratedFilms.filter((m) => (m.rankings?.[0]?.ranking ?? 0) >= 7).length,
    [ratedFilms]
  );

  if (!leader) return null;

  return (
    <button
      type="button"
      onClick={() => onOpen(year)}
      className="group block w-full text-left transition-transform active:scale-[0.99]"
      aria-label={`Open ${year} ballot`}
    >
      <div
        className={`relative overflow-hidden rounded-2xl border bg-gray-900/80 shadow-xl transition-colors ${
          tier === "ballot"
            ? "border-yellow-500/40 hover:border-yellow-400/60"
            : tier === "forming"
            ? "border-yellow-500/25 hover:border-yellow-500/45"
            : "border-gray-700/60 hover:border-gray-600"
        }`}
      >
        {/* Subtle gold wash on tier 3 to make the trophy moment feel earned */}
        {tier === "ballot" && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-yellow-500/[0.08] via-transparent to-transparent" />
        )}

        <div className="relative flex gap-4 p-4 sm:p-5">
          {/* Poster strip — 1 poster at tier 1, up to 3 stacked for tier 2/3 */}
          <PosterStrip films={ratedFilms} tier={tier} />

          {/* Right column — heading + meta */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div>
              {tier === "ballot" && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-yellow-400">
                    Best Picture
                  </span>
                </div>
              )}

              <h3 className="text-base sm:text-lg font-bold text-white leading-tight font-unbounded">
                {tier === "started" && (
                  <>
                    You started <span className="text-yellow-300">{year}</span>
                  </>
                )}
                {tier === "forming" && (
                  <>
                    Your <span className="text-yellow-300">{year}</span> ballot is forming
                  </>
                )}
                {tier === "ballot" && (
                  <>
                    Your <span className="text-yellow-300">{year}</span>:{" "}
                    <span className="text-white">{leader.title}</span>
                  </>
                )}
              </h3>

              <p className="mt-1.5 text-xs sm:text-sm text-gray-400 leading-relaxed">
                {tier === "started" && (
                  <>
                    {ratedFilms.length === 1 ? "1 film rated" : `${ratedFilms.length} films rated`} ·{" "}
                    <span className="text-gray-300">Rate more to fill out your ballot</span>
                  </>
                )}
                {tier === "forming" && (
                  <>
                    {nomineeCount} nominee{nomineeCount === 1 ? "" : "s"} ·{" "}
                    <span className="text-gray-300">{leader.title} is leading</span>
                  </>
                )}
                {tier === "ballot" && (
                  <>
                    {nomineeCount} nominee{nomineeCount === 1 ? "" : "s"} · Tap to edit
                  </>
                )}
              </p>
            </div>

            <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-yellow-400 group-hover:text-yellow-300 transition-colors">
              {tier === "started" && "Continue building"}
              {tier === "forming" && "Open the ballot"}
              {tier === "ballot" && "View & edit"}
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>

        {/* Tier 2/3 — a thin progress strip at the bottom showing nominee fill */}
        {tier !== "started" && (
          <div className="px-4 sm:px-5 pb-3">
            <NomineeProgress nomineeCount={nomineeCount} />
          </div>
        )}
      </div>
    </button>
  );
}

// ── Poster strip — visual weight scales with tier ─────────────────────────────

function PosterStrip({ films, tier }: { films: Movie[]; tier: Tier }) {
  const visible = tier === "started" ? films.slice(0, 1) : films.slice(0, 3);
  const showLeader = visible[0];
  const overlap = tier !== "started";

  if (!showLeader) return null;

  return (
    <div className="flex-shrink-0 relative">
      {/* Stack of up to 3 posters; back ones peek out behind the leader */}
      <div className={`relative ${overlap ? "w-20 sm:w-24" : "w-20 sm:w-24"}`}>
        {visible
          .slice()
          .reverse() // render back-to-front so leader sits on top
          .map((film, idxFromBack) => {
            const z = visible.length - idxFromBack;
            const isLeader = idxFromBack === visible.length - 1;
            const offset = overlap ? (visible.length - 1 - idxFromBack) * 6 : 0;
            const posterSrc = normalizeImageUrl(film.poster_url ?? null);
            const rating = film.rankings?.[0]?.ranking ?? null;
            const ratingStyle = rating ? getRatingStyle(rating) : null;
            return (
              <div
                key={film.id}
                className={`aspect-[2/3] w-full overflow-hidden rounded-lg bg-gray-800 shadow-md ${
                  overlap && !isLeader ? "absolute top-0 left-0" : "relative"
                }`}
                style={{
                  zIndex: z,
                  transform: overlap && !isLeader ? `translate(${offset}px, ${offset}px)` : undefined,
                  opacity: overlap && !isLeader ? 0.6 : 1,
                }}
              >
                {posterSrc ? (
                  <Image
                    src={posterSrc}
                    alt=""
                    width={96}
                    height={144}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : null}

                {/* Show rating badge on the leader only */}
                {isLeader && rating && ratingStyle && (
                  <span
                    className="absolute bottom-1.5 right-1.5 inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-bold rounded-md shadow-sm"
                    style={{
                      backgroundColor: ratingStyle.background,
                      color: ratingStyle.text,
                    }}
                  >
                    {rating}
                  </span>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ── Nominee fill progress (10 segments, gap after the 5th) ───────────────────

function NomineeProgress({ nomineeCount }: { nomineeCount: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-all duration-500 ${
            i < nomineeCount
              ? nomineeCount >= 5
                ? "bg-emerald-400"
                : "bg-yellow-400"
              : "bg-gray-700/60"
          } ${i === 5 ? "ml-1" : ""}`}
        />
      ))}
    </div>
  );
}

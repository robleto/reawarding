"use client";

import React, { useEffect, useRef } from "react";

export interface MuseumYearTimelineEntry {
  year: number;
  nomineeCount: number;
}

interface Props {
  years: MuseumYearTimelineEntry[];
  activeYear: number;
  onSelectYear: (year: number) => void;
  /** Text appended after the count (e.g. "/10" for nominee slots). Pass "" to show a bare count. Defaults to "/10". */
  subLabelSuffix?: string;
  /** Set false to omit the count line under the year entirely — for
      contexts (e.g. the awards archive scrubber) where ballot-slot
      completion isn't relevant to what the timeline is navigating.
      Defaults to true. */
  showSubLabel?: boolean;
}

/**
 * MuseumYearTimeline — "medal rail": each year is a struck-coin token (the
 * full year, once — an earlier pass showed an abbreviated numeral inside
 * the token AND the full year below it, which just said the same thing
 * twice), threaded on a thin gold rail. Consecutive years share a solid
 * rail segment; skipped years get a dashed one instead of a connecting
 * token — a break in the rail already reads as "missing," no separate
 * glyph needed. Sorted newest → oldest. The active medal scrolls into
 * view when activeYear changes.
 *
 * Deliberately has no panel/background of its own — each token is already
 * opaque enough to read on its own over whatever's behind the row (the
 * page background, ambient glow, scrolled content), so there's no
 * rectangle here that could ever look "off" against it.
 */
export default function MuseumYearTimeline({ years, activeYear, onSelectYear, subLabelSuffix = "/10", showSubLabel = true }: Props) {
  const activeChipRef = useRef<HTMLButtonElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const sorted = [...years].sort((a, b) => b.year - a.year);

  // Center the active chip by scrolling the rail directly. scrollIntoView
  // also scrolled ancestor containers (including the page), which yanked
  // the rail under the user's finger mid-tap and nudged page scroll.
  useEffect(() => {
    const rail = railRef.current;
    const chip = activeChipRef.current;
    if (!rail || !chip) return;
    const target = chip.offsetLeft + chip.offsetWidth / 2 - rail.clientWidth / 2;
    rail.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [activeYear]);

  return (
    <div className="relative mb-6">
      <div
        ref={railRef}
        className="flex items-start overflow-x-auto pb-3"
        style={{ scrollbarWidth: "none" }}
      >
        {sorted.map((yl, idx) => {
          const isActive = yl.year === activeYear;
          const nextYl = sorted[idx + 1];
          const gapSize = nextYl ? yl.year - nextYl.year : 0;

          return (
            <div key={yl.year} className="flex-shrink-0 flex items-start">
              <button
                ref={isActive ? activeChipRef : undefined}
                type="button"
                onClick={() => onSelectYear(yl.year)}
                className="relative z-10 flex flex-col items-center gap-1.5 min-w-[56px] px-1 group"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-unbounded font-normal text-[10px] tabular-nums transition-all ${
                    isActive
                      ? "bg-gradient-to-br from-gold-300 to-gold-500 text-charcoal-900 shadow-[0_0_0_4px_rgba(212,175,55,0.14),0_2px_10px_rgba(212,175,55,0.25)] scale-105"
                      : "bg-gray-900 border-[1.5px] border-gray-700 text-gray-400 group-hover:border-gray-500 group-hover:text-gray-200"
                  }`}
                >
                  {yl.year}
                </div>
                {showSubLabel && (
                  <span
                    className={`text-[9px] tabular-nums leading-none ${
                      isActive ? "text-gold-500" : "text-gray-600"
                    }`}
                  >
                    {yl.nomineeCount}{subLabelSuffix}
                  </span>
                )}
              </button>

              {nextYl && (
                <div className="flex-shrink-0 flex items-center" style={{ width: gapSize === 1 ? 20 : 32, height: 40 }}>
                  <div
                    className={gapSize === 1 ? "h-px w-full bg-gold-500/25" : "h-px w-full"}
                    style={
                      gapSize === 1
                        ? undefined
                        : { backgroundImage: "repeating-linear-gradient(90deg, rgb(212 175 55 / 0.3) 0 3px, transparent 3px 7px)" }
                    }
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

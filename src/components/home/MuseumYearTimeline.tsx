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
}

/**
 * MuseumYearTimeline — horizontal dot-and-line timeline of touched years.
 * Each year is a circular node with year label + nominee count below.
 * Consecutive years share a solid connector; a heartbeat waveform marks
 * skipped years. Sorted newest → oldest. The active chip scrolls into
 * view when activeYear changes.
 */
export default function MuseumYearTimeline({ years, activeYear, onSelectYear }: Props) {
  const activeChipRef = useRef<HTMLButtonElement>(null);
  const sorted = [...years].sort((a, b) => b.year - a.year);

  useEffect(() => {
    if (activeChipRef.current) {
      activeChipRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeYear]);

  return (
    <div className="relative mb-6">
      <div
        className="flex items-start overflow-x-auto pb-3 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {sorted.map((yl, idx) => {
          const isActive = yl.year === activeYear;
          const nextYl = sorted[idx + 1];
          const gapSize = nextYl ? yl.year - nextYl.year : 0;

          return (
            <div key={yl.year} className="flex-shrink-0 flex items-start snap-start">
              <button
                ref={isActive ? activeChipRef : undefined}
                type="button"
                onClick={() => onSelectYear(yl.year)}
                className="flex flex-col items-center gap-1 min-w-[52px] px-1 group"
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  <div
                    className={`rounded-full transition-all ${
                      isActive
                        ? "w-3 h-3 bg-gold-400"
                        : "w-2 h-2 bg-gray-600 group-hover:bg-gray-400"
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] font-bold font-unbounded leading-tight mt-0.5 transition-colors ${
                    isActive
                      ? "text-gold-300"
                      : "text-gray-400 group-hover:text-gray-200"
                  }`}
                >
                  {yl.year}
                </span>
                <span
                  className={`text-[10px] tabular-nums leading-none ${
                    isActive ? "text-gold-500/60" : "text-gray-700"
                  }`}
                >
                  {yl.nomineeCount}/10
                </span>
              </button>

              {nextYl && (
                <div className="flex items-center mt-4">
                  {gapSize === 1 ? (
                    <div className="w-4 h-[2px] bg-gray-700 rounded-full" />
                  ) : (
                    <svg
                      width="24"
                      height="12"
                      viewBox="0 0 24 12"
                      fill="none"
                      aria-hidden="true"
                      className="text-gray-600"
                    >
                      <polyline
                        points="0,6 4,6 6,1 8,11 10,6 24,6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

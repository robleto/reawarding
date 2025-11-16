"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { TrendingUp, Film, ChevronDown, ChevronUp } from "lucide-react";
import type { Movie } from "@/types/types";

interface RankingsStatsProps {
  movies: Movie[];
  onRatingClick?: (rating: number) => void;
}

// Color scheme matching your rating colors
const RATING_COLORS = {
  10: "bg-[#e5dbf3]", // purple
  9: "bg-[#d5e7f2]", // blue
  8: "bg-[#dcebe3]", // green
  7: "bg-[#f8e7ba]", // yellow
  6: "bg-[#f4d8c7]", // orange
  5: "bg-[#f5d9e8]", // pink
  4: "bg-[#f6d4d4]", // red
  3: "bg-[#eee0d6]", // beige
  2: "bg-[#e2e2e2]", // gray
  1: "bg-[#f5f5f5]", // light gray
};

const RATING_TEXT_COLORS = {
  10: "text-[#4c2c65]", // purple
  9: "text-[#1a3448]", // blue
  8: "text-[#1f3c30]", // green
  7: "text-[#5b3d00]", // yellow
  6: "text-[#7b3f00]", // orange
  5: "text-[#6a1f45]", // pink
  4: "text-[#7b1818]", // red
  3: "text-[#7b5c42]", // beige
  2: "text-[#474747]", // gray
  1: "text-[#474747]", // light gray
};

export default function RankingsStats({ movies, onRatingClick }: RankingsStatsProps) {
  const [showStats, setShowStats] = useState(true);
  const leftRef = useRef<HTMLDivElement | null>(null);
  const [leftHeight, setLeftHeight] = useState<number>(0);
  
  // Calculate stats
  const totalRated = movies.length;
  const rankings = movies
    .map((m) => m.rankings?.[0]?.ranking)
    .filter((r): r is number => typeof r === "number");
  
  const averageRating = rankings.length > 0
    ? (rankings.reduce((sum, r) => sum + r, 0) / rankings.length).toFixed(1)
    : "0.0";

  // Count distribution (1-10)
  const distribution: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) {
    distribution[i] = 0;
  }
  
  rankings.forEach((rating) => {
    if (rating >= 1 && rating <= 10) {
      distribution[rating]++;
    }
  });

  const maxCount = Math.max(...Object.values(distribution), 1);

  // Sync chart height to left column height for perfect alignment
  useLayoutEffect(() => {
    const el = leftRef.current;
    if (!el) return;

    const update = () => {
      const h = el.offsetHeight;
      if (h && h !== leftHeight) setLeftHeight(h);
    };

    update();

    // Observe size changes of the left column
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => update());
      ro.observe(el);
    }
    // Also update on window resize
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      if (ro) ro.disconnect();
    };
  }, [leftRef, leftHeight]);

  // Reserve space for rating labels below bars (approx 28px)
  const labelReserve = 28;
  const containerHeight = leftHeight || 192;
  const barAreaHeight = Math.max(80, containerHeight - labelReserve);

  return (
    <div className="mb-6">
      {!showStats && (
        <button
          onClick={() => setShowStats(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs text-gray-500 hover:text-gray-400 transition-colors"
        >
          <ChevronDown className="w-3 h-3" />
          <span>Show Statistics</span>
        </button>
      )}

      {showStats && (
        <div className="relative bg-gray-900/60 border border-yellow-500/20 rounded-xl p-4 md:p-6">
          {/* Unified grid: stats column + distribution spanning two cols on lg */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
            {/* Compact stats stack */}
            <div ref={leftRef} className="flex flex-col gap-2">
              <p className="text-sm text-gray-400">Your Ratings Overview</p>
              <div className="flex items-center gap-3">
                <div className="p-2">
                  <TrendingUp className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Average Rating</p>
                  <p className="text-2xl font-bold text-yellow-400">{averageRating}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2">
                  <Film className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Rated Movies</p>
                  <p className="text-2xl font-bold text-blue-400">{totalRated}</p>
                </div>
              </div>
            </div>

            {/* Distribution spans two columns on desktop */}
            <div className="lg:col-span-2" style={{ height: `${containerHeight}px` }}>
              <div className="flex items-end justify-between gap-2 h-full">
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((rating) => {
                  const count = distribution[rating];
                  const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  const color = RATING_COLORS[rating as keyof typeof RATING_COLORS];
                  const textColor = RATING_TEXT_COLORS[rating as keyof typeof RATING_TEXT_COLORS];

                  return (
                    <div key={rating} className="flex-1 flex flex-col items-center gap-2">
                      <div className="relative w-full flex flex-col items-center justify-end" style={{ height: `${barAreaHeight}px` }}>
                        <div
                          className={`w-full rounded-t ${color} transition-all duration-500 ease-out cursor-pointer hover:opacity-80 relative`}
                          style={{ height: `${heightPercent}%` }}
                          onClick={() => onRatingClick?.(rating)}
                        >
                          {count > 0 && (
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-300 whitespace-nowrap">
                              {count}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`w-full text-xs font-bold ${textColor} px-1.5 py-0.5 rounded-b text-center`} style={{ backgroundColor: color.replace('bg-', '').replace('[', '').replace(']', '') }}>
                        {rating}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Lower-left hide control (overlay, does not affect chart height) */}
          <button
            onClick={() => setShowStats(false)}
            className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-300"
          >
            <ChevronUp className="w-3 h-3" />
            <span>Hide Statistics</span>
          </button>
        </div>
      )}
    </div>
  );
}

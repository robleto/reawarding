"use client";

import { useState } from "react";
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
        <div className="bg-gray-900/60 border border-yellow-500/20 rounded-xl p-4 md:p-6">
          {/* Header row with compact hide button */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-400">Your Ratings Overview</p>
            <button
              onClick={() => setShowStats(false)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-300"
            >
              <ChevronUp className="w-3 h-3" />
              Hide
            </button>
          </div>

          {/* Unified grid: stats column + distribution spanning two cols on lg */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Compact stats stack */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Average Rating</p>
                  <p className="text-2xl font-bold text-yellow-400">{averageRating}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Film className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Rated Movies</p>
                  <p className="text-2xl font-bold text-blue-400">{totalRated}</p>
                </div>
              </div>
            </div>

            {/* Distribution spans two columns on desktop */}
            <div className="lg:col-span-2 rounded-lg border border-yellow-500/20 bg-gray-900/40 p-4 md:p-5">
              <p className="text-sm text-gray-400 mb-3">Rating Distribution</p>
              <div className="flex items-end justify-between gap-2 h-28 md:h-32">
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((rating) => {
                  const count = distribution[rating];
                  const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  const color = RATING_COLORS[rating as keyof typeof RATING_COLORS];
                  const textColor = RATING_TEXT_COLORS[rating as keyof typeof RATING_TEXT_COLORS];

                  return (
                    <div key={rating} className="flex-1 flex flex-col items-center gap-2">
                      <div className="relative w-full flex flex-col items-center justify-end" style={{ height: "100px" }}>
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
        </div>
      )}
    </div>
  );
}

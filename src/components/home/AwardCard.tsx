"use client";

import { Trophy, Share2 } from "lucide-react";
import { getActualWinner } from "@/data/bestPictureWinners";

interface Props {
  year: number;
  winnerTitle: string;
  winnerPoster?: string | null;
  nomineeCount: number;
  onClick?: () => void;
  /** If provided, a share icon appears below the card */
  onShare?: () => void;
}

/**
 * AwardCard — prestige poster card for "Your Awards" shelf.
 * Receives pre-resolved movie data — no database fetching.
 */
export default function AwardCard({ year, winnerTitle, winnerPoster, nomineeCount, onClick, onShare }: Props) {
  const actualWinner = getActualWinner(year);
  const isAcademyMatch =
    actualWinner && winnerTitle && actualWinner.title.toLowerCase() === winnerTitle.toLowerCase();

  return (
    <div className="flex flex-col items-center gap-1.5">
    <button
      onClick={onClick}
      className="group relative flex-shrink-0 w-[160px] sm:w-[180px] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/50 rounded-xl"
    >
      {/* Animated gold shimmer frame */}
      <div className="award-card-frame award-card-glow">
        <div className="award-card-inner">
          {/* Poster */}
          <div className="relative aspect-[2/3] overflow-hidden">
            {winnerPoster ? (
              <img
                src={winnerPoster}
                alt={winnerTitle}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-800 to-gray-900">
                <Trophy className="w-10 h-10 text-yellow-500/30" />
              </div>
            )}

            {/* Gradient overlay for text legibility */}
            <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" />

            {/* Subtle vignette */}
            <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] pointer-events-none" />

            {/* Year plaque — metallic gold */}
            <div className="absolute top-2.5 left-2.5">
              <span className="award-year-plaque inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-extrabold font-unbounded tracking-widest shadow-lg">
                {year}
              </span>
            </div>

            {/* Trophy badge — top-right */}
            <div className="absolute top-2.5 right-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400/30 to-yellow-600/20 backdrop-blur-sm border border-yellow-500/40 flex items-center justify-center group-hover:from-yellow-400/50 group-hover:to-yellow-600/40 transition-all duration-300 shadow-lg shadow-yellow-500/10">
                <Trophy className="w-4 h-4 text-yellow-400 drop-shadow-[0_0_4px_rgba(234,179,8,0.5)]" />
              </div>
            </div>

            {/* Bottom text overlay */}
            <div className="absolute inset-x-0 bottom-0 p-3">
              <p className="text-sm font-bold text-white leading-tight line-clamp-2 drop-shadow-lg">
                {winnerTitle}
              </p>
              <p className="text-[10px] mt-1 font-medium drop-shadow-md">
                {isAcademyMatch ? (
                  <span className="text-yellow-300">Agrees with the Academy</span>
                ) : actualWinner ? (
                  <span className="text-gray-300/90">
                    Over <span className="text-yellow-400/80">{actualWinner.title}</span>
                  </span>
                ) : (
                  <span className="text-yellow-400/70">Best Picture</span>
                )}
              </p>
              {nomineeCount > 1 && (
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="flex -space-x-1">
                    {Array.from({ length: Math.min(nomineeCount, 5) }).map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full border border-yellow-600/50 shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, rgba(234,179,8,${0.9 - i * 0.12}), rgba(161,98,7,${0.7 - i * 0.1}))`,
                        }}
                      />
                    ))}
                    {nomineeCount > 5 && (
                      <span className="text-[8px] text-yellow-500/70 ml-1.5 font-medium">
                        +{nomineeCount - 5}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-gray-400/90 font-medium">
                    {nomineeCount} nominee{nomineeCount !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>

    {onShare && (
      <button
        type="button"
        onClick={onShare}
        className="inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-yellow-400 transition-colors"
        aria-label={`Share ${year} ballot`}
      >
        <Share2 className="h-3 w-3" />
        Share
      </button>
    )}
    </div>
  );
}

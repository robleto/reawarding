"use client";

import React from "react";
import { Trophy, Share2 } from "lucide-react";
import { useOfficialAwardWinners } from "@/data/officialAwardWinners";
import type { AcademyStatusResult } from "@/data/officialAwardWinners";
import AcademyStamp from "@/components/award/AcademyStamp";

interface Props {
  year: number;
  winnerTitle: string;
  winnerPoster?: string | null;
  nomineeCount: number;
  /** Preferred over title matching when the caller has it — see comparison below. */
  winnerMovieId?: string | number | null;
  onClick?: () => void;
  /** If provided, a share icon appears below the card */
  onShare?: () => void;
  /** Stretch to fill the parent instead of the fixed shelf width — for
      standalone placements (e.g. above a year's nominee grid) where this
      is the one card on screen, not a card in a horizontal scroll shelf. */
  fullWidth?: boolean;
  /** fullWidth only: renders the Upheld/Reawarded ink-stamp at the poster's
      lower-right, scaled down from the desktop corner-stamp treatment. */
  academyStatus?: AcademyStatusResult | null;
}

/**
 * AwardCard — prestige poster card for "Your Awards" shelf.
 * Receives pre-resolved movie data — no database fetching of its own beyond
 * the shared, cached official-winners lookup (see src/data/officialAwardWinners.ts).
 */
export default function AwardCard({ year, winnerTitle, winnerPoster, nomineeCount, winnerMovieId, onClick, onShare, fullWidth, academyStatus }: Props) {
  const { winners } = useOfficialAwardWinners();
  const actualWinner = winners.get(year) ?? null;
  // ID comparison when the caller passes one (exact, immune to title formatting
  // differences); falls back to a case-insensitive title compare otherwise.
  const isAcademyMatch =
    !!actualWinner &&
    (winnerMovieId != null && actualWinner.movieId != null
      ? String(actualWinner.movieId) === String(winnerMovieId)
      : !!winnerTitle && actualWinner.filmTitle.toLowerCase() === winnerTitle.toLowerCase());

  return (
    <div className="flex flex-col items-center gap-1.5">
    <button
      onClick={onClick}
      className={`group relative text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 rounded-xl ${
        fullWidth ? "w-full max-w-[360px]" : "flex-shrink-0 w-[160px] sm:w-[180px]"
      }`}
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
                <Trophy className="w-10 h-10 text-gold-500/30" />
              </div>
            )}

            {/* Gradient overlay — full-height for the shelf card's text
                overlay; just enough at the base to seat the fullWidth card's
                Academy stamp when there's no text overlay to support. */}
            <div
              className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-always-black via-always-black/70 to-transparent pointer-events-none ${
                fullWidth ? "h-1/4" : "h-3/4"
              }`}
            />

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
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-always-gold-400/30 to-always-gold-600/20 backdrop-blur-sm border border-always-gold-500/40 flex items-center justify-center group-hover:from-always-gold-400/50 group-hover:to-always-gold-600/40 transition-all duration-300 shadow-lg shadow-always-gold-500/10">
                <Trophy className="w-4 h-4 text-always-gold-400 drop-shadow-[0_0_4px_rgba(234,179,8,0.5)]" />
              </div>
            </div>

            {/* Academy stamp — lower-right, fullWidth only. Same ink-stamp
                treatment as the desktop card's open-corner stamp, scaled down
                to fit the poster corner instead of floating beside the grid. */}
            {fullWidth && academyStatus && (
              <div className="absolute bottom-1 right-1 origin-bottom-right scale-[0.45]">
                <AcademyStamp academyStatus={academyStatus} />
              </div>
            )}

            {/* Bottom text overlay — shelf card only. The fullWidth marquee
                card shows just the name, as a caption below the frame. */}
            {!fullWidth && (
              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="text-sm font-bold text-always-white leading-tight line-clamp-2 drop-shadow-lg">
                  {winnerTitle}
                </p>
                <p className="text-[10px] mt-1 font-medium drop-shadow-md">
                  {isAcademyMatch ? (
                    <span className="text-always-gold-300">Agrees with the Academy</span>
                  ) : actualWinner ? (
                    <span className="text-always-white/70">
                      Over <span className="text-always-gold-400/80">{actualWinner.filmTitle}</span>
                    </span>
                  ) : (
                    <span className="text-always-gold-400/70">Best Picture</span>
                  )}
                </p>
                {nomineeCount > 1 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="flex -space-x-1">
                      {Array.from({ length: Math.min(nomineeCount, 5) }).map((_, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full border border-always-gold-600/50 shadow-sm"
                          style={{
                            background: `linear-gradient(135deg, rgba(234,179,8,${0.9 - i * 0.12}), rgba(161,98,7,${0.7 - i * 0.1}))`,
                          }}
                        />
                      ))}
                      {nomineeCount > 5 && (
                        <span className="text-[12px] text-always-gold-500/70 ml-1.5 font-medium">
                          +{nomineeCount - 5}
                        </span>
                      )}
                    </div>
                    <span className="text-[12px] text-always-white/60 font-medium">
                      {nomineeCount} nominee{nomineeCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Caption — fullWidth only: the name, below the frame, museum-placard style */}
      {fullWidth && (
        <p className="mt-2.5 text-center font-unbounded text-base font-semibold text-white line-clamp-2">
          {winnerTitle}
        </p>
      )}
    </button>

    {onShare && (
      <button
        type="button"
        onClick={onShare}
        className="inline-flex items-center gap-1 min-h-[44px] px-2 text-xs text-gray-400 hover:text-gold-400 transition-colors"
        aria-label={`Share ${year} ballot`}
      >
        <Share2 className="h-3 w-3" />
        Share
      </button>
    )}
    </div>
  );
}

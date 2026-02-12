"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { supabase } from "@/lib/supabaseBrowser";
import { getActualWinner } from "@/data/bestPictureWinners";
import type { Movie } from "@/types/types";

interface Props {
  year: number;
  winnerId: number;
  nomineeIds: number[];
  onClick?: () => void;
}

/**
 * AwardCard — compact card for displaying an existing award on "The Shelf".
 * Shows winner poster, year, subtitle comparing to actual winner, nominee count.
 */
export default function AwardCard({ year, winnerId, nomineeIds, onClick }: Props) {
  const [winner, setWinner] = useState<Pick<Movie, "id" | "title" | "poster_url"> | null>(null);

  useEffect(() => {
    async function fetchWinner() {
      const { data } = await supabase
        .from("movies")
        .select("id, title, poster_url")
        .eq("id", winnerId)
        .single();

      if (data) {
        setWinner(data as any);
      }
    }

    fetchWinner();
  }, [winnerId]);

  const actualWinner = getActualWinner(year);
  const isAcademyMatch =
    actualWinner && winner && actualWinner.title.toLowerCase() === winner.title.toLowerCase();

  const subtitle = isAcademyMatch
    ? "You agree with the Academy"
    : actualWinner
    ? `Your pick over ${actualWinner.title}`
    : "";

  const nomineeCount = nomineeIds.length;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full text-left p-3 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:border-yellow-500/30 hover:bg-gray-800/70 transition-all group"
    >
      {/* Poster */}
      <div className="w-14 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-700">
        {winner?.poster_url ? (
          <img
            src={winner.poster_url}
            alt={winner.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-500/50" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-yellow-400 font-unbounded">{year}</span>
          <Trophy className="w-3.5 h-3.5 text-yellow-500/70" />
        </div>
        <p className="text-sm font-medium text-white truncate">
          {winner?.title ?? "Loading..."}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-400 truncate">{subtitle}</p>
        )}
        {nomineeCount > 1 && (
          <p className="text-[10px] text-gray-500 mt-0.5">
            {nomineeCount} nominee{nomineeCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Arrow hint */}
      <svg
        className="w-4 h-4 text-gray-600 group-hover:text-yellow-400 transition-colors flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

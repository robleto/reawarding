"use client";

import React from "react";
import MovieCard from "./MovieCard";
import type { Movie } from "@/types/types";

interface Props {
  nominees: Movie[];
  winnerId?: string;
  onSelect: (movie: Movie) => void;
  /** Nominee ids whose rating has since dropped below 7 on a saved ballot —
      see docs/design/ballot-card-states.md. Renders a small caption instead
      of removing the film, since a stale nominee is still a real choice
      until the user updates the ballot. */
  staleIds?: Set<string | number>;
}

/**
 * NomineeCardCarousel — mobile-only. A free-scrolling shelf of nominee
 * cards (alphabetical, winner included and trophy-badged) that sits below
 * the fixed winner exhibit (see EditableYearSection). Deliberately not
 * paginated and not sized off the winner: the winner already gets its own
 * "reveal" moment as a standalone artifact above, so this shelf behaves
 * like any other rail in the app — same 140/160px card width as the
 * films page's "Recently added" shelf, native momentum scroll, no dots,
 * no height changes as you scroll.
 */
export default function NomineeCardCarousel({ nominees, winnerId, onSelect, staleIds }: Props) {
  const sortedNominees = [...nominees].sort((a, b) => a.title.localeCompare(b.title));

  if (sortedNominees.length === 0) return null;

  return (
    <div className="md:hidden">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">
        Nominees
      </p>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {sortedNominees.map((movie) => (
          <div key={movie.id} className="flex-shrink-0 w-[140px] sm:w-[160px] snap-start">
            <MovieCard
              movie={movie}
              variant="grid"
              isWinner={winnerId === movie.id}
              winnerLabel
              onClick={() => onSelect(movie)}
            />
            {staleIds?.has(movie.id) && (
              <p className="mt-0.5 text-center text-[9px] font-medium text-amber-400/80">
                Rated below 7
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

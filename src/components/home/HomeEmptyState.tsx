"use client";

import type { Movie } from "@/types/types";
import MovieSearchPicker from "./MovieSearchPicker";
import StarterPicks from "./StarterPicks";

interface HomeEmptyStateProps {
  onMovieSelected: (movie: Movie) => void;
}

/**
 * HomeEmptyState — "The Ballot" (0 awards)
 *
 * Search-first, opinion-first onboarding. No milestones, no progress bars.
 * "Pick a movie you love" → award created in under 30 seconds.
 */
export default function HomeEmptyState({ onMovieSelected }: HomeEmptyStateProps) {
  return (
    <div className="mb-8">
      <div className="text-center pt-8 pb-4 px-4 sm:px-6">
        <div className="max-w-xl mx-auto">
          {/* Logo + Headline */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <img
              src="/oscarworthy-logomark.svg"
              alt="Golden Envelope"
              className="w-12 h-12"
            />
            <h1 className="text-2xl font-unbounded uppercase text-gray-900 dark:text-white">
              Pick a movie you love.
            </h1>
          </div>

          {/* Outcome preview subtext */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Pick one movie and we&apos;ll make it your Best Picture for that year.
          </p>

          {/* Search — always visible, autoFocused */}
          <div className="mb-6">
            <MovieSearchPicker
              onSelect={onMovieSelected}
              autoFocus
              placeholder="Search for a movie..."
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
            <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              or pick a classic
            </span>
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
          </div>

          {/* Starter picks carousel */}
          <StarterPicks onSelect={onMovieSelected} />
        </div>
      </div>
    </div>
  );
}

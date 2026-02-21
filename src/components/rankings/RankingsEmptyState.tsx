"use client";

import MovieSearchPicker from "@/components/home/MovieSearchPicker";
import type { Movie } from "@/types/types";

interface RankingsEmptyStateProps {
  onSelectMovie: (movie: Movie) => void;
}

export default function RankingsEmptyState({ onSelectMovie }: RankingsEmptyStateProps) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-full max-w-xl text-center px-6 py-12">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          You haven&apos;t rated any movies yet.
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Start with one.</p>
        <MovieSearchPicker
          onSelect={onSelectMovie}
          placeholder="Search for a movie"
          className="w-full"
        />
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import MovieSearchPicker from "@/components/home/MovieSearchPicker";
import type { Movie } from "@/types/types";

interface RankingsEmptyStateProps {
  onSelectMovie: (movie: Movie) => void;
}

export default function RankingsEmptyState({ onSelectMovie }: RankingsEmptyStateProps) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-full max-w-xl text-center px-6 py-12">
        <Star className="mx-auto mb-4 h-8 w-8 text-yellow-400" />
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Rate a film to get started
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-1">
          Track films you&apos;ve seen, rate them, and your awards build themselves.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
          Every film you rate appears here, sorted by score. Rate 7+ and it automatically becomes a contender.
        </p>
        <MovieSearchPicker
          onSelect={onSelectMovie}
          placeholder="Add a movie you've watched…"
          className="w-full"
        />
        <p className="mt-6 text-xs text-gray-500 dark:text-gray-500">
          or{" "}
          <Link href="/" className="text-yellow-400 hover:text-yellow-300 font-medium">
            go back home
          </Link>{" "}
          for a guided walkthrough
        </p>
      </div>
    </div>
  );
}

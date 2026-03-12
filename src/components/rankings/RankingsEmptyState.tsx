"use client";

import Link from "next/link";
import { BarChart3 } from "lucide-react";
import MovieSearchPicker from "@/components/home/MovieSearchPicker";
import type { Movie } from "@/types/types";

interface RankingsEmptyStateProps {
  onSelectMovie: (movie: Movie) => void;
}

export default function RankingsEmptyState({ onSelectMovie }: RankingsEmptyStateProps) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-full max-w-xl text-center px-6 py-12">
        <BarChart3 className="mx-auto mb-4 h-8 w-8 text-yellow-400" />
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Your rankings start here
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Search for a movie you&apos;ve seen and give it a rating. Every film you rate appears here, sorted by your score.
        </p>
        <MovieSearchPicker
          onSelect={onSelectMovie}
          placeholder="Search for a movie you've seen..."
          className="w-full"
        />
        <p className="mt-6 text-xs text-gray-500 dark:text-gray-500">
          or{" "}
          <Link href="/" className="text-yellow-400 hover:text-yellow-300 font-medium">
            go back home
          </Link>{" "}
          to get started with a guided walkthrough
        </p>
      </div>
    </div>
  );
}

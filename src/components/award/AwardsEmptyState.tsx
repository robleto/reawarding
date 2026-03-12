"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import MovieSearchPicker from "@/components/home/MovieSearchPicker";
import type { Movie } from "@/types/types";

interface AwardsEmptyStateProps {
  onSelectMovie: (movie: Movie) => void;
}

export default function AwardsEmptyState({ onSelectMovie }: AwardsEmptyStateProps) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-full max-w-xl text-center px-6 py-12">
        <Trophy className="mx-auto mb-4 h-8 w-8 text-yellow-400" />
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          No awards yet
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Rate films and your highest-scored movies become nominees. Get 10 nominees in a year to build your ballot and crown a winner.
        </p>
        <MovieSearchPicker
          onSelect={onSelectMovie}
          placeholder="Search for a movie to rate..."
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

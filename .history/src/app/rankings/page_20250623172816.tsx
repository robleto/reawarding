"use client";

import { useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import type { Database } from "@/types/supabase";
import MoviePosterCard from "@/components/movie/MoviePosterCard";
import MovieRowCard from "@/components/movie/MovieRowCard";
import Loader from "@/components/ui/Loading";

import {
  useMovieData,
  useViewMode,
  groupMovies,
  SORT_OPTIONS,
  GROUP_OPTIONS,
  SortKey,
  GroupKey,
  SortOrder,
} from "@/utils/sharedMovieUtils";

export const dynamic = "force-dynamic";

export default function RankingsPage() {
  const { movies, loading, user, userId } = useMovieData();
  const [viewMode, setViewMode] = useViewMode("list");
  const [sortBy, setSortBy] = useState<SortKey>("ranking");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [groupBy, setGroupBy] = useState<GroupKey>("none");
  const supabase = useSupabaseClient<Database>();

  async function handleUpdate(
    movieId: number,
    updates: { seen_it?: boolean; ranking?: number }
  ) {
    const movie = movies.find((m) => m.id === movieId);
    const existing = movie?.rankings?.[0];

    const payload = {
      ...(existing?.id ? { id: existing.id } : {}),
      user_id: userId,
      movie_id: movieId,
      seen_it: updates.seen_it ?? existing?.seen_it ?? false,
      ranking: updates.ranking ?? existing?.ranking ?? 0,
    };

    const { error } = await supabase
      .from("rankings")
      .upsert(payload, { onConflict: "user_id,movie_id" });

    if (error) {
      console.error("Update error:", error.message);
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-500">
        Please sign in to view your rankings.
      </div>
    );
  }

	if (loading) {
		return <Loader message="Loading films..." />;
	}

  const grouped = groupMovies(movies, groupBy, sortBy, sortOrder);

  return (
    <div className="max-w-screen-xl px-6 py-10 mx-auto">
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-700">
          <div className="flex items-center gap-2">
            <label htmlFor="group-select" className="whitespace-nowrap">
              Group by
            </label>
            <select
              id="group-select"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupKey)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {GROUP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="whitespace-nowrap">
              Sort by
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              aria-label="Toggle sort order"
              className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
              title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
            >
              {sortOrder === "asc" ? (
                <span className="text-xl">▲</span>
              ) : (
                <span className="text-xl">▼</span>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-full border ${
              viewMode === "list"
                ? "bg-blue-100 text-blue-600 border-blue-300"
                : "text-gray-400"
            }`}
            aria-label="List view"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-full border ${
              viewMode === "grid"
                ? "bg-blue-100 text-blue-600 border-blue-300"
                : "text-gray-400"
            }`}
            aria-label="Grid view"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h6v6H4V6zm0 8h6v6H4v-6zm10-8h6v6h-6V6zm0 8h6v6h-6v-6z"
              />
            </svg>
          </button>
        </div>
      </div>

      {grouped.map(({ key, movies }) => (
        <div key={key} className="mb-10">
          {groupBy !== "none" && (
            <h2 className="mb-4 text-xl font-bold text-gray-800">{key}</h2>
          )}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-5">
              {movies.map((movie) => (
                <MoviePosterCard
                  key={movie.id}
                  movie={movie}
                  currentUserId={userId}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col divide-y">
              {movies.map((movie) => (
                <MovieRowCard
                  key={movie.id}
                  movie={movie}
                  currentUserId={userId}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

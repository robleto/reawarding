"use client";

import { useState, useEffect } from "react";
import type { Database } from "@/types/supabase";
import type { Movie } from "@/types/types";
import MoviePosterCard from "@/components/movie/MoviePosterCard";
import MovieRowCard from "@/components/movie/MovieRowCard";
import Loader from "@/components/ui/Loading";
import {
  useMovieData,
  useViewMode,
  useMovieFilters,
  SORT_OPTIONS,
  GROUP_OPTIONS,
  SortKey,
  GroupKey,
  SortOrder,
} from "@/utils/sharedMovieUtils";

export const dynamic = "force-dynamic";

export default function RankingsPage() {
  const { movies, loading, user, userId, updateMovieRanking } = useMovieData();
  const [viewMode, setViewMode] = useViewMode("list");
  
  // Filter to only movies with rankings for the rankings page
  const moviesWithRankings = movies.filter((movie) => movie.rankings && movie.rankings.length > 0);
  
  const {
    hasMounted,
    sortBy,
    sortOrder,
    groupBy,
    filterType,
    filterValue,
    setSortBy,
    setSortOrder,
    setGroupBy,
    setFilterType,
    setFilterValue,
    groupedMovies,
    uniqueYears,
    uniqueRanks,
  } = useMovieFilters(moviesWithRankings);

  const isDataReady =
    hasMounted &&
    !loading &&
    movies.length > 0;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-500">
        Please sign in to view your rankings.
      </div>
    );
  }

  if (!isDataReady) {
    return <Loader message="Loading films..." />;
  }

  return (
    <div className="max-w-screen-xl px-6 py-10 mx-auto">
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-700">
          <div className="flex items-center gap-2">
            <label htmlFor="group-select">Group by</label>
            <select
              id="group-select"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupKey)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm shadow-sm"
            >
              {GROUP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="sort-select">Sort by</label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm shadow-sm"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100"
            >
              {sortOrder === "asc" ? "▲" : "▼"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="filter-type">Filter</label>
            <select
              id="filter-type"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as "none" | "year" | "rank");
                setFilterValue("all");
              }}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm shadow-sm"
            >
              <option value="none">None</option>
              <option value="year">Year</option>
              <option value="rank">Rank</option>
            </select>

            {filterType === "year" && (
              <select
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm shadow-sm"
              >
                <option value="all">All</option>
                {uniqueYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            )}

            {filterType === "rank" && (
              <select
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm shadow-sm"
              >
                <option value="all">All</option>
                {uniqueRanks.map((rank) => (
                  <option key={rank} value={rank}>{rank}</option>
                ))}
              </select>
            )}
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
          >
            ≡
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-full border ${
              viewMode === "grid"
                ? "bg-blue-100 text-blue-600 border-blue-300"
                : "text-gray-400"
            }`}
          >
            ⬛
          </button>
        </div>
      </div>

      {groupedMovies.map(({ key, movies }: { key: string; movies: Movie[] }) => (
        <div key={key} className="mb-10">
          {groupBy !== "none" && (
            <h2 className="mb-4 text-xl font-bold text-gray-800">{key}</h2>
          )}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-5">
              {movies.map((movie) => {
                const r = movie.rankings?.[0];
                if (!r) return null;
                return (
                  <MoviePosterCard
                    key={movie.id}
                    movie={movie}
                    currentUserId={userId}
                    onUpdate={updateMovieRanking}
                    ranking={r.ranking ?? null}
                    seenIt={r.seen_it ?? false}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col divide-y">
              {movies.map((movie) => {
                const r = movie.rankings?.[0];
                if (!r) return null;
                return (
                  <MovieRowCard
                    key={movie.id}
                    movie={movie}
                    currentUserId={userId}
                    onUpdate={updateMovieRanking}
                    ranking={r.ranking ?? null}
                    seenIt={r.seen_it ?? false}
                  />
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

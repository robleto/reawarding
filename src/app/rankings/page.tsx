"use client";

import { useState } from "react";
import Link from "next/link";
import type { Movie } from "@/types/types";
import MoviePosterCard from "@/components/movie/MoviePosterCard";
import MovieRowCard from "@/components/movie/MovieRowCard";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import Loader from "@/components/ui/Loading";
import GuestDataBanner from "@/components/auth/GuestDataBanner";
import SavePromptBanner from "@/components/auth/SavePromptBanner";
import AuthModalManager from "@/components/auth/AuthModalManager";
import {
  useMovieDataWithGuest,
  useViewMode,
  useMovieFilters,
  SORT_OPTIONS,
  GROUP_OPTIONS,
  SortKey,
  GroupKey,
} from "@/utils/sharedMovieUtils";
import { useSavePromptBanner } from "@/hooks/useSavePromptBanner";

export const dynamic = "force-dynamic";

export default function RankingsPage() {
  const { movies, loading, userId, updateMovieRanking, isGuest } = useMovieDataWithGuest();
  const [viewMode, setViewMode] = useViewMode("list");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const savePromptBanner = useSavePromptBanner();
  
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

  const handleSignupClick = () => {
    setAuthMode("signup");
    setShowAuthModal(true);
  };

  const handleAuthSuccess = async () => {
    setShowAuthModal(false);
    // Migration will be handled automatically by the auth migration hook
    // The page will re-render with the updated data
  };

  const handleOpenModal = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedMovie(null);
    setIsModalOpen(false);
  };

  const isDataReady =
    hasMounted &&
    !loading &&
    movies.length > 0;

  if (!isDataReady) {
    return <Loader message="Loading films..." />;
  }

  // Show empty state for guests with no rankings
  if (isGuest && moviesWithRankings.length === 0) {
    return (
      <div className="max-w-screen-xl px-6 py-10 mx-auto">
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            Start Building Your Rankings
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Rate some movies to see them appear here! Head to the homepage or browse films to get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link 
              href="/"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Start Rating Movies
            </Link>
            <button
              onClick={handleSignupClick}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Sign Up to Save Progress
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state for authenticated users with no rankings
  if (!isGuest && moviesWithRankings.length === 0) {
    return (
      <div className="max-w-screen-xl px-6 py-10 mx-auto">
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            Start Building Your Rankings
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Rate some movies to see them appear here! Head to the homepage or browse films to get started.
          </p>
          <Link 
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Start Rating Movies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl px-6 py-10 mx-auto">
      {/* Guest Data Warning Banner */}
      {isGuest && <GuestDataBanner onSignupClick={handleSignupClick} />}

      {/* Save Prompt Banner for Guests */}
      {isGuest && (
        <SavePromptBanner
          visible={savePromptBanner.visible}
          onDismiss={savePromptBanner.onDismiss}
          onSignUp={handleSignupClick}
        />
      )}

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
                    onClick={() => handleOpenModal(movie)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col">
              {movies.map((movie, index) => {
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
                    isLast={index === movies.length - 1}
                    onClick={() => handleOpenModal(movie)}
                  />
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModalManager
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode={authMode}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {/* Movie Detail Modal */}
      {selectedMovie && (
        <MovieDetailModal
          movie={selectedMovie}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          initialRanking={selectedMovie.rankings?.[0]?.ranking ?? null}
          initialSeenIt={selectedMovie.rankings?.[0]?.seen_it ?? false}
        />
      )}
    </div>
  );
}

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
import MovieFilters from "@/components/filters/MovieFilters";

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

      <MovieFilters
        viewMode={viewMode}
        setViewMode={setViewMode}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        filterType={filterType}
        setFilterType={setFilterType}
        filterValue={filterValue}
        setFilterValue={setFilterValue}
        uniqueYears={uniqueYears}
        uniqueRanks={uniqueRanks}
      />

      {groupedMovies.map(({ key, movies }: { key: string; movies: Movie[] }) => (
        <div key={key} className="mb-10">
          {groupBy !== "none" && (
            <h2
              className="mb-6 text-4xl font-unbounded font-regular text-gray-800 dark:text-gray-100 tracking-wider"
            >
              {key}
            </h2>
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

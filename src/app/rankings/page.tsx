"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Movie } from "@/types/types";
import MoviePosterCard from "@/components/movie/MoviePosterCard";
import MovieRowCard from "@/components/movie/MovieRowCard";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import Loader from "@/components/ui/Loading";
import UnifiedBanner from "@/components/auth/UnifiedBanner";
import AuthModalManager from "@/components/auth/AuthModalManager";
import RankingsEmptyState from "@/components/rankings/RankingsEmptyState";
import {
  useMovieDataWithGuest,
  useViewMode,
  useMovieFilters,
  SORT_OPTIONS,
  GROUP_OPTIONS,
  SortKey,
  GroupKey,
  SortOrder,
  groupMovies,
} from "@/utils/sharedMovieUtils";
import MovieFilters from "@/components/filters/MovieFilters";
import RankingsStats from "@/components/rankings/RankingsStats";

export const dynamic = "force-dynamic";

export default function RankingsPage() {
  const searchParams = useSearchParams();
  const { movies, loading, userId, updateMovieRanking, isGuest } = useMovieDataWithGuest();
  // Use a rankings-specific view mode with list as default for tabular feel
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("rankingsViewMode") as "grid" | "list" | null;
      return stored || "list"; // Default to list for rankings
    }
    return "list";
  });

  // Save rankings-specific view mode preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("rankingsViewMode", viewMode);
    }
  }, [viewMode]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filter to only movies with rankings for the rankings page
  const moviesWithRankings = movies.filter((movie) => movie.rankings && movie.rankings.length > 0);
  
  // Rankings-specific filter state with custom defaults
  const [hasMounted, setHasMounted] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("rankingsSortBy") as SortKey;
      return stored || "ranking"; // Default to ranking for rankings page
    }
    return "ranking";
  });
  
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("rankingsSortOrder") as SortOrder;
      return stored || "desc"; // Default to desc for rankings page
    }
    return "desc";
  });
  
  const [groupBy, setGroupBy] = useState<GroupKey>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("rankingsGroupBy") as GroupKey;
      return stored || "release_year"; // Default to year grouping
    }
    return "release_year";
  });
  
  const [filterType, setFilterType] = useState<"none" | "year" | "rank" | "movie">("none");
  const [filterValue, setFilterValue] = useState<string>("all");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  // Handle rating filter from bar graph
  const handleRatingClick = (rating: number) => {
    if (selectedRating === rating) {
      // Toggle off if clicking same rating
      setSelectedRating(null);
      setFilterType("none");
      setFilterValue("all");
    } else {
      setSelectedRating(rating);
      setFilterType("rank");
      setFilterValue(String(rating));
    }
  };

  // Apply preset from nav search (?movie=<id> or ?query=)
  useEffect(() => {
    const movieId = searchParams.get("movie");
    const q = searchParams.get("query");
    if (movieId) {
      setFilterType("movie");
      setFilterValue(String(movieId));
    } else if (q) {
      const match = movies.find(m => m.title.toLowerCase().includes(q.toLowerCase()));
      if (match) {
        setFilterType("movie");
        setFilterValue(String(match.id));
      }
    }
  }, [searchParams, movies]);
  
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // One-time migration: reset old stored defaults so the new Year-grouped default takes effect
  useEffect(() => {
    if (typeof window !== "undefined") {
      const versionKey = "rankingsDefaultsVersion";
      const current = localStorage.getItem(versionKey);
      if (current !== "3") {
        try {
          localStorage.removeItem("rankingsGroupBy");
          localStorage.removeItem("rankingsSortBy");
          localStorage.removeItem("rankingsSortOrder");
          localStorage.setItem(versionKey, "3");
        } catch {}
      }
    }
  }, []);
  
  // Save rankings-specific filter state
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("rankingsSortBy", sortBy);
      localStorage.setItem("rankingsSortOrder", sortOrder);
      localStorage.setItem("rankingsGroupBy", groupBy);
    }
  }, [sortBy, sortOrder, groupBy]);
  
  // Filter movies based on current filter settings
  const filteredMovies = moviesWithRankings.filter((movie) => {
    if (filterType === "year") {
      return filterValue === "all" || movie.release_year === Number(filterValue);
    }
    if (filterType === "rank") {
      return filterValue === "all" || movie.rankings?.[0]?.ranking === Number(filterValue);
    }
    if (filterType === "movie") {
      return String(movie.id) === filterValue;
    }
    return true;
  });
  
  // Use shared grouping/sorting for consistency across pages
  const groupedMovies = groupMovies(filteredMovies, groupBy, sortBy, sortOrder);
  
  // Generate unique years and ranks for filter dropdowns
  const uniqueYears = Array.from(new Set(moviesWithRankings.map((m) => m.release_year).filter((y): y is number => typeof y === 'number'))).sort((a, b) => b - a);
  const uniqueRanks = Array.from(
    new Set(
      moviesWithRankings
        .map((m) => m.rankings?.[0]?.ranking)
        .filter((rank): rank is number => typeof rank === "number")
    )
  ).sort((a, b) => a - b);

  const handleSignupClick = () => {
    setAuthMode("signup");
    setShowAuthModal(true);
  };

  const handleLoginClick = () => {
    setAuthMode("login");
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

  const handleModalUpdate = (movieId: number, newRanking: number | null, newSeenIt: boolean) => {
    updateMovieRanking(movieId, { ranking: newRanking, seen_it: newSeenIt });
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
      <div className="max-w-screen-xl">
        <RankingsEmptyState 
          isGuest={true} 
          onSignupClick={handleSignupClick}
        />
      </div>
    );
  }

  // Show empty state for authenticated users with no rankings
  if (!isGuest && moviesWithRankings.length === 0) {
    return (
      <div className="max-w-screen-xl px-6 py-10 mx-auto">
        <RankingsEmptyState 
          isGuest={false}
        />
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl">
      {/* Guest Data Warning Banner */}
      {isGuest && (
        <UnifiedBanner 
          onSignupClick={handleSignupClick} 
          onLoginClick={handleLoginClick} 
        />
      )}

      {/* Rankings Statistics */}
      <RankingsStats movies={moviesWithRankings} onRatingClick={handleRatingClick} />

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
        defaults={{
          viewMode: "list",
          sortBy: "ranking",
          sortOrder: "desc",
          groupBy: "release_year",
          filterType: "none",
          filterValue: "all"
        }}
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
                    currentUserId={userId ?? ""}
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
                    currentUserId={userId ?? ""}
                    onUpdate={updateMovieRanking}
                    ranking={r.ranking ?? null}
                    seenIt={r.seen_it ?? false}
                    isLast={index === movies.length - 1}
                    index={index} // Add index for row numbering
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
          onUpdate={handleModalUpdate}
          initialRanking={selectedMovie.rankings?.[0]?.ranking ?? null}
          initialSeenIt={selectedMovie.rankings?.[0]?.seen_it ?? false}
        />
      )}
    </div>
  );
}

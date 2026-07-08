"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Flame } from "lucide-react";
import type { Movie } from "@/types/types";
import MovieCard from "@/components/award/MovieCard";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import Loader from "@/components/ui/Loading";
import RankingsEmptyState from "@/components/rankings/RankingsEmptyState";
import ScreenState from "@/components/ui/ScreenState";
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
import HotTakeIndicator from "@/components/rankings/HotTakeIndicator";
import { getRatingDefinition } from "@/lib/ratingScale";
import { useAuthState } from "@/hooks/useAuthState";

// Loading skeleton constants
const GRID_SKELETON_COUNT = 12;
const LIST_SKELETON_COUNT = 8;

export const dynamic = "force-dynamic";

export default function RankingsPage() {
  return (
    <Suspense fallback={<Loader message="Loading rankings..." />}>
      <RankingsPageContent />
    </Suspense>
  );
}

function getMovieRating(movie: Movie) {
  const rating = movie.rankings?.[0]?.ranking;
  return typeof rating === "number" ? rating : null;
}

function isRankedMovie(movie: Movie) {
  const rating = getMovieRating(movie);
  return typeof rating === "number" && rating >= 1 && rating <= 10;
}

function isUnrankedMovie(movie: Movie) {
  return movie.rankings?.[0]?.seen_it === true && getMovieRating(movie) == null;
}

function RankingsPageContent() {
  const searchParams = useSearchParams();
  const { status } = useAuthState();
  const { movies, loading, userId, updateMovieRanking, isGuest, error } = useMovieDataWithGuest();
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
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unranked" | "hot-takes">("all");
  
  const rankedMovies = movies.filter(isRankedMovie);
  const unrankedMovies = movies.filter(isUnrankedMovie);
  
  // Calculate hot takes (movies with significant rating disparity)
  const hotTakes = rankedMovies.filter((movie) => {
    const myRating = getMovieRating(movie) || 0;
    
    // Convert ratings to 10-point scale
    const imdbRating = movie.imdb_rating || 0; // Already 0-10
    const metacriticRating = movie.metacritic_score ? movie.metacritic_score / 10 : 0; // Convert 0-100 to 0-10
    
    // Use IMDB if available, otherwise Metacritic
    const criticsRating = imdbRating > 0 ? imdbRating : metacriticRating;
    
    // Calculate disparity (minimum 2 points difference)
    const disparity = Math.abs(myRating - criticsRating);
    
    return criticsRating > 0 && disparity >= 2;
  }).map(movie => {
    const myRating = movie.rankings?.[0]?.ranking || 0;
    const imdbRating = movie.imdb_rating || 0;
    const metacriticRating = movie.metacritic_score ? movie.metacritic_score / 10 : 0;
    const criticsRating = imdbRating > 0 ? imdbRating : metacriticRating;
    const disparity = myRating - criticsRating;
    
    return {
      ...movie,
      disparity,
      criticsRating,
      source: imdbRating > 0 ? 'IMDB' : 'Metacritic'
    };
  }).sort((a, b) => Math.abs(b.disparity) - Math.abs(a.disparity)); // Sort by biggest disparity
  
  // Use appropriate movie list based on active tab
  const displayMovies =
    activeTab === "hot-takes"
      ? hotTakes
      : activeTab === "unranked"
        ? [...unrankedMovies, ...rankedMovies]
        : rankedMovies;
  
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
  
  const [filterType, setFilterType] = useState<"none" | "year" | "rank" | "movie" | "search" | "genre">("none");
  const [filterValue, setFilterValue] = useState<string>("all");

  // Apply preset from nav search (?movie=<id> or ?query=)
  useEffect(() => {
    const movieId = searchParams?.get("movie");
    const q = searchParams?.get("query");
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
  
    // Filter movies based on search, year, rank, etc.
  const filteredMovies = displayMovies.filter((movie) => {
    if (filterType === "year") {
      return filterValue === "all" || movie.release_year === Number(filterValue);
    }
    if (filterType === "rank") {
      return filterValue === "all" || movie.rankings?.[0]?.ranking === Number(filterValue);
    }
    if (filterType === "movie") {
      return String(movie.id) === filterValue;
    }
    if (filterType === "search") {
      return movie.title.toLowerCase().includes(filterValue.toLowerCase());
    }
    return true;
  });
  
  // Use shared grouping/sorting for consistency across pages
  const groupedMovies = groupMovies(filteredMovies, groupBy, sortBy, sortOrder);
  const filteredUnrankedMovies = filteredMovies.filter(isUnrankedMovie);
  
  // Generate unique years and ranks for filter dropdowns
  const uniqueYears = Array.from(new Set(displayMovies.map((m) => m.release_year).filter((y): y is number => typeof y === 'number'))).sort((a, b) => b - a);
  const uniqueRanks = Array.from(
    new Set(
      rankedMovies
        .map((m) => m.rankings?.[0]?.ranking)
        .filter((rank): rank is number => typeof rank === "number")
    )
  ).sort((a, b) => a - b);

  const handleOpenModal = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedMovie(null);
    setIsModalOpen(false);
  };

  const handleModalUpdate = (movieId: string, newRanking: number | null, newSeenIt: boolean) => {
    updateMovieRanking(movieId, { ranking: newRanking, seen_it: newSeenIt });
  };

  const handleEmptyStateSelect = (movie: Movie) => {
    updateMovieRanking(movie.id, { seen_it: true, ranking: 10 });
  };

  const isDataReady =
    hasMounted &&
    !loading &&
    movies.length > 0;

  if (status === "unauthenticated") {
    return (
      <ScreenState
        testId="screen-state-auth-required"
        title="Sign in to view your rankings"
        message="Rankings are tied to your account. Sign in to load your ratings and hot takes."
        primaryAction={{ label: "Sign In", href: "/login" }}
        secondaryAction={{ label: "Back Home", href: "/" }}
      />
    );
  }

  // Show skeleton loader while loading
  if (!hasMounted || loading) {
    return (
      <div className="max-w-screen-xl px-6 py-10 mx-auto">
        <div className="mb-6">
          <div className="h-8 w-48 bg-gray-700 rounded animate-pulse mb-4" />
          <div className="h-4 w-64 bg-gray-700 rounded animate-pulse" />
        </div>
        {viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
            {Array.from({ length: GRID_SKELETON_COUNT }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[2/3] bg-gray-700 rounded-lg mb-2" />
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from({ length: LIST_SKELETON_COUNT }).map((_, i) => (
              <div key={i} className="flex gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700 animate-pulse">
                <div className="w-20 h-28 bg-gray-700 rounded flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-5 bg-gray-700 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-700 rounded w-1/2 mb-2" />
                  <div className="h-4 bg-gray-700 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (status === "authenticated" && error) {
    return (
      <ScreenState
        testId="screen-state-fetch-failure"
        tone="error"
        title="Couldn't load your rankings"
        message="We couldn't verify your rankings state, so this screen is staying closed instead of showing stale or partial data."
        primaryAction={{ label: "Back Home", href: "/" }}
      />
    );
  }

  // Show empty state for authenticated users with no rankings
  if (!isGuest && rankedMovies.length === 0 && unrankedMovies.length === 0) {
    return (
      <div className="max-w-screen-xl px-6 py-10 mx-auto">
        <RankingsEmptyState onSelectMovie={handleEmptyStateSelect} />
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl">
      {/* Tab Navigation */}
      <div className="mb-6 flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-3 text-sm font-medium transition-colors relative ${
            activeTab === "all"
              ? "text-yellow-400 border-b-2 border-yellow-400"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          All Rankings
          <span className="ml-2 text-xs text-gray-500">({rankedMovies.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("unranked")}
          className={`px-4 py-3 text-sm font-medium transition-colors relative ${
            activeTab === "unranked"
              ? "text-blue-300 border-b-2 border-blue-300"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Unranked
          <span className="ml-2 text-xs text-gray-500">({unrankedMovies.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("hot-takes")}
          className={`px-4 py-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
            activeTab === "hot-takes"
              ? "text-orange-400 border-b-2 border-orange-400"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          <Flame className="w-4 h-4" />
          Hot Takes
          <span className="ml-1 text-xs text-gray-500">({hotTakes.length})</span>
        </button>
      </div>

      <MovieFilters
        localSearchMode={true}
        availableMovies={displayMovies}
        searchContext={activeTab === "hot-takes" ? "hot takes" : activeTab === "unranked" ? "unranked films" : "rankings"}
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

      {activeTab === "unranked" && filteredUnrankedMovies.length === 0
        ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-8 text-center">
            <h2 className="text-2xl font-semibold text-emerald-200">You&apos;re all caught up</h2>
            <p className="mt-2 text-sm text-emerald-100/80">
              Congrats. Every film you&apos;ve marked as seen has a rating.
            </p>
          </div>
        )
        : groupedMovies.map(({ key, movies }: { key: string; movies: Movie[] }) => {
            const rankedGroupMovies = movies.filter(isRankedMovie);
            const unrankedGroupMovies = activeTab === "unranked" ? movies.filter(isUnrankedMovie) : [];

            const renderMovieSection = (sectionMovies: Movie[], sectionType: "unranked" | "ranked") => {
              if (sectionMovies.length === 0) return null;

              return (
                <div className={sectionType === "unranked" ? "mb-8" : ""}>
                  {activeTab === "unranked" && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-100">Unranked</h3>
                      <p className="mt-1 text-sm text-gray-400">
                        Films you&apos;ve seen but haven&apos;t rated yet
                      </p>
                    </div>
                  )}

                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {sectionMovies.map((movie, index) => {
                        const r = movie.rankings?.[0];
                        if (!r) return null;

                        const rating = getMovieRating(movie);
                        const def = rating != null ? getRatingDefinition(rating) : null;

                        return (
                          <div key={movie.id} className="relative">
                            <MovieCard
                              movie={movie}
                              variant="large"
                              rank={sectionType === "ranked" ? index + 1 : undefined}
                              ranking={rating}
                              seenIt={r.seen_it ?? false}
                              onUpdate={updateMovieRanking}
                              onClick={() => handleOpenModal(movie)}
                            />
                            {activeTab === "hot-takes" && rating != null && (
                              <div className="mt-2">
                                <HotTakeIndicator
                                  myRating={rating}
                                  imdbRating={movie.imdb_rating}
                                  metacriticScore={movie.metacritic_score}
                                  compact={true}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {sectionMovies.map((movie, index) => {
                        const r = movie.rankings?.[0];
                        if (!r) return null;

                        const rating = getMovieRating(movie);
                        const def = rating != null ? getRatingDefinition(rating) : null;

                        return (
                          <MovieCard
                            key={movie.id}
                            movie={movie}
                            variant="compact"
                            rank={sectionType === "ranked" ? index + 1 : undefined}
                            ranking={rating}
                            ratingLabel={def?.label ?? null}
                            seenIt={r.seen_it ?? false}
                            showHotTake={activeTab === "hot-takes"}
                            showYear
                            incomplete={sectionType === "unranked"}
                            onUpdate={updateMovieRanking}
                            onClick={() => handleOpenModal(movie)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            };

            return (
              <div key={key} className="mb-10">
                {groupBy !== "none" && (
                  <h2
                    className="mb-6 text-4xl font-unbounded font-regular text-gray-100 tracking-wider"
                  >
                    {key}
                  </h2>
                )}
                {activeTab === "unranked"
                  ? renderMovieSection(unrankedGroupMovies, "unranked")
                  : renderMovieSection(rankedGroupMovies, "ranked")}
              </div>
            );
          })}

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

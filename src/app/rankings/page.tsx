"use client";

import { useState, useEffect, useRef, Suspense } from "react";
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

// Progressive rendering — the full list can exceed 1,000 rows, which locks up
// mobile browsers if mounted all at once. Render in batches; a sentinel below
// the list extends the window as the user approaches it.
const INITIAL_VISIBLE_ROWS = 60;
const VISIBLE_ROWS_BATCH = 120;

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
  const [activeTab, setActiveTab] = useState<"all" | "hot-takes">("all");
  
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
  
  // Use appropriate movie list based on active tab. "All" includes unranked
  // (seen but not yet rated) movies too, so the Filter By: Rating -> "No
  // Rating" option below has something to narrow down to — there's no
  // dedicated Unranked tab anymore.
  const displayMovies =
    activeTab === "hot-takes"
      ? hotTakes
      : [...unrankedMovies, ...rankedMovies];
  
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
      if (filterValue === "all") return true;
      if (filterValue === "unranked") return isUnrankedMovie(movie);
      return movie.rankings?.[0]?.ranking === Number(filterValue);
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

  // ── Progressive rendering window ──
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ROWS);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const totalRows = filteredMovies.length;
  const hasMoreRows = totalRows > visibleCount;

  // Reset the window whenever the underlying list changes shape
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_ROWS);
  }, [activeTab, filterType, filterValue, sortBy, sortOrder, groupBy]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMoreRows) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => count + VISIBLE_ROWS_BATCH);
        }
      },
      { rootMargin: "1600px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMoreRows, visibleCount]);

  // Full per-group totals for the heading tallies — visibleGroupedMovies
  // below is sliced to the render window, so its lengths undercount.
  const groupTotals = new Map(
    groupedMovies.map((g) => [
      g.key,
      g.movies.length,
    ])
  );

  // Cap rendered rows at visibleCount across groups, preserving group order
  // (and therefore the per-group rank numbering, which slices from the top).
  let rowsLeft = visibleCount;
  const visibleGroupedMovies: { key: string; movies: Movie[] }[] = [];
  for (const group of groupedMovies) {
    if (rowsLeft <= 0) break;
    const slice = group.movies.slice(0, rowsLeft);
    visibleGroupedMovies.push({ key: group.key, movies: slice });
    rowsLeft -= slice.length;
  }
  
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

  // LOOP-1 (docs/audits/2026-08-21-launch-readiness-round3.md): this used to
  // write a fabricated ranking: 10 the instant a movie was picked, with no
  // rating UI at all — collapsing Watch and Rate into one gesture (CLAUDE.md
  // Guardrail 10) and silently promoting the film into that year's Best
  // Picture ballot via the 7+ auto-nominate rule. Open the same
  // MovieDetailModal every other movie uses instead, so the user goes
  // through the real Watch→Rate flow and chooses their own score.
  const handleEmptyStateSelect = (movie: Movie) => {
    handleOpenModal(movie);
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
        message="Your ratings live on your account. Sign in to pick up where you left off."
        primaryAction={{ label: "Sign In", href: "/login" }}
        secondaryAction={{ label: "Back Home", href: "/" }}
      />
    );
  }

  // Same loading spinner every other page uses (Films, Lists) instead of a
  // bespoke skeleton — the skeleton's fixed proportions (w-20 h-28 thumb,
  // generic gray blocks) don't track the actual native row layout and drift
  // out of sync with it, which reads as "wrong layout" while loading.
  if (!hasMounted || loading) {
    return <Loader message="Loading rankings..." />;
  }

  if (status === "authenticated" && error) {
    return (
      <ScreenState
        testId="screen-state-fetch-failure"
        tone="error"
        title="Couldn't load your rankings"
        message="Your rankings didn't load. Head home and come back."
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
      <div className="mb-3 sm:mb-6 flex gap-1 sm:gap-2 border-b border-gray-700 overflow-x-auto [scrollbar-width:none]">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-2.5 sm:px-4 py-2.5 sm:py-3 text-sm font-medium transition-colors relative whitespace-nowrap flex-shrink-0 ${
            activeTab === "all"
              ? "text-yellow-400 border-b-2 border-yellow-400"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          <span className="sm:hidden">All</span>
          <span className="hidden sm:inline">All Rankings</span>
          <span className="ml-1.5 font-mono text-xs text-gray-500">({rankedMovies.length + unrankedMovies.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("hot-takes")}
          className={`px-2.5 sm:px-4 py-2.5 sm:py-3 text-sm font-medium transition-colors relative flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
            activeTab === "hot-takes"
              ? "text-orange-400 border-b-2 border-orange-400"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          <Flame className="w-4 h-4" />
          Hot Takes
          <span className="ml-0.5 font-mono text-xs text-gray-500">({hotTakes.length})</span>
        </button>
      </div>

      <MovieFilters
        localSearchMode={true}
        availableMovies={displayMovies}
        searchContext={activeTab === "hot-takes" ? "hot takes" : "rankings"}
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
        compact
      />

      {visibleGroupedMovies.map(({ key, movies }: { key: string; movies: Movie[] }) => (
        <div key={key} className="mb-6 sm:mb-10">
          {groupBy !== "none" && (
            <h2
              className="mb-2 text-2xl sm:mb-5 sm:text-4xl font-unbounded font-regular text-gray-100 tracking-wider flex items-baseline gap-2.5"
            >
              {key}
              <span className="font-mono text-xs sm:text-sm font-normal tracking-normal text-gray-500">
                {groupTotals.get(key)} {groupTotals.get(key) === 1 ? "film" : "films"}
              </span>
            </h2>
          )}

          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {movies.map((movie, index) => {
                const r = movie.rankings?.[0];
                if (!r) return null;

                const rating = getMovieRating(movie);
                const def = rating != null ? getRatingDefinition(rating) : null;

                return (
                  <div
                    key={movie.id}
                    className="relative [content-visibility:auto] [contain-intrinsic-size:auto_320px]"
                  >
                    <MovieCard
                      movie={movie}
                      variant="large"
                      rank={index + 1}
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
              {movies.map((movie, index) => {
                const r = movie.rankings?.[0];
                if (!r) return null;

                const rating = getMovieRating(movie);
                const def = rating != null ? getRatingDefinition(rating) : null;

                return (
                  // content-visibility skips layout/paint for offscreen
                  // rows so long lists stay scrollable once mounted.
                  <div
                    key={movie.id}
                    className="[content-visibility:auto] [contain-intrinsic-size:auto_120px]"
                  >
                    <MovieCard
                      movie={movie}
                      variant="compact"
                      rank={index + 1}
                      ranking={rating}
                      ratingLabel={def?.label ?? null}
                      seenIt={r.seen_it ?? false}
                      showHotTake={activeTab === "hot-takes"}
                      showYear
                      incomplete={!isRankedMovie(movie)}
                      onUpdate={updateMovieRanking}
                      onClick={() => handleOpenModal(movie)}
                      native
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Sentinel — extends the progressive-render window before the user
          reaches the bottom. Renders only while rows remain. */}
      {hasMoreRows && (
        <div ref={sentinelRef} aria-hidden="true" className="h-12" />
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

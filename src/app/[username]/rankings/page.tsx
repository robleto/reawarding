"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Flame } from "lucide-react";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import MovieCard from "@/components/award/MovieCard";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import MovieFilters from "@/components/filters/MovieFilters";
import HotTakeIndicator from "@/components/rankings/HotTakeIndicator";
import { getRatingDefinition } from "@/lib/ratingScale";
import {
  type SortKey,
  type GroupKey,
  type SortOrder,
  groupMovies,
} from "@/utils/sharedMovieUtils";
import type { Movie } from "@/types/types";

export default function ProfileRankingsPage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";
  const { movies, loading } = usePublicProfile(username);

  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "hot-takes">("all");
  const [sortBy, setSortBy] = useState<SortKey>("ranking");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [groupBy, setGroupBy] = useState<GroupKey>("release_year");
  const [filterType, setFilterType] = useState<"none" | "year" | "rank" | "movie" | "search" | "genre">("none");
  const [filterValue, setFilterValue] = useState<string>("all");

  // Only show movies with actual ratings (1-10)
  const moviesWithRankings = useMemo(
    () =>
      movies.filter((movie) => {
        const rating = movie.rankings?.[0]?.ranking;
        return typeof rating === "number" && rating >= 1 && rating <= 10;
      }),
    [movies]
  );

  // Hot takes — movies with significant rating disparity
  const hotTakes = useMemo(() => {
    return moviesWithRankings
      .filter((movie) => {
        const myRating = movie.rankings?.[0]?.ranking || 0;
        const imdbRating = movie.imdb_rating || 0;
        const metacriticRating = movie.metacritic_score ? movie.metacritic_score / 10 : 0;
        const criticsRating = imdbRating > 0 ? imdbRating : metacriticRating;
        const disparity = Math.abs(myRating - criticsRating);
        return criticsRating > 0 && disparity >= 2;
      })
      .map((movie) => {
        const myRating = movie.rankings?.[0]?.ranking || 0;
        const imdbRating = movie.imdb_rating || 0;
        const metacriticRating = movie.metacritic_score ? movie.metacritic_score / 10 : 0;
        const criticsRating = imdbRating > 0 ? imdbRating : metacriticRating;
        const disparity = myRating - criticsRating;
        return { ...movie, disparity, criticsRating, source: imdbRating > 0 ? "IMDB" : "Metacritic" };
      })
      .sort((a, b) => Math.abs(b.disparity) - Math.abs(a.disparity));
  }, [moviesWithRankings]);

  const displayMovies = activeTab === "hot-takes" ? hotTakes : moviesWithRankings;

  // Filtering
  const filteredMovies = displayMovies.filter((movie) => {
    if (filterType === "year") return filterValue === "all" || movie.release_year === Number(filterValue);
    if (filterType === "rank") {
      if (filterValue === "all") return true;
      if (filterValue === "unranked") {
        const r = movie.rankings?.[0]?.ranking;
        return r === null || r === undefined || r === 0;
      }
      return movie.rankings?.[0]?.ranking === Number(filterValue);
    }
    if (filterType === "movie") return String(movie.id) === filterValue;
    if (filterType === "search") return movie.title.toLowerCase().includes(filterValue.toLowerCase());
    return true;
  });

  const groupedMovies = groupMovies(filteredMovies, groupBy, sortBy, sortOrder);

  const uniqueYears = Array.from(
    new Set(moviesWithRankings.map((m) => m.release_year).filter((y): y is number => typeof y === "number"))
  ).sort((a, b) => b - a);

  const uniqueRanks = Array.from(
    new Set(moviesWithRankings.map((m) => m.rankings?.[0]?.ranking).filter((r): r is number => typeof r === "number" && r > 0))
  ).sort((a, b) => a - b);

  const handleOpenModal = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedMovie(null);
    setIsModalOpen(false);
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 border-b-2 border-yellow-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading rankings...</p>
        </div>
      </div>
    );
  }

  if (moviesWithRankings.length === 0) {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-semibold text-white mb-2">No rankings yet</h3>
        <p className="text-gray-400 text-sm">@{username} hasn&apos;t rated any movies yet.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Tab Navigation — matching MeepleGo style */}
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
          <span className="ml-2 text-xs text-gray-500">({moviesWithRankings.length})</span>
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
          filterValue: "all",
        }}
      />

      {groupedMovies.map(({ key, movies: groupMovieList }: { key: string; movies: Movie[] }) => (
        <div key={key} className="mb-10">
          {groupBy !== "none" && (
            <h2 className="mb-6 text-4xl font-unbounded font-regular text-gray-100 tracking-wider">
              {key}
            </h2>
          )}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-5">
              {groupMovieList.map((movie) => {
                const r = movie.rankings?.[0];
                if (!r) return null;
                const def = getRatingDefinition(r.ranking);
                return (
                  <div key={movie.id} className="relative">
                    <MovieCard
                      movie={movie}
                      variant="grid"
                      ranking={r.ranking ?? null}
                      ratingLabel={def?.label ?? null}
                      seenIt={r.seen_it ?? false}
                      onClick={() => handleOpenModal(movie)}
                    />
                    {activeTab === "hot-takes" && (
                      <div className="mt-2">
                        <HotTakeIndicator
                          myRating={r.ranking ?? 0}
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
              {groupMovieList.map((movie, index) => {
                const r = movie.rankings?.[0];
                if (!r) return null;
                const def = getRatingDefinition(r.ranking);
                return (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    variant="compact"
                    rank={index + 1}
                    ranking={r.ranking ?? null}
                    ratingLabel={def?.label ?? null}
                    seenIt={r.seen_it ?? false}
                    showHotTake={activeTab === "hot-takes"}
                    showYear
                    onClick={() => handleOpenModal(movie)}
                  />
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Movie Detail Modal — read-only view */}
      {selectedMovie && isModalOpen && (
        <MovieDetailModal
          movie={selectedMovie}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onUpdate={() => {}}
          initialRanking={selectedMovie.rankings?.[0]?.ranking ?? null}
          initialSeenIt={selectedMovie.rankings?.[0]?.seen_it ?? false}
        />
      )}
    </div>
  );
}

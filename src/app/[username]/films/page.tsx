"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import MovieCard from "@/components/award/MovieCard";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import MovieFilters from "@/components/filters/MovieFilters";
import {
  type SortKey,
  type GroupKey,
  type SortOrder,
  groupMovies,
} from "@/utils/sharedMovieUtils";
import type { Movie } from "@/types/types";

export default function ProfileFilmsPage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";
  const { movies: allMovies, loading } = usePublicProfile(username);

  // Films page shows only "seen" movies
  const movies = useMemo(
    () => allMovies.filter((m) => m.rankings?.[0]?.seen_it),
    [allMovies]
  );

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("title");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [groupBy, setGroupBy] = useState<GroupKey>("release_year");
  const [filterType, setFilterType] = useState<"none" | "year" | "rank" | "movie" | "search" | "genre">("none");
  const [filterValue, setFilterValue] = useState<string>("all");

  const filteredMovies = movies.filter((movie) => {
    if (filterType === "year") return filterValue === "all" || movie.release_year === Number(filterValue);
    if (filterType === "rank") return filterValue === "all" || movie.rankings?.[0]?.ranking === Number(filterValue);
    if (filterType === "movie") return String(movie.id) === filterValue;
    if (filterType === "search") return movie.title.toLowerCase().includes(filterValue.toLowerCase());
    return true;
  });

  const groupedMovies = groupMovies(filteredMovies, groupBy, sortBy, sortOrder);

  const uniqueYears = Array.from(
    new Set(movies.map((m) => m.release_year).filter((y): y is number => typeof y === "number"))
  ).sort((a, b) => b - a);

  const uniqueRanks = Array.from(
    new Set(movies.map((m) => m.rankings?.[0]?.ranking).filter((r): r is number => typeof r === "number"))
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
          <p className="text-gray-400 text-sm">Loading films...</p>
        </div>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-semibold text-white mb-2">No films logged yet</h3>
        <p className="text-gray-400 text-sm">@{username} hasn&apos;t marked any movies as seen yet.</p>
      </div>
    );
  }

  return (
    <div>
      <MovieFilters
        localSearchMode={true}
        availableMovies={movies}
        searchContext="films"
        persistentFilterLabels={["Seen only"]}
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
          viewMode: "grid",
          sortBy: "title",
          sortOrder: "asc",
          groupBy: "release_year",
          filterType: "none",
          filterValue: "all",
        }}
      />

      {filteredMovies.length === 0 && filterType !== "none" ? (
        <div className="mt-8 rounded-xl border border-gray-700 bg-gray-900 p-8 text-center">
          <h3 className="text-xl font-semibold text-white mb-2">No films found</h3>
          <p className="text-sm text-gray-400">Try adjusting your search or filters.</p>
        </div>
      ) : (
        groupedMovies.map(({ key, movies: groupMovieList }: { key: string; movies: Movie[] }) => (
          <div key={key} className="mb-10">
            {groupBy !== "none" && (
              <h2 className="mb-6 text-2xl font-unbounded font-regular text-gray-100 tracking-wider">
                {key}
              </h2>
            )}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {groupMovieList.map((movie) => {
                  const r = movie.rankings?.[0];
                  return (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      variant="large"
                      ranking={r?.ranking ?? null}
                      seenIt={r?.seen_it ?? false}
                      onClick={() => handleOpenModal(movie)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col">
                {groupMovieList.map((movie, index) => {
                  const r = movie.rankings?.[0];
                  return (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      variant="compact"
                      rank={index + 1}
                      ranking={r?.ranking ?? null}
                      seenIt={r?.seen_it ?? false}
                      showYear
                      onClick={() => handleOpenModal(movie)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ))
      )}

      {/* Movie Detail Modal — read-only */}
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

"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Trophy, Star } from "lucide-react";
import { supabase } from "@/lib/supabaseBrowser";
import type { Movie } from "@/types/types";
import { getActualWinner } from "@/data/bestPictureWinners";
import { getAwardsDataForYear } from "@/utils/awardAssembly";
import MovieSearchPicker from "./MovieSearchPicker";
import MoviePosterCard from "@/components/movie/MoviePosterCard";

interface Props {
  year: number;
  allMovies: Movie[];
  currentUserId: string;
  onCreateAward: (movie: Movie) => void;
  onCreateFromRatings: (
    year: number,
    nominees: Movie[],
    winner: Movie
  ) => void;
  onUpdateMovieRanking: (
    movieId: number,
    updates: { seen_it?: boolean; ranking?: number | null }
  ) => void;
  onClose: () => void;
}

type Mode = "pick" | "rate";

const INITIAL_LOAD = 24;

/**
 * YearExplorer — opens inline on the homepage below year chips.
 *
 * Two modes:
 * - "Pick your winner" (default) — opinion-first, tap a movie to create award
 * - "Rate what you've seen" — assembly mode, rate movies then auto-assemble
 */
export default function YearExplorer({
  year,
  allMovies,
  currentUserId,
  onCreateAward,
  onCreateFromRatings,
  onUpdateMovieRanking,
  onClose,
}: Props) {
  const [mode, setMode] = useState<Mode>("pick");
  const [yearMovies, setYearMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD);

  const actualWinner = getActualWinner(year);

  // Fetch movies for this year, sorted by vote_count desc
  useEffect(() => {
    async function fetchYearMovies() {
      setLoading(true);

      // First check allMovies for this year (already loaded)
      const fromMemory = allMovies.filter(
        (m) => m.release_year === year
      );

      if (fromMemory.length > 0) {
        // Sort: vote_count desc, then tmdb_rating desc, then alphabetical
        const sorted = [...fromMemory].sort((a, b) => {
          const aVotes = (a as any).vote_count ?? 0;
          const bVotes = (b as any).vote_count ?? 0;
          if (bVotes !== aVotes) return bVotes - aVotes;
          const aRating = a.tmdb_rating ?? 0;
          const bRating = b.tmdb_rating ?? 0;
          if (bRating !== aRating) return bRating - aRating;
          return a.title.localeCompare(b.title);
        });
        setYearMovies(sorted);
        setLoading(false);
        return;
      }

      // Fallback: fetch from DB
      const { data, error } = await supabase
        .from("movies")
        .select("id, title, release_year, poster_url, thumb_url, vote_count, tmdb_rating")
        .eq("release_year", year)
        .order("vote_count", { ascending: false, nullsFirst: false })
        .limit(200);

      if (!error && data) {
        setYearMovies(data as Movie[]);
      }
      setLoading(false);
    }

    fetchYearMovies();
    setVisibleCount(INITIAL_LOAD);
  }, [year, allMovies]);

  // Assembly mode: live preview of auto-assembled award
  const assemblyData = getAwardsDataForYear(allMovies, year, 1);
  const ratedCountForYear = assemblyData.rankedCount;
  const canAssemble = ratedCountForYear >= 5;

  const handleAssemble = useCallback(() => {
    if (!assemblyData.winner || !canAssemble) return;
    onCreateFromRatings(year, assemblyData.nominees, assemblyData.winner);
  }, [year, assemblyData, canAssemble, onCreateFromRatings]);

  const visibleMovies = yearMovies.slice(0, visibleCount);
  const hasMore = visibleCount < yearMovies.length;

  return (
    <div className="bg-gray-900/80 border border-gray-700/50 rounded-xl p-4 md:p-6 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white font-unbounded">{year}</h3>
          {actualWinner && (
            <p className="text-xs text-gray-400">
              The Academy chose <span className="text-yellow-400">{actualWinner.title}</span>
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
          aria-label="Close year explorer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 mb-4 bg-gray-800/50 rounded-lg p-1">
        <button
          onClick={() => setMode("pick")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "pick"
              ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          Pick your winner
        </button>
        <button
          onClick={() => setMode("rate")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "rate"
              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          Rate what you&apos;ve seen
        </button>
      </div>

      {/* Search (both modes) */}
      <div className="mb-4">
        <MovieSearchPicker
          onSelect={(movie) => {
            if (mode === "pick") {
              onCreateAward(movie);
            }
          }}
          filterByYear={year}
          placeholder={`Search ${year} movies...`}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-lg bg-gray-800 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty year */}
      {!loading && yearMovies.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400 mb-2">
            We don&apos;t have many films indexed for {year} yet.
          </p>
          <p className="text-xs text-gray-500">
            Search by name above or{" "}
            <a
              href="/help/add-movie"
              className="text-blue-400 hover:underline"
            >
              add one by TMDB ID
            </a>
          </p>
        </div>
      )}

      {/* Mode A: Pick your winner — poster grid */}
      {!loading && yearMovies.length > 0 && mode === "pick" && (
        <>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {visibleMovies.map((movie) => (
              <button
                key={movie.id}
                onClick={() => onCreateAward(movie)}
                className="group relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 border-2 border-transparent hover:border-yellow-400 transition-colors"
              >
                {movie.poster_url ? (
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-1">
                    <span className="text-[10px] text-gray-500 text-center leading-tight">
                      {movie.title}
                    </span>
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                  <span className="text-[10px] text-white leading-tight line-clamp-2">
                    {movie.title}
                  </span>
                </div>
              </button>
            ))}
          </div>
          {hasMore && (
            <button
              onClick={() => setVisibleCount((c) => c + INITIAL_LOAD)}
              className="mt-4 w-full py-2 text-sm text-gray-400 hover:text-gray-200 bg-gray-800/50 hover:bg-gray-800/80 rounded-lg transition-colors"
            >
              Load more ({yearMovies.length - visibleCount} remaining)
            </button>
          )}
        </>
      )}

      {/* Mode B: Rate what you've seen */}
      {!loading && yearMovies.length > 0 && mode === "rate" && (
        <>
          {/* Live preview */}
          {ratedCountForYear > 0 && (
            <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <p className="text-xs text-gray-400">
                Based on your ratings:{" "}
                {assemblyData.winner ? (
                  <span className="text-yellow-300 font-medium">
                    {assemblyData.winner.title}
                  </span>
                ) : (
                  <span className="text-gray-500">No winner yet</span>
                )}
                {assemblyData.nominees.length > 1 && (
                  <span className="text-gray-500">
                    {" "}
                    with {assemblyData.nominees.length} nominee
                    {assemblyData.nominees.length !== 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Poster grid with rating mode */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {visibleMovies.map((movie) => {
              const r = movie.rankings?.[0];
              return (
                <div key={movie.id} className="w-full">
                  <MoviePosterCard
                    movie={movie}
                    currentUserId={currentUserId}
                    ranking={r?.ranking ?? null}
                    seenIt={r?.seen_it ?? false}
                    onUpdate={onUpdateMovieRanking}
                  />
                </div>
              );
            })}
          </div>

          {hasMore && (
            <button
              onClick={() => setVisibleCount((c) => c + INITIAL_LOAD)}
              className="mt-4 w-full py-2 text-sm text-gray-400 hover:text-gray-200 bg-gray-800/50 hover:bg-gray-800/80 rounded-lg transition-colors"
            >
              Load more ({yearMovies.length - visibleCount} remaining)
            </button>
          )}

          {/* Assembly button */}
          <div className="mt-4">
            {canAssemble ? (
              <button
                onClick={handleAssemble}
                className="w-full py-3 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30 rounded-lg text-sm font-medium transition-colors"
              >
                Create award from ratings
              </button>
            ) : ratedCountForYear > 0 ? (
              <p className="text-center text-sm text-gray-500">
                Rate {5 - ratedCountForYear} more to generate nominees
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

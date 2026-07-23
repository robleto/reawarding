"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import MovieCard from "@/components/award/MovieCard";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import { useWatchlistContext } from "@/contexts/WatchlistContext";
import type { Movie } from "@/types/types";

interface WatchlistMovieRowProps {
  userId: string | null;
  username?: string | null;
}

export default function WatchlistMovieRow({ userId, username }: WatchlistMovieRowProps) {
  const supabase = useSupabaseClient();
  const { watchlistMovieIds, removeIfWatched } = useWatchlistContext();
  const removeIfWatchedRef = useRef(removeIfWatched);
  useEffect(() => { removeIfWatchedRef.current = removeIfWatched; });

  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch full movie data (including rankings) for the watchlisted IDs whenever the set changes.
  // removeIfWatched intentionally omitted from deps — it changes every time watchlistMovieIds
  // changes (which is already in deps), so including it would cause a double-fire cascade.
  // We access the latest version via ref instead.
  useEffect(() => {
    if (!userId || watchlistMovieIds.size === 0) {
      setMovies([]);
      return;
    }
    const ids = Array.from(watchlistMovieIds);
    supabase
      .from("movies")
      .select("*, rankings(id, seen_it, ranking, user_id)")
      .in("id", ids)
      .then(
        ({ data }) => {
          if (!data) return;
          // Filtering the embed with .eq("rankings.user_id", ...) would force
          // an inner join and drop every movie with no ranking at all — the
          // watchlist's common case. Keep the left join, scope client-side.
          const fetched = (data as Movie[]).map((m) => ({
            ...m,
            rankings: (m.rankings ?? []).filter((r) => r.user_id === userId),
          }));
          // Silently clean up any stale seen-but-watchlisted entries
          fetched.forEach((m) => {
            if (m.rankings?.[0]?.seen_it) removeIfWatchedRef.current(m.id).catch(() => {});
          });
          setMovies(fetched.filter((m) => !m.rankings?.[0]?.seen_it));
        },
        () => {}
      );
  }, [userId, watchlistMovieIds, supabase]);

  // When watchlistMovieIds shrinks (film removed), drop it from local state immediately
  useEffect(() => {
    setMovies((prev) => prev.filter((m) => watchlistMovieIds.has(m.id)));
  }, [watchlistMovieIds]);

  // Update seen_it / ranking and reflect the change locally
  const handleUpdateMovie = useCallback(async (
    movieId: string,
    updates: { seen_it?: boolean; ranking?: number | null }
  ) => {
    if (!userId) return;
    await supabase
      .from("rankings")
      .upsert({ user_id: userId, movie_id: movieId, ...updates }, { onConflict: "user_id,movie_id" });
    setMovies((prev) =>
      prev.map((m) =>
        m.id === movieId
          ? {
              ...m,
              rankings: [
                {
                  ...(m.rankings?.[0] ?? { id: 0, user_id: userId, movie_id: movieId }),
                  ...updates,
                },
              ],
            }
          : m
      )
    );
  }, [userId, supabase]);

  if (!userId || movies.length === 0) return null;

  const watchlistHref = username ? `/${username}/watchlist` : "/watchlist";

  return (
    <section className="mb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xl font-bold text-white tracking-wide">Up Next</h2>
        <Link
          href={watchlistHref}
          className="text-blue-400 hover:underline text-sm font-medium"
        >
          See All
        </Link>
      </div>

      {/* Horizontal scroll rail */}
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {movies.map((movie) => {
          const r = movie.rankings?.[0];
          return (
            <div
              key={movie.id}
              className="flex-shrink-0 w-[160px] sm:w-[180px] snap-start"
            >
              <MovieCard
                movie={movie}
                variant="large"
                ranking={r?.ranking ?? null}
                seenIt={r?.seen_it ?? false}
                onUpdate={handleUpdateMovie}
                onClick={() => {
                  setSelectedMovie(movie);
                  setIsModalOpen(true);
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Movie Detail Modal */}
      {selectedMovie && isModalOpen && (
        <MovieDetailModal
          movie={selectedMovie}
          isOpen={isModalOpen}
          onClose={() => {
            setSelectedMovie(null);
            setIsModalOpen(false);
          }}
          onUpdate={() => {}}
          initialRanking={null}
          initialSeenIt={false}
        />
      )}
    </section>
  );
}

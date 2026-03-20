"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useAuthState } from "@/hooks/useAuthState";
import { useWatchlist } from "@/hooks/useWatchlist";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import MovieCard from "@/components/award/MovieCard";
import type { Movie } from "@/types/types";

export default function ProfileWatchlistPage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";
  const supabase = useSupabaseClient();
  const { user } = useAuthState();
  const { profile, loading: profileLoading, notFound } = usePublicProfile(username);

  const [watchlistMovies, setWatchlistMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Determine ownership by matching profile id with user id
  const isViewer = !!user && !!profile && profile.id === user.id;

  // Live watchlist toggle — only active when the viewer is the owner
  const { watchlistMovieIds, toggle: toggleWatchlist } = useWatchlist(isViewer ? (user?.id ?? null) : null);

  useEffect(() => {
    if (profileLoading || !profile) return;

    async function fetchWatchlist() {
      setLoading(true);
      const { data: listData } = await supabase
        .from("movie_lists")
        .select("id")
        .eq("user_id", profile!.id)
        .eq("list_type", "watchlist")
        .limit(1)
        .maybeSingle();

      if (!listData?.id) {
        setWatchlistMovies([]);
        setLoading(false);
        return;
      }

      const { data: items } = await supabase
        .from("movie_list_items")
        .select("movie_id")
        .eq("list_id", listData.id);

      if (!items || items.length === 0) {
        setWatchlistMovies([]);
        setLoading(false);
        return;
      }

      const movieIds = items.map((item) => item.movie_id as number);
      const { data: movies } = await supabase
        .from("movies")
        .select("*")
        .in("id", movieIds);

      setWatchlistMovies((movies as Movie[]) ?? []);
      setLoading(false);
    }

    fetchWatchlist();
  }, [profileLoading, profile, supabase]);

  // When the owner removes a film via the bookmark button, drop it from the list immediately
  useEffect(() => {
    if (!isViewer) return;
    setWatchlistMovies((prev) => prev.filter((m) => watchlistMovieIds.has(m.id)));
  }, [watchlistMovieIds, isViewer]);

  // Update seen_it / ranking for a watchlist film (owner only)
  const handleUpdateMovie = useCallback(async (
    movieId: number,
    updates: { seen_it?: boolean; ranking?: number | null }
  ) => {
    if (!isViewer || !user?.id) return;
    await supabase
      .from("rankings")
      .upsert({ user_id: user.id, movie_id: movieId, ...updates }, { onConflict: "user_id,movie_id" });
    // Reflect change locally so button states update immediately
    setWatchlistMovies((prev) =>
      prev.map((m) =>
        m.id === movieId
          ? {
              ...m,
              rankings: [
                {
                  ...(m.rankings?.[0] ?? { id: 0, user_id: user.id, movie_id: movieId }),
                  ...updates,
                },
              ],
            }
          : m
      )
    );
  }, [isViewer, user?.id, supabase]);

  if (profileLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 border-b-2 border-yellow-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading watchlist...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-white mb-2">User not found</h1>
        <p className="text-gray-400">No user with the username &ldquo;{username}&rdquo; exists.</p>
      </div>
    );
  }

  if (watchlistMovies.length === 0) {
    return (
      <div>
        {/* Placeholder poster grid */}
        <div
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 mb-8 pointer-events-none select-none"
          aria-hidden="true"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-xl bg-gray-800/50 border border-gray-700/20"
              style={{ opacity: Math.max(0.08, 0.25 - i * 0.03) }}
            />
          ))}
        </div>
        <div className="text-center -mt-4">
          <h3 className="text-lg font-semibold text-white mb-2">
            {isViewer ? "Your watchlist is empty" : "No films on the watchlist yet"}
          </h3>
          <p className="text-gray-400 text-sm">
            {isViewer
              ? 'Tap "Want to See" on any movie to queue it up here.'
              : `@${username} hasn't added any films to their watchlist yet.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {!isViewer && (
        <p className="mb-4 text-xs text-gray-500 italic">
          Only you can see this watchlist.
        </p>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {watchlistMovies.map((movie) => {
          const r = movie.rankings?.[0];
          return (
            <MovieCard
              key={movie.id}
              movie={movie}
              variant="large"
              ranking={r?.ranking ?? null}
              seenIt={r?.seen_it ?? false}
              onUpdate={isViewer ? handleUpdateMovie : undefined}
              onClick={() => {
                setSelectedMovie(movie);
                setIsModalOpen(true);
              }}
            />
          );
        })}
      </div>

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
    </div>
  );
}

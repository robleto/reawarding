"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useAuthState } from "@/hooks/useAuthState";
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

  const isOwner = !!user && !!profile && user.email !== undefined
    ? profile.username === username && (user.user_metadata?.username === username || user.email === undefined)
    : false;

  // Determine ownership by matching profile id with user id
  const isViewer = !!user && !!profile && profile.id === user.id;

  useEffect(() => {
    if (profileLoading || !profile) return;

    async function fetchWatchlist() {
      setLoading(true);
      // Find the watchlist list for this user
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

      // Get movie IDs in watchlist
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
      <div className="text-center py-16">
        <h3 className="text-lg font-semibold text-white mb-2">No films on the watchlist yet</h3>
        <p className="text-gray-400 text-sm">
          {isViewer
            ? "Add films you want to watch using the bookmark icon on any movie."
            : `@${username} hasn't added any films to their watchlist yet.`}
        </p>
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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
        {watchlistMovies.map((movie) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            variant="grid"
            ranking={null}
            seenIt={false}
            onClick={() => {
              setSelectedMovie(movie);
              setIsModalOpen(true);
            }}
          />
        ))}
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

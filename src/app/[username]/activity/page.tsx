"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import type { Movie } from "@/types/types";

const PAGE_SIZE = 20;

type ActivityItem = {
  id: string;
  movie_id: string;
  seen_it: boolean;
  ranking: number | null;
  updated_at: string;
  movie: Movie;
};

export default function ProfileActivityPage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";
  const supabase = useSupabaseClient();
  const { profile, loading: profileLoading, notFound } = usePublicProfile(username);

  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (profileLoading || !profile) return;

    async function fetchActivity() {
      setLoading(true);
      const from = 0;
      const to = PAGE_SIZE - 1;

      const { data } = await supabase
        .from("rankings")
        .select("id, movie_id, seen_it, ranking, updated_at, movies(*)")
        .eq("user_id", profile!.id)
        .order("updated_at", { ascending: false })
        .range(from, to + 1); // fetch one extra to check hasMore

      if (!data) {
        setItems([]);
        setLoading(false);
        return;
      }

      const hasMorePages = data.length > PAGE_SIZE;
      const pageData = data.slice(0, PAGE_SIZE);

      setItems(
        pageData.map((row) => ({
          id: row.id,
          movie_id: row.movie_id,
          seen_it: row.seen_it,
          ranking: row.ranking,
          updated_at: row.updated_at,
          movie: (Array.isArray(row.movies) ? row.movies[0] : row.movies) as Movie,
        }))
      );
      setPage(0);
      setHasMore(hasMorePages);
      setLoading(false);
    }

    fetchActivity();
  }, [profileLoading, profile, supabase]);

  const loadMore = async () => {
    if (!profile || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data } = await supabase
      .from("rankings")
      .select("id, movie_id, seen_it, ranking, updated_at, movies(*)")
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false })
      .range(from, to + 1);

    if (data) {
      const hasMorePages = data.length > PAGE_SIZE;
      const pageData = data.slice(0, PAGE_SIZE);
      setItems((prev) => [
        ...prev,
        ...pageData.map((row) => ({
          id: row.id,
          movie_id: row.movie_id,
          seen_it: row.seen_it,
          ranking: row.ranking,
          updated_at: row.updated_at,
          movie: (Array.isArray(row.movies) ? row.movies[0] : row.movies) as Movie,
        })),
      ]);
      setPage(nextPage);
      setHasMore(hasMorePages);
    }
    setLoadingMore(false);
  };

  if (profileLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 border-b-2 border-yellow-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading activity...</p>
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

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-semibold text-white mb-2">No activity yet</h3>
        <p className="text-gray-400 text-sm">@{username} hasn&apos;t logged or rated any films yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="space-y-2">
        {items.map((item) => {
          const date = new Date(item.updated_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          const action =
            item.ranking !== null
              ? `Rated ${item.movie?.title ?? "Unknown"} ${item.ranking}/10`
              : `Watched ${item.movie?.title ?? "Unknown"}`;

          return (
            <div
              key={item.id}
              className="flex items-center gap-4 px-4 py-3 rounded-xl border border-gray-700/40 bg-gray-800/20"
            >
              {item.movie?.thumb_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={item.movie.thumb_url}
                  alt={item.movie.title}
                  className="w-14 h-10 object-cover rounded-md flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium leading-snug truncate">{action}</p>
                <p className="text-xs text-gray-500 mt-0.5">{date}</p>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="px-5 py-2 rounded-lg border border-gray-600 text-sm text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}

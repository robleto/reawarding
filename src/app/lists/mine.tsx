"use client";

import { useEffect, useState } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import Loader from "@/components/ui/Loading";
import ScreenState from "@/components/ui/ScreenState";
import HorizontalListRow from "@/components/list/HorizontalListRow";
import { useAuthState } from "@/hooks/useAuthState";

type MovieList = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  updated_at: string;
  movie_count?: number;
  posterUrls?: string[];
};

export default function MyListsPage() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const { status } = useAuthState();
  const userId = user?.id;
  const [myLists, setMyLists] = useState<MovieList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      setLoading(false);
      setMyLists([]);
      setError(null);
      return;
    }

    async function fetchLists() {
      setLoading(true);
      setError(null);
      let my = [];
      if (userId) {
        // First, get all lists for the current user (exclude E2E test artifacts)
        const { data: listsData, error: listsError } = await supabase
          .from("movie_lists")
          .select("*")
          .eq("user_id", userId)
          .not("name", "ilike", "E2E%")
          .order("updated_at", { ascending: false });

        if (listsError) {
          setError("Couldn't load your lists.");
          setLoading(false);
          return;
        }

        if (listsData) {
          // For each list, get the count of movies and top 5 poster URLs
          const listsWithCountsAndPosters = await Promise.all(
            listsData.map(async (list) => {
              // Get count
              const { count } = await supabase
                .from("movie_list_items")
                .select("*", { count: "exact", head: true })
                .eq("list_id", list.id);

              // Get top 5 movie IDs in order. Descending: highest ranking
              // value is the top-of-list item (ListDetailView's convention).
              const { data: items } = await supabase
                .from("movie_list_items")
                .select("movie_id")
                .eq("list_id", list.id)
                .order("ranking", { ascending: false })
                .limit(5);

              const movieIds = (items || []).map((item) => item.movie_id);
              let posterUrls: string[] = [];
              if (movieIds.length > 0) {
                // Fetch poster URLs for these movies
                const { data: movies } = await supabase
                  .from("movies")
                  .select("id,poster_url")
                  .in("id", movieIds);
                // Preserve order
                posterUrls = movieIds.map(
                  (id) => movies?.find((m) => m.id === id)?.poster_url || ""
                );
              }

              return {
                ...list,
                movie_count: count || 0,
                posterUrls,
              };
            })
          );
          my = listsWithCountsAndPosters;
        }
      }
      setMyLists(my);
      setLoading(false);
    }
    fetchLists();
  }, [status, userId, supabase]);

  if (loading) return <Loader message="Loading your lists..." />;

  if (status === "unauthenticated") {
    return (
      <ScreenState
        testId="screen-state-auth-required"
        title="Sign in to view your lists"
        message="Your lists are tied to your account. Sign in to see them."
        primaryAction={{ label: "Sign In", href: "/login" }}
        secondaryAction={{ label: "Back to Lists", href: "/lists" }}
      />
    );
  }

  if (error) {
    return (
      <ScreenState
        testId="screen-state-fetch-failure"
        tone="error"
        title="Couldn't load your lists"
        message="Your lists didn't load. Head back and try again."
        primaryAction={{ label: "Back to Lists", href: "/lists" }}
      />
    );
  }

  return (
    <div className="max-w-screen-xl px-6 py-10 mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-unbounded uppercase tracking-wide text-white">My Lists</h1>
        <p className="mt-1 text-xs font-mono uppercase tracking-wider text-gray-500">
          {myLists.length} {myLists.length === 1 ? "list" : "lists"}
        </p>
      </div>
      <HorizontalListRow title="All My Lists" lists={myLists} />
    </div>
  );
}

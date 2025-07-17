"use client";

import { useEffect, useState } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import Loader from "@/components/ui/Loading";
import HorizontalListRow from "@/components/list/HorizontalListRow";

export default function MyListsPage() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const userId = user?.id;
  const [myLists, setMyLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLists() {
      setLoading(true);
      let my = [];
      if (userId) {
        // First, get all lists for the current user
        const { data: listsData, error: listsError } = await supabase
          .from("movie_lists")
          .select("*")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false });

        if (!listsError && listsData) {
          // For each list, get the count of movies and top 5 poster URLs
          const listsWithCountsAndPosters = await Promise.all(
            listsData.map(async (list) => {
              // Get count
              const { count } = await supabase
                .from("movie_list_items")
                .select("*", { count: "exact", head: true })
                .eq("list_id", list.id);

              // Get top 5 movie IDs in order
              const { data: items } = await supabase
                .from("movie_list_items")
                .select("movie_id")
                .eq("list_id", list.id)
                .order("ranking", { ascending: true })
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
  }, [userId, supabase]);

  if (loading) return <Loader message="Loading your lists..." />;

  return (
    <div className="max-w-screen-xl px-6 py-10 mx-auto">
      <h1 className="text-3xl font-unbounded text-white mb-6">My Lists</h1>
      <HorizontalListRow title="All My Lists" lists={myLists} />
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useAuthState } from "@/hooks/useAuthState";
import HorizontalListRow from "@/components/list/HorizontalListRow";

type MovieList = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  list_type: string | null;
  updated_at: string;
  movie_count?: number;
  posterUrls?: string[];
};

export default function ProfileListsPage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";
  const supabase = useSupabaseClient();
  const { user } = useAuthState();
  const { profile, loading: profileLoading, notFound } = usePublicProfile(username);

  const [lists, setLists] = useState<MovieList[]>([]);
  const [loading, setLoading] = useState(true);

  const isViewer = !!user && !!profile && profile.id === user.id;

  useEffect(() => {
    if (profileLoading || !profile) return;

    async function fetchLists() {
      setLoading(true);

      // Fetch all lists for this user, excluding watchlist
      const query = supabase
        .from("movie_lists")
        .select("*")
        .eq("user_id", profile!.id)
        .neq("list_type", "watchlist")
        .order("updated_at", { ascending: false });

      // If the viewer is not the owner, only show public lists
      const { data: listsData } = isViewer
        ? await query
        : await query.eq("is_public", true);

      if (!listsData || listsData.length === 0) {
        setLists([]);
        setLoading(false);
        return;
      }

      // Enrich with movie counts and poster URLs
      const enriched = await Promise.all(
        listsData.map(async (list) => {
          const { count } = await supabase
            .from("movie_list_items")
            .select("*", { count: "exact", head: true })
            .eq("list_id", list.id);

          const { data: items } = await supabase
            .from("movie_list_items")
            .select("movie_id")
            .eq("list_id", list.id)
            .order("ranking", { ascending: true })
            .limit(5);

          const movieIds = (items || []).map((item) => item.movie_id);
          let posterUrls: string[] = [];
          if (movieIds.length > 0) {
            const { data: movies } = await supabase
              .from("movies")
              .select("id,poster_url")
              .in("id", movieIds);
            posterUrls = movieIds.map(
              (id) => movies?.find((m) => m.id === id)?.poster_url || ""
            );
          }

          return { ...list, movie_count: count || 0, posterUrls };
        })
      );

      setLists(enriched);
      setLoading(false);
    }

    fetchLists();
  }, [profileLoading, profile, supabase, isViewer]);

  if (profileLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 border-b-2 border-yellow-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading lists...</p>
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

  const publicLists = lists.filter((l) => l.is_public);
  const privateLists = lists.filter((l) => !l.is_public);

  if (lists.length === 0) {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-semibold text-white mb-2">No lists yet</h3>
        <p className="text-gray-400 text-sm">
          {isViewer
            ? "Create your first list from the Lists page."
            : `@${username} hasn't created any public lists yet.`}
        </p>
      </div>
    );
  }

  return (
    <div>
      {publicLists.length > 0 && (
        <HorizontalListRow
          title="Public Lists"
          lists={publicLists}
          readOnly={true}
        />
      )}
      {isViewer && privateLists.length > 0 && (
        <HorizontalListRow
          title="Private Lists"
          lists={privateLists.map((l) => ({ ...l, name: `${l.name} (Private)` }))}
          readOnly={true}
        />
      )}
    </div>
  );
}

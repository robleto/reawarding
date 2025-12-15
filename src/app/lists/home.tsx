"use client";

import { useEffect, useState } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import Loader from "@/components/ui/Loading";
import HorizontalListRow from "@/components/list/HorizontalListRow";
import ListsEmptyState from "@/components/lists/ListsEmptyState";
import AuthModalManager from "@/components/auth/AuthModalManager";
import { Plus, X } from "lucide-react";

export default function ListsHomePage() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const userId = user?.id;
  const router = useRouter();
  const [myLists, setMyLists] = useState<any[]>([]);
  const [publicLists, setPublicLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Ready‑Made CTA row removed; no need to track readiness here
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createIsPublic, setCreateIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId || !createName.trim()) return;
    
    setCreating(true);
    
    try {
      const { data, error } = await supabase
        .from("movie_lists")
        .insert({
          user_id: userId,
          name: createName.trim(),
          description: createDescription.trim() || null,
          is_public: createIsPublic,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating list:", error.message);
        return;
      }

      // Activity (best-effort)
      try {
        await supabase.from("activity_events").insert({
          actor_id: userId,
          event_type: "list_created",
          list_id: data.id,
          metadata: { name: data.name, is_public: data.is_public },
        });
      } catch {
        // ignore
      }

      // Navigate to the new list
      router.push(`/lists/${data.id}`);
    } catch (err) {
      console.error("Error creating list:", err);
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setCreateName("");
    setCreateDescription("");
    setCreateIsPublic(false);
    setShowCreateModal(false);
  };

  const handleCreateListClick = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setShowCreateModal(true);
  };

  useEffect(() => {
    async function fetchLists() {
      setLoading(true);
      let my = [];
      let pub = [];
      // previously used to show a Ready‑Made CTA row; no longer needed
      
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
              // Get count (avoid head:true to sidestep edge policy issues)
              const { count } = await supabase
                .from("movie_list_items")
                .select("id", { count: "exact" })
                .eq("list_id", list.id)
                .limit(1);

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
                  .select("id,poster_url,cached_poster_url")
                  .in("id", movieIds);
                // Preserve order
                posterUrls = movieIds.map((id) => {
                  const m = movies?.find((mm) => mm.id === id);
                  return (m?.cached_poster_url || m?.poster_url || "") as string;
                });
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

        // Removed Ready‑Made CTA computation
      }
      
      // Get public lists
      const { data: pubData } = await supabase
        .from("movie_lists")
        .select("*")
        .eq("is_public", true)
        .order("updated_at", { ascending: false });
      
      if (pubData) {
        // Add counts and posters for public lists too
        const publicListsWithData = await Promise.all(
          pubData.map(async (list) => {
            const { count } = await supabase
              .from("movie_list_items")
              .select("id", { count: "exact" })
              .eq("list_id", list.id)
              .limit(1);

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
                .select("id,poster_url,cached_poster_url")
                .in("id", movieIds);
              posterUrls = movieIds.map((id) => {
                const m = movies?.find((mm) => mm.id === id);
                return (m?.cached_poster_url || m?.poster_url || "") as string;
              });
            }

            return {
              ...list,
              movie_count: count || 0,
              posterUrls,
            };
          })
        );
        pub = publicListsWithData;
      }
      
      setMyLists(my);
      setPublicLists(pub);
      setLoading(false);
    }
    fetchLists();
  }, [userId, supabase]);

  if (loading) return <Loader message="Loading lists..." />;

  return (
    <div className="max-w-screen-xl">
      {/* Hero/empty state for not-logged-in or no lists */}
      {!user && <ListsEmptyState onCreateList={() => setShowAuthModal(true)} />}
      {user && myLists.length === 0 && publicLists.length === 0 && (
        <>
          <ListsEmptyState onCreateList={() => setShowCreateModal(true)} />
          <div className="p-5 mt-6 border rounded-lg bg-gray-900/60 border-yellow-500/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-yellow-200">Try Ready‑Made Lists</h3>
                <p className="text-sm text-gray-300">We’ll auto-suggest lists like “Directors you’ve seen 10+ films from.”</p>
              </div>
              <a href="/lists/ready-made" className="px-3 py-2 text-black bg-yellow-500 rounded hover:bg-yellow-400">Explore</a>
            </div>
          </div>
        </>
      )}

      {/* Top-right create button removed per request; creation via list card only */}

      {/* My Lists Row */}
      {user && myLists.length > 0 && (
        <HorizontalListRow
          title="My Lists"
          lists={myLists.slice(0, 8)}
          seeAllHref={myLists.length > 3 ? "/lists/mine" : undefined}
          onAdd={handleCreateListClick}
        />
      )}

      {/* Public Lists Row */}
      {publicLists.length > 0 && (
        <HorizontalListRow
          title="Public Lists"
          lists={publicLists.slice(0, 8)}
          seeAllHref={publicLists.length > 3 ? "/lists/public" : undefined}
          readOnly
        />
      )}

      {/* Create List Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70">
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-xl dark:bg-gray-900 dark:border-gray-700">
            <form onSubmit={handleCreateList}>
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New List</h2>
                  <button
                    type="button"
                    onClick={resetCreateForm}
                    className="text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="p-6 space-y-4">
                <div>
                  <label htmlFor="listName" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    List Name *
                  </label>
                  <input
                    type="text"
                    id="listName"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="My Favorite Movies"
                    className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="listDescription" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    id="listDescription"
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="A brief description of your list..."
                    rows={3}
                    className="w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-md resize-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={createIsPublic}
                    onChange={(e) => setCreateIsPublic(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-800"
                  />
                  <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Make this list public (others can view it)
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 rounded-b-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetCreateForm}
                    className="px-4 py-2 text-gray-700 transition-colors border border-gray-300 rounded-md dark:text-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !createName.trim()}
                    className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-md dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? "Creating..." : "Create List"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModalManager
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signup"
        onAuthSuccess={() => setShowAuthModal(false)}
      />
    </div>
  );
}

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
      {user && myLists.length === 0 && publicLists.length === 0 && <ListsEmptyState onCreateList={() => setShowCreateModal(true)} />}

      {/* Header with Create button - only show if user has lists */}
      {user && myLists.length > 0 && (
        <div className="flex flex-col gap-4 mb-8 md:flex-row md:items-center md:justify-between">
          <div className="flex-1" /> {/* Spacer to push button to the right */}
          <button
            onClick={handleCreateListClick}
            className="flex items-center gap-2 px-4 py-2 text-white dark-glass border border-gray-500/30 rounded-lg shadow-md hover:shadow-lg transition-all backdrop-blur"
          >
            <Plus className="w-4 h-4" />
            Create New List
          </button>
        </div>
      )}

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
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-xl">
            <form onSubmit={handleCreateList}>
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New List</h2>
                  <button
                    type="button"
                    onClick={resetCreateForm}
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="p-6 space-y-4">
                <div>
                  <label htmlFor="listName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    List Name *
                  </label>
                  <input
                    type="text"
                    id="listName"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="My Favorite Movies"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="listDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    id="listDescription"
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="A brief description of your list..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={createIsPublic}
                    onChange={(e) => setCreateIsPublic(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800"
                  />
                  <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Make this list public (others can view it)
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={resetCreateForm}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !createName.trim()}
                    className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

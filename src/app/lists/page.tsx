"use client";

import { useState, useEffect } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/supabase";
import Loader from "@/components/ui/Loading";
import ListCard from "@/components/list/ListCard";
import { Plus, X } from "lucide-react";

export const dynamic = "force-dynamic";

type MovieList = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  updated_at: string;
  movie_count?: number;
};

export default function ListsPage() {
  const [lists, setLists] = useState<MovieList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createIsPublic, setCreateIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const supabase = useSupabaseClient<Database>();
  const user = useUser();
  const userId = user?.id;
  const router = useRouter();

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

  useEffect(() => {
    if (!user || !userId) {
      setLoading(false);
      return;
    }

    async function fetchLists() {
      setLoading(true);
      
      // First, get all lists for the current user
      const { data: listsData, error: listsError } = await supabase
        .from("movie_lists")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (listsError) {
        console.error("Error fetching lists:", listsError.message);
        setLists([]);
        setLoading(false);
        return;
      }

      // For each list, get the count of movies
      const listsWithCounts = await Promise.all(
        (listsData || []).map(async (list) => {
          const { count } = await supabase
            .from("movie_list_items")
            .select("*", { count: "exact", head: true })
            .eq("list_id", list.id);

          return {
            ...list,
            movie_count: count || 0,
          };
        })
      );

      setLists(listsWithCounts);
      setLoading(false);
    }

    fetchLists();
  }, [userId, supabase, user]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-500">
        Please sign in to view your movie lists.
      </div>
    );
  }

  if (loading) {
    return <Loader message="Loading your lists..." />;
  }

  return (
    <div className="max-w-screen-xl px-6 py-10 mx-auto">
      <div className="flex flex-col gap-4 mb-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Movie Lists</h1>
          <p className="mt-2 text-gray-600">
            Create and manage your custom movie collections
          </p>
        </div>
        
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create New List
        </button>
      </div>

      {lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 mb-4 text-gray-400">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No movie lists yet
          </h3>
          <p className="text-gray-500 mb-6 max-w-md">
            Create your first movie list to organize your favorite films, watchlists, or any custom collection.
          </p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Your First List
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
        </div>
      )}

      {/* Create List Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <form onSubmit={handleCreateList}>
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Create New List</h2>
                  <button
                    type="button"
                    onClick={resetCreateForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="p-6 space-y-4">
                <div>
                  <label htmlFor="listName" className="block text-sm font-medium text-gray-700 mb-2">
                    List Name *
                  </label>
                  <input
                    type="text"
                    id="listName"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="My Favorite Movies"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="listDescription" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="listDescription"
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="A brief description of your list..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={createIsPublic}
                    onChange={(e) => setCreateIsPublic(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
                    Make this list public (others can view it)
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={resetCreateForm}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !createName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? "Creating..." : "Create List"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

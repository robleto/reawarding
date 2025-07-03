"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import type { Database } from "@/types/supabase";
import type { Movie } from "@/types/types";
import Loader from "@/components/ui/Loading";
import DraggableMovieCard from "@/components/list/DraggableMovieCard";
import AddMovieModal from "@/components/list/AddMovieModal";
import { useViewMode } from "@/utils/sharedMovieUtils";
import { Edit2, Plus, Globe, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

type MovieList = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  updated_at: string;
};

type ListItem = {
  id: string;
  list_id: string;
  movie_id: number;
  ranking: number;
  seen_it: boolean;
  score: number | null;
  movie: Movie;
};

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listId = params.listId as string;
  
  const [list, setList] = useState<MovieList | null>(null);
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  
  const supabase = useSupabaseClient<Database>();
  const user = useUser();
  const userId = user?.id;
  const [viewMode, setViewMode] = useViewMode("grid");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const isOwner = userId && list?.user_id === userId;

  useEffect(() => {
    if (!listId) return;

    async function fetchListData() {
      setLoading(true);
      setError(null);

      try {
        // Fetch the list details
        const { data: listData, error: listError } = await supabase
          .from("movie_lists")
          .select("*")
          .eq("id", listId)
          .single();

        if (listError) {
          setError("List not found");
          setLoading(false);
          return;
        }

        // Check if user has access to this list
        if (!listData.is_public && listData.user_id !== userId) {
          setError("You don't have permission to view this list");
          setLoading(false);
          return;
        }

        setList(listData);
        setEditName(listData.name);
        setEditDescription(listData.description || "");

        // Fetch the list items with movie details
        const { data: itemsData, error: itemsError } = await supabase
          .from("movie_list_items")
          .select(`
            *,
            movies:movie_id (
              id,
              title,
              release_year,
              poster_url,
              thumb_url,
              created_at
            )
          `)
          .eq("list_id", listId)
          .order("ranking");

        if (itemsError) {
          console.error("Error fetching list items:", itemsError.message);
          setListItems([]);
        } else {
          // Transform the data to match our expected structure
          const transformedItems: ListItem[] = (itemsData || [])
            .filter(item => item.movies) // Only include items with valid movie data
            .map(item => ({
              ...item,
              movie: {
                ...item.movies,
                rankings: [], // We'll populate this separately if needed
                thumb_url: item.movies.thumb_url || "",
              } as Movie,
            }));

          setListItems(transformedItems);
        }
      } catch (err) {
        console.error("Error fetching list data:", err);
        setError("Failed to load list");
      } finally {
        setLoading(false);
      }
    }

    fetchListData();
  }, [listId, userId, supabase]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = listItems.findIndex(item => item.id === active.id);
    const newIndex = listItems.findIndex(item => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newItems = arrayMove(listItems, oldIndex, newIndex);
    
    // Update local state immediately for better UX
    setListItems(newItems);

    // Update rankings in the database
    try {
      const updates = newItems.map((item, index) => ({
        id: item.id,
        ranking: index + 1,
      }));

      for (const update of updates) {
        await supabase
          .from("movie_list_items")
          .update({ ranking: update.ranking })
          .eq("id", update.id);
      }

      // Update the list's updated_at timestamp
      await supabase
        .from("movie_lists")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", listId);
    } catch (err) {
      console.error("Error updating rankings:", err);
      // Revert the local state if the update failed
      setListItems(listItems);
    }
  };

  const handleUpdateItem = async (
    itemId: string,
    updates: { seen_it?: boolean; score?: number | null }
  ) => {
    // Update the list item
    const { error } = await supabase
      .from("movie_list_items")
      .update(updates)
      .eq("id", itemId);

    if (error) {
      console.error("Error updating list item:", error.message);
      return;
    }

    // Update local state
    setListItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      )
    );

    // Update the list's updated_at timestamp
    await supabase
      .from("movie_lists")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", listId);
  };

  const handleRemoveItem = async (itemId: string) => {
    const { error } = await supabase
      .from("movie_list_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      console.error("Error removing item:", error.message);
      return;
    }

    // Update local state
    setListItems(prevItems => prevItems.filter(item => item.id !== itemId));

    // Update the list's updated_at timestamp
    await supabase
      .from("movie_lists")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", listId);
  };

  const handleAddMovie = async () => {
    // Instead of page reload, let's refetch the list data
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from("movie_list_items")
        .select(`
          *,
          movies:movie_id (
            id,
            title,
            release_year,
            poster_url,
            thumb_url,
            created_at
          )
        `)
        .eq("list_id", listId)
        .order("ranking");

      if (!itemsError && itemsData) {
        const transformedItems: ListItem[] = itemsData
          .filter(item => item.movies)
          .map(item => ({
            ...item,
            movie: {
              ...item.movies,
              rankings: [],
              thumb_url: item.movies.thumb_url || "",
            } as Movie,
          }));

        setListItems(transformedItems);
      }
    } catch (err) {
      console.error("Error refreshing list items:", err);
      // Fallback to page reload if needed
      window.location.reload();
    }
  };

  const handleToggleVisibility = async () => {
    if (!list || !isOwner) return;

    const { error } = await supabase
      .from("movie_lists")
      .update({ is_public: !list.is_public })
      .eq("id", listId);

    if (error) {
      console.error("Error updating visibility:", error.message);
      return;
    }

    setList(prev => prev ? { ...prev, is_public: !prev.is_public } : null);
  };

  const handleUpdateDetails = async () => {
    if (!list || !isOwner) return;

    const { error } = await supabase
      .from("movie_lists")
      .update({ 
        name: editName.trim(),
        description: editDescription.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", listId);

    if (error) {
      console.error("Error updating list details:", error.message);
      return;
    }

    setList(prev => prev ? { 
      ...prev, 
      name: editName.trim(),
      description: editDescription.trim() || null
    } : null);
    setIsEditingDetails(false);
  };

  if (loading) {
    return <Loader message="Loading list..." />;
  }

  if (error || !list) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-500">
        <p className="text-lg">{error || "List not found"}</p>
        <button
          onClick={() => router.push("/lists")}
          className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-800"
        >
          ← Back to Lists
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl px-6 py-10 mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-8 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => router.push("/lists")}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Lists
            </button>
            <div className="flex items-center gap-2">
              {list.is_public ? (
                <div className="flex items-center text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs font-medium">
                  <Globe className="w-3 h-3 mr-1" />
                  Public
                </div>
              ) : (
                <div className="flex items-center text-gray-600 bg-gray-100 px-2 py-1 rounded-full text-xs font-medium">
                  <Lock className="w-3 h-3 mr-1" />
                  Private
                </div>
              )}
            </div>
          </div>
          
          {isEditingDetails ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-3xl font-bold text-gray-900 border-b-2 border-blue-500 bg-transparent focus:outline-none w-full"
                placeholder="List name"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full text-gray-600 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="List description (optional)"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateDetails}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditingDetails(false);
                    setEditName(list.name);
                    setEditDescription(list.description || "");
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-gray-900">{list.name}</h1>
                {isOwner && (
                  <button
                    onClick={() => setIsEditingDetails(true)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                )}
              </div>
              {list.description && (
                <p className="mt-2 text-gray-600">{list.description}</p>
              )}
            </>
          )}
          
          <p className="mt-1 text-sm text-gray-500">
            {listItems.length} {listItems.length === 1 ? "movie" : "movies"}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {isOwner && (
            <>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Movies
              </button>
              
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  isEditing
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Edit2 className="w-4 h-4" />
                {isEditing ? "Done" : "Edit"}
              </button>

              <button
                onClick={handleToggleVisibility}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                {list.is_public ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                {list.is_public ? "Make Private" : "Make Public"}
              </button>
            </>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-full border ${
                viewMode === "list"
                  ? "border-blue-500 bg-blue-50 text-blue-600"
                  : "border-gray-300 text-gray-600 hover:bg-gray-100"
              } transition-colors`}
              title="List view"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-full border ${
                viewMode === "grid"
                  ? "border-blue-500 bg-blue-50 text-blue-600"
                  : "border-gray-300 text-gray-600 hover:bg-gray-100"
              } transition-colors`}
              title="Grid view"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Movies */}
      {listItems.length === 0 ? (
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
            No movies in this list
          </h3>
          <p className="text-gray-500 mb-6 max-w-md">
            This list is empty. {isOwner ? "Add some movies to get started!" : "Check back later for updates."}
          </p>
          {isOwner && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Movies
            </button>
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToParentElement]}
        >
          <SortableContext
            items={listItems.map(item => item.id)}
            strategy={viewMode === "grid" ? rectSortingStrategy : verticalListSortingStrategy}
          >
            <div className={
              viewMode === "grid"
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
                : "space-y-0 border rounded-lg overflow-hidden"
            }>
              {listItems.map((item) => (
                <DraggableMovieCard
                  key={item.id}
                  item={item}
                  currentUserId={userId || ""}
                  viewMode={viewMode}
                  onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                  onRemove={() => handleRemoveItem(item.id)}
                  isEditing={isEditing}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add Movie Modal */}
      {isAddModalOpen && (
        <AddMovieModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddMovie={handleAddMovie}
          existingMovieIds={listItems.map(item => item.movie_id)}
          listId={listId}
        />
      )}
    </div>
  );
}

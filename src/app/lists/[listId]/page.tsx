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
import { useViewMode, useMovieFilters, SORT_OPTIONS, GROUP_OPTIONS, type SortKey, type GroupKey, type SortOrder } from "@/utils/sharedMovieUtils";
import MovieFilters from "@/components/filters/MovieFilters";
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
  ranking: number; // list position
  movie: Movie;
  // These will be merged in from global rankings
  seen_it?: boolean;
  score?: number | null;
  ranking_id?: string; // id from rankings table if needed
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
  
  // Filter state for the list
  const [sortBy, setSortBy] = useState<SortKey>("ranking");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [groupBy, setGroupBy] = useState<GroupKey>("none");
  const [filterType, setFilterType] = useState<"none" | "year" | "rank" | "movie">("none");
  const [filterValue, setFilterValue] = useState<string>("all");
  
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

  const handleDragStart = (event: any) => {
    console.log("🚀 DRAG START:", event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    console.log("🎯 DRAG END:", { activeId: active.id, overId: over?.id });

    if (!over || active.id === over.id) {
      console.log("🔄 No change needed");
      return;
    }

    // Only allow reordering when viewing by ranking and no filters
    if (sortBy !== "ranking" || filterType !== "none") {
      console.log("⚠️ Reordering disabled - wrong sort/filter mode");
      return;
    }

    const oldIndex = sortedListItems.findIndex((item) => item.id === active.id);
    const newIndex = sortedListItems.findIndex((item) => item.id === over.id);

    console.log("📊 REORDER:", { oldIndex, newIndex });

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(sortedListItems, oldIndex, newIndex);
      console.log("✨ NEW ORDER:", newOrder.map(item => ({ id: item.id, title: item.movie.title })));
      
      // Update the rankings based on new positions
      const updatedItems = newOrder.map((item, index) => ({
        ...item,
        ranking: index + 1,
      }));

      setListItems(updatedItems);

      // Save to database if user is the owner
      if (isOwner) {
        saveNewOrder(updatedItems);
      }
    }
  };

  const saveNewOrder = async (items: ListItem[]) => {
    console.log("💾 SAVING NEW ORDER to database...");
    console.log("📋 Items to save:", items.map((item, index) => ({ 
      id: item.id, 
      currentRanking: item.ranking, 
      newRanking: index + 1,
      title: item.movie.title 
    })));
    
    try {
      // STEP 1: Set all rankings to negative values to avoid unique constraint conflicts
      console.log("🔄 Step 1: Setting temporary negative rankings...");
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const tempRanking = -(i + 1); // Use negative values as temporary
        
        const { error } = await supabase
          .from("movie_list_items")
          .update({ ranking: tempRanking })
          .eq("id", item.id);

        if (error) {
          console.error(`❌ Error setting temp ranking for ${item.id}:`, error);
          return;
        }
      }

      // STEP 2: Set the actual final rankings
      console.log("🔄 Step 2: Setting final rankings...");
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const newRanking = i + 1;
        
        console.log(`🔄 Updating ${item.movie.title} (${item.id}) to final ranking ${newRanking}`);
        
        const { error } = await supabase
          .from("movie_list_items")
          .update({ ranking: newRanking })
          .eq("id", item.id);

        if (error) {
          console.error(`❌ Error updating item ${item.id}:`, error);
          return;
        }
      }

      // Update the list's updated_at timestamp
      await supabase
        .from("movie_lists")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", listId);

      console.log("✅ Order saved successfully to database");
    } catch (error) {
      console.error("❌ Error in saveNewOrder:", error);
    }
  };

  const isOwner = userId && list?.user_id === userId;

  // Filter and sort list items for display
  const moviesFromListItems = listItems.map(item => item.movie);
  
  // Apply filters
  const filteredMovies = moviesFromListItems.filter((movie) => {
    if (filterType === "year") {
      return filterValue === "all" || movie.release_year === Number(filterValue);
    }
    if (filterType === "rank") {
      return filterValue === "all" || movie.rankings?.[0]?.ranking === Number(filterValue);
    }
    if (filterType === "movie") {
      return String(movie.id) === filterValue;
    }
    return true;
  });
  
  // Apply sorting
  const sortedListItems = listItems
    .filter(item => filteredMovies.some(movie => String(movie.id) === String(item.movie_id)))
    .sort((a, b) => {
      if (sortBy === "ranking") {
        // Use list ranking (position in list)
        return sortOrder === "asc" ? a.ranking - b.ranking : b.ranking - a.ranking;
      }
      if (sortBy === "title") {
        return sortOrder === "asc" 
          ? a.movie.title.localeCompare(b.movie.title)
          : b.movie.title.localeCompare(a.movie.title);
      }
      if (sortBy === "release_year") {
        return sortOrder === "asc" 
          ? (a.movie.release_year ?? 0) - (b.movie.release_year ?? 0)
          : (b.movie.release_year ?? 0) - (a.movie.release_year ?? 0);
      }
      return 0;
    });

  // Generate unique years and ranks for filter dropdowns
  const uniqueYears = Array.from(new Set(moviesFromListItems.map((m) => m.release_year).filter(Boolean))).sort((a, b) => b - a);
  const uniqueRanks = Array.from(
    new Set(
      moviesFromListItems
        .map((m) => m.rankings?.[0]?.ranking)
        .filter((rank): rank is number => typeof rank === "number")
    )
  ).sort((a, b) => a - b);

  useEffect(() => {
    if (!listId || !userId) return;

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
          setLoading(false);
          return;
        }

        // Get all movie_ids in the list
        const movieIds = (itemsData || []).map(item => item.movie_id);

        // Fetch global rankings for these movies for this user
        let rankingsData: any[] = [];
        if (movieIds.length > 0) {
          const { data: rankings, error: rankingsError } = await supabase
            .from("rankings")
            .select("id, movie_id, seen_it, ranking")
            .eq("user_id", userId)
            .in("movie_id", movieIds);
          if (rankingsError) {
            console.error("Error fetching user rankings:", rankingsError.message);
          } else {
            rankingsData = rankings;
          }
        }

        // Map movie_id to ranking info
        const rankingMap = new Map<number, any>();
        for (const r of rankingsData) {
          rankingMap.set(r.movie_id, r);
        }

        // Transform the data to match our expected structure, merging in global ranking/seen_it
        const transformedItems: ListItem[] = (itemsData || [])
          .filter(item => item.movies)
          .map(item => {
            const global = rankingMap.get(item.movie_id) || {};
            return {
              ...item,
              seen_it: global.seen_it ?? false,
              score: typeof global.ranking === 'number' ? global.ranking : null,
              ranking_id: global.id,
              movie: {
                ...item.movies,
                rankings: [],
                thumb_url: item.movies.thumb_url || "",
              } as Movie,
            };
          });

        setListItems(transformedItems);
      } catch (err) {
        console.error("Error fetching list data:", err);
        setError("Failed to load list");
      } finally {
        setLoading(false);
      }
    }

    fetchListData();
  }, [listId, userId, supabase]);

  // Update global ranking/seen_it for a movie
  const handleUpdateItem = async (
    itemId: string,
    updates: { seen_it?: boolean; score?: number | null }
  ) => {
    // Find the movie_id for this item
    const item = listItems.find(i => i.id === itemId);
    if (!item) return;
    const movieId = item.movie_id;

    // Prepare upsert payload for rankings table
    const payload: any = {
      user_id: userId,
      movie_id: movieId,
    };
    if (updates.seen_it !== undefined) payload.seen_it = updates.seen_it;
    if (updates.score !== undefined) payload.ranking = updates.score;

    // Upsert into rankings table
    const { error } = await supabase
      .from("rankings")
      .upsert(payload, { onConflict: "user_id,movie_id" });

    if (error) {
      console.error("Error updating global ranking:", error.message);
      return;
    }

    // Update local state
    setListItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      )
    );
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
      <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        <p className="text-lg">{error || "List not found"}</p>
        <button
          onClick={() => router.push("/lists")}
          className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Back to Lists
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl px-6 py-10 mx-auto">
      {/* Header - Unbounded, no background */}
      <div className="relative w-full mb-8">
        {/* Back button and badge - top left */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.push("/lists")}
            className="text-gray-300 hover:text-white font-medium"
          >
            ← Back to Lists
          </button>
          <div className="flex items-center gap-2">
            {list.is_public ? (
              <div className="flex items-center text-green-400 bg-green-900/30 px-3 py-1 rounded-full text-sm font-medium">
                <Globe className="w-4 h-4 mr-2" />
                Public
              </div>
            ) : (
              <div className="flex items-center text-gray-400 bg-gray-800/30 px-2 py-1 rounded-full text-xs font-medium">
                <Lock className="w-3 h-3 mr-1" />
                Private
              </div>
            )}
          </div>
        </div>

        {/* Controls - positioned absolute top right */}
        {isOwner && (
          <div className="absolute top-0 right-0 flex items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-gray-400 border-gray-600/50 hover:bg-gray-800/50 bg-gray-800/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Add</span>
            </button>
            
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                isEditing
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : "text-gray-400 border-gray-600/50 hover:bg-gray-800/50 bg-gray-800/30"
              }`}
            >
              <Edit2 className="w-4 h-4" />
              <span className="text-sm">{isEditing ? "Done" : "Edit"}</span>
            </button>

            <button
              onClick={handleToggleVisibility}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border text-gray-400 border-gray-600/50 hover:bg-gray-800/50 bg-gray-800/30 transition-colors"
            >
              {list.is_public ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
              <span className="text-sm">{list.is_public ? "Private" : "Make Public"}</span>
            </button>
          </div>
        )}

        {/* Title and description - full width, unbounded */}
        {isEditingDetails ? (
          <div className="space-y-3">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-4xl lg:text-4xl font-unbounded text-white border-b-2 border-blue-500 bg-transparent focus:outline-none w-full uppercase tracking-wide"
              placeholder="List name"
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full text-gray-300 border border-gray-600 bg-gray-800/50 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="px-4 py-2 bg-gray-800/50 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700/50 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl lg:text-4xl font-unbounded text-white uppercase tracking-wide">{list.name}</h1>
              {isOwner && (
                <button
                  onClick={() => setIsEditingDetails(true)}
                  className="p-2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <Edit2 className="w-6 h-6" />
                </button>
              )}
            </div>
            {list.description && (
              <p className="text-lg text-gray-300 mb-2">{list.description}</p>
            )}
            <p className="text-sm text-gray-400">
              {listItems.length} {listItems.length === 1 ? "movie" : "movies"}
            </p>
          </div>
        )}
      </div>

      {/* Filters and Controls */}
      {listItems.length > 0 && (
        <MovieFilters
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          filterType={filterType}
          setFilterType={setFilterType}
          filterValue={filterValue}
          setFilterValue={setFilterValue}
          viewMode={viewMode}
          setViewMode={setViewMode}
          uniqueYears={uniqueYears}
          uniqueRanks={uniqueRanks}
        />
      )}

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
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No movies in this list
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
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
        <>
          {/* Edit Mode Active Banner */}
          {isEditing && (
            <div className="mb-4 p-4 bg-green-500/10 border-2 border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-green-400 font-semibold">
                  🎯 EDIT MODE ACTIVE - You can now drag and drop movies to reorder them!
                </p>
              </div>
              {(filterType !== "none" || sortBy !== "ranking") && (
                <p className="text-sm text-amber-400 mt-2">
                  ⚠️ Clear filters and sort by "My Ranking" to enable drag & drop.
                </p>
              )}
            </div>
          )}
          
          {/* Reordering notice when filters are applied */}
          {(filterType !== "none" || sortBy !== "ranking") && isEditing && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <strong>Note:</strong> Drag & drop reordering is only available when viewing the complete list sorted by position. 
                Clear filters and sort by "My Ranking" to reorder items.
                {!isOwner && (
                  <span className="block mt-1">
                    <em>Changes will only be visible during your session and won't be saved permanently.</em>
                  </span>
                )}
              </p>
            </div>
          )}
          
          {/* Show info for non-owners when editing */}
          {isEditing && !isOwner && (filterType === "none" && sortBy === "ranking") && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                <strong>Preview Mode:</strong> You can reorder items to see how they would look, but changes won't be saved permanently.
                {userId ? " Only the list owner can save changes." : " Log in and create your own list to save changes."}
              </p>
            </div>
          )}
          
          <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToParentElement]}
        >
          <SortableContext
            items={sortedListItems.map(item => item.id)}
            strategy={viewMode === "grid" ? rectSortingStrategy : verticalListSortingStrategy}
          >
            <div className={
              viewMode === "grid"
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
                : "space-y-2 rounded-lg overflow-hidden"
            }>
              {sortedListItems.map((item, index) => (
                <DraggableMovieCard
                  key={item.id}
                  item={{
                    ...item,
                    score: item.score ?? null,
                    seen_it: item.seen_it ?? false,
                  }}
                  currentUserId={userId || ""}
                  viewMode={viewMode}
                  position={index + 1}
                  onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                  onRemove={() => handleRemoveItem(item.id)}
                  isEditing={isEditing}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        </>
      )}

      {/* Add Movie Modal */}
      {isAddModalOpen && (
        <AddMovieModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddMovie={handleAddMovie}
          existingMovieIds={listItems.map(item => String(item.movie_id))}
          listId={listId}
        />
      )}
    </div>
  );
}

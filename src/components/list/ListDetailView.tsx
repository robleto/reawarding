"use client";

import { Button } from "@/components/ui/Button";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
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
import ScreenState from "@/components/ui/ScreenState";
import DraggableMovieCard from "@/components/list/DraggableMovieCard";
import AddMovieModal from "@/components/list/AddMovieModal";
import { useViewMode, useMovieFilters, SORT_OPTIONS, GROUP_OPTIONS, type SortKey, type GroupKey, type SortOrder } from "@/utils/sharedMovieUtils";
import MovieFilters from "@/components/filters/MovieFilters";
import { AlertCircle, Edit2, GripVertical, Info, Plus, Globe, Lock, MoreVertical, ArrowLeft, X, Trash } from "lucide-react";
import { useAuthState } from "@/hooks/useAuthState";
import { useGlobalToast } from "@/hooks/useGlobalToast";

type MovieList = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  updated_at: string;
  list_type: string | null;
};

type ListItem = {
  id: string;
  list_id: string;
  movie_id: string;
  ranking: number | null; // list position
  movie: Movie;
  // These will be merged in from global rankings
  seen_it?: boolean;
  score?: number | null;
  ranking_id?: string; // id from rankings table if needed
};

export interface ListDetailViewProps {
  listId: string;
  /**
   * 'route' renders the classic "Back to Lists" chrome and navigates via the
   * router (used by the /lists/[listId] page). 'overlay' renders a close (X)
   * affordance and defers dismissal to the parent (ListExpandOverlay), which
   * owns the toss-to-dismiss gesture.
   */
  variant?: "route" | "overlay";
  onRequestClose?: () => void;
  /** Whether the outer overlay's pan gesture (toss-to-dismiss / paging) is
   * currently enabled. Reported back so the overlay can gate its own gesture
   * on this view's edit mode, and so this view knows whether it's safe to let
   * the overlay's pan compete with its own scroll/drag. Only used by the
   * 'overlay' variant. */
  onEditingChange?: (isEditing: boolean) => void;
}

export default function ListDetailView({
  listId,
  variant = "route",
  onRequestClose,
  onEditingChange,
}: ListDetailViewProps) {
  const router = useRouter();

  const goToListsHome = () => {
    if (variant === "overlay") {
      onRequestClose?.();
    } else {
      router.push("/lists");
    }
  };

  const [list, setList] = useState<MovieList | null>(null);
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [showMobileManage, setShowMobileManage] = useState(false);
  const manageMenuRef = useRef<HTMLDivElement | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    onEditingChange?.(isEditing);
  }, [isEditing, onEditingChange]);

  // Close mobile manage menu on outside click or Escape
  useEffect(() => {
    if (!showMobileManage) return;
    const handleClick = (e: MouseEvent) => {
      if (manageMenuRef.current && !manageMenuRef.current.contains(e.target as Node)) {
        setShowMobileManage(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMobileManage(false);
    };
    document.addEventListener('mousedown', handleClick, true);
    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('mousedown', handleClick, true);
      document.removeEventListener('keydown', handleKey, true);
    };
  }, [showMobileManage]);

  // Filter state for the list
  const [sortBy, setSortBy] = useState<SortKey>("ranking");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [groupBy, setGroupBy] = useState<GroupKey>("none");
  const [filterType, setFilterType] = useState<"none" | "year" | "rank" | "movie" | "search" | "genre">("none");
  const [filterValue, setFilterValue] = useState<string>("all");

  const supabase = useSupabaseClient<Database>();
  const user = useUser();
  const { status } = useAuthState();
  const userId = user?.id;
  const [viewMode, setViewMode] = useViewMode("list");
  const [errorKind, setErrorKind] = useState<"not_found" | "unauthorized" | "fetch" | null>(null);
  const { showToast, toast } = useGlobalToast();

  const sensors = useSensors(
    // Long-press to drag so touch scrolling isn't hijacked by the sortable
    useSensor(PointerSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (_event: any) => {
    // drag start handler — reserved for future drag preview logic
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Only allow reordering when viewing by ranking and no filters
    if (sortBy !== "ranking" || filterType !== "none") return;

    const oldIndex = sortedListItems.findIndex((item) => item.id === active.id);
    const newIndex = sortedListItems.findIndex((item) => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(sortedListItems, oldIndex, newIndex);
      // Top-of-display item keeps the highest ranking value, consistent with the
      // descending display sort (ranking 10 down to 1).
      const updatedItems = newOrder.map((item, index) => ({
        ...item,
        ranking: newOrder.length - index,
      }));

      setListItems(updatedItems);

      // Save to database if user is the owner
      if (isOwner) {
        saveNewOrder(updatedItems);
      }
    }
  };

  const saveNewOrder = async (items: ListItem[]) => {
    // PERF-2 (docs/audits/2026-08-21-launch-readiness-round3.md): this used
    // to be two sequential per-item update loops (2N+1 serial round trips
    // for N items — the first pass existed only to dodge a unique-ranking
    // conflict). update_list_item_rankings does the same two-pass dance
    // server-side, atomically, in one call — see
    // supabase/migrations/20250715120000_update_list_item_rankings.sql,
    // which shipped with zero call sites until now.
    const updates = items.map((item, index) => ({
      id: item.id,
      ranking: items.length - index,
    }));

    const { error } = await supabase.rpc("update_list_item_rankings", { updates });

    if (error) {
      console.error("Error saving reordered list:", error.message);
      showToast("Couldn't save the new order. Please try again.", "error");
      return;
    }

    const { error: touchError } = await supabase
      .from("movie_lists")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", listId);
    if (touchError) {
      console.error("Error touching list updated_at:", touchError.message);
    }
  };

  const isOwner = userId && list?.user_id === userId;
  // The default Watchlist list already means "bookmarked" — showing the
  // bookmark toggle on its own rows would just be redundant with the screen.
  const isWatchlist = list?.list_type === "watchlist";

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
    if (filterType === "search") {
      return movie.title.toLowerCase().includes(filterValue.toLowerCase());
    }
    return true;
  });

  // Apply sorting
  const sortedListItems = listItems
    .filter(item => filteredMovies.some(movie => String(movie.id) === String(item.movie_id)))
    .sort((a, b) => {
      if (sortBy === "ranking") {
        // Use list ranking (position in list)
        return sortOrder === "asc" ? (a.ranking ?? 0) - (b.ranking ?? 0) : (b.ranking ?? 0) - (a.ranking ?? 0);
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

  // Fetch + merge global rankings (seen_it/score) into a set of movie_list_items rows.
  // Shared by the initial load and handleAddMovie so both stay in sync — neither should
  // rebuild listItems without this merge, or every other item's rating badge / seen-it
  // marker gets blanked out.
  const mergeItemsWithRankings = async (itemsData: any[]): Promise<ListItem[]> => {
    const movieIds = (itemsData || []).map((item) => item.movie_id);

    let rankingsData: any[] = [];
    if (movieIds.length > 0 && status === "authenticated" && userId) {
      const { data: rankings, error: rankingsError } = await supabase
        .from("rankings")
        .select("id, movie_id, seen_it, ranking")
        .eq("user_id", userId)
        .in("movie_id", movieIds);
      if (rankingsError) {
        console.error("Error fetching user rankings:", rankingsError.message);
      } else if (rankings) {
        rankingsData = rankings;
      }
    }

    const rankingMap = new Map<string, any>();
    for (const r of rankingsData) {
      rankingMap.set(r.movie_id, r);
    }

    return (itemsData || [])
      .filter((item) => item.movies)
      .map((item) => {
        const global = rankingMap.get(item.movie_id) || {};
        return {
          ...item,
          seen_it: global.seen_it ?? false,
          score: typeof global.ranking === "number" ? global.ranking : null,
          ranking_id: global.id,
          movie: {
            ...item.movies,
            rankings: [],
            thumb_url: item.movies.thumb_url || "",
          } as Movie,
        };
      });
  };

  useEffect(() => {
    if (!listId || status === "loading") return;

    async function fetchListData() {
      setLoading(true);
      setError(null);
      setErrorKind(null);

      try {
        // Fetch the list details
        const { data: listData, error: listError } = await supabase
          .from("movie_lists")
          .select("*")
          .eq("id", listId)
          .single();

        if (listError) {
          setError("List not found");
          setErrorKind("not_found");
          setLoading(false);
          return;
        }

        // Check if user has access to this list
        const isAuthenticated = status === "authenticated";
        if (!listData.is_public && (!isAuthenticated || listData.user_id !== userId)) {
          setError(
            isAuthenticated
              ? "You don't have permission to view this list"
              : "Sign in to view this private list"
          );
          setErrorKind("unauthorized");
          setLoading(false);
          return;
        }

        setList(listData as MovieList);
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
          .order("ranking", { ascending: false });

        if (itemsError) {
          console.error("Error fetching list items:", itemsError.message);
          setListItems([]);
          setLoading(false);
          return;
        }

        // Transform the data to match our expected structure, merging in global ranking/seen_it
        const transformedItems = await mergeItemsWithRankings(itemsData || []);

        setListItems(transformedItems);
      } catch (err) {
        console.error("Error fetching list data:", err);
        setError("Failed to load list");
        setErrorKind("fetch");
      } finally {
        setLoading(false);
      }
    }

    fetchListData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId, status, userId, supabase]);

  // Update global ranking/seen_it for a single movie in this list.
  // IMPORTANT: this fires on every rating/seen-it toggle — the single most frequent
  // action on this page (Watch -> Rate is the primary product loop). It must NOT
  // trigger setLoading(true)/a full refetch, which would tear down the whole page to
  // a spinner and lose scroll position, edit mode, and filter/sort selections. Update
  // just this item's local state optimistically instead.
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
    const { data, error } = await supabase
      .from("rankings")
      .upsert(payload, { onConflict: "user_id,movie_id" })
      .select("id")
      .single();

    if (error) {
      console.error("Error updating global ranking:", error.message);
      showToast("Couldn't save your update. Please try again.", "error");
      return;
    }

    // Update just this item's local state — no full-page refetch/reload.
    setListItems(prevItems =>
      prevItems.map(i =>
        i.id === itemId
          ? {
              ...i,
              // Spread only the keys the caller actually set. `updates` is
              // built from two independent card actions (seen-it toggle,
              // rate) that only ever populate ONE of these fields at a time
              // — the other key is present with value `undefined`, and a
              // naive `{ ...i, ...updates }` spread copies that `undefined`
              // over the sibling field, wiping it from display until the
              // next reload. `null` must still pass through: it's the
              // legitimate "cleared rating" value.
              ...(updates.seen_it !== undefined ? { seen_it: updates.seen_it } : {}),
              ...(updates.score !== undefined ? { score: updates.score } : {}),
              ranking_id: data?.id ?? i.ranking_id,
            }
          : i
      )
    );
    showToast("Saved", "success");
  };

  // Re-insert a previously-removed item, used by the "Undo" action on the remove toast.
  const handleUndoRemove = async (item: ListItem) => {
    const { data, error } = await supabase
      .from("movie_list_items")
      .insert({
        list_id: listId,
        movie_id: item.movie_id,
        ranking: item.ranking,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Error restoring removed item:", error?.message);
      showToast("Couldn't restore the movie.", "error");
      return;
    }

    setListItems(prevItems => {
      if (prevItems.some(i => i.movie_id === item.movie_id)) return prevItems;
      const restored: ListItem = { ...item, id: data.id };
      return [...prevItems, restored].sort((a, b) => (b.ranking ?? 0) - (a.ranking ?? 0));
    });

    // Restoring the item changes the list contents again, so bump updated_at.
    supabase
      .from("movie_lists")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", listId)
      .then(({ error: touchError }) => {
        if (touchError) console.error("Error touching list updated_at:", touchError.message);
      });

    showToast("Movie restored", "success");
  };

  const handleRemoveItem = async (itemId: string) => {
    const item = listItems.find(i => i.id === itemId);
    if (!item) return;

    // Optimistically remove from the UI immediately.
    setListItems(prevItems => prevItems.filter(i => i.id !== itemId));

    const { error } = await supabase
      .from("movie_list_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      console.error("Error removing item:", error.message);
      // Roll back the optimistic removal since the delete never happened.
      setListItems(prevItems => {
        if (prevItems.some(i => i.id === itemId)) return prevItems;
        return [...prevItems, item].sort((a, b) => (b.ranking ?? 0) - (a.ranking ?? 0));
      });
      showToast("Couldn't remove the movie. Please try again.", "error");
      return;
    }

    // Update the list's updated_at timestamp (best-effort, doesn't block the undo toast)
    supabase
      .from("movie_lists")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", listId)
      .then(({ error: touchError }) => {
        if (touchError) console.error("Error touching list updated_at:", touchError.message);
      });

    // Give the user a few seconds to reverse the removal instead of an unconfirmed,
    // permanent delete with no way back.
    toast((t) => (
      <span className="flex items-center gap-3">
        <span>Removed “{item.movie.title}”</span>
        <button
          onClick={() => {
            toast.dismiss(t.id);
            handleUndoRemove(item);
          }}
          className="font-semibold underline hover:no-underline"
        >
          Undo
        </button>
      </span>
    ), { duration: 6000 });
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
        .order("ranking", { ascending: false });

      if (!itemsError && itemsData) {
        // Merge in global rankings the same way fetchListData does — otherwise every
        // other item's rating badge and seen-it marker get blanked out.
        const transformedItems = await mergeItemsWithRankings(itemsData);
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
      showToast("Couldn't update visibility. Please try again.", "error");
      return;
    }

    setList(prev => prev ? { ...prev, is_public: !prev.is_public } : null);
    showToast(list.is_public ? "List is now private" : "List is now public", "success");
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
      showToast("Couldn't save your changes. Please try again.", "error");
      return;
    }

    setList(prev => prev ? {
      ...prev,
      name: editName.trim(),
      description: editDescription.trim() || null
    } : null);
    setIsEditingDetails(false);
    showToast("List updated", "success");
  };

  const handleDeleteList = async () => {
    if (!list || !isOwner) return;
    try {
      // Delete items first to avoid FK issues (if cascade not enabled)
      await supabase.from("movie_list_items").delete().eq("list_id", list.id);
      // Delete the list
      const { error } = await supabase.from("movie_lists").delete().eq("id", list.id);
      if (error) {
        console.error("Error deleting list:", error.message);
        return;
      }
      setShowDeleteConfirm(false);
      goToListsHome();
    } catch (err) {
      console.error("Unexpected error deleting list:", err);
    }
  };

  if (loading) {
    return <Loader message="Loading list..." />;
  }

  if (error || !list) {
    if (errorKind === "unauthorized") {
      return (
        <ScreenState
          testId="screen-state-auth-required"
          title="This list isn't available"
          message={error || "Sign in to view this private list."}
          primaryAction={{ label: "Sign In", href: "/login" }}
          secondaryAction={{ label: "Back to Lists", href: "/lists" }}
        />
      );
    }

    if (errorKind === "fetch") {
      return (
        <ScreenState
          testId="screen-state-fetch-failure"
          tone="error"
          title="Couldn't load this list"
          message="We couldn't verify the current list state, so this page is staying closed instead of showing partial content."
          primaryAction={{ label: "Back to Lists", href: "/lists" }}
        />
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-400">
        <p className="text-lg">{error || "List not found"}</p>
        <button
          onClick={goToListsHome}
          className="px-4 py-2 mt-4 text-blue-600 text-blue-400 hover:text-blue-300"
        >
          ← Back to Lists
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl py-6 pb-28 md:py-10 md:pb-10 mx-auto">
      {/* Delete Confirmation Modal — portaled to document.body. It's `fixed
          inset-0`, which breaks if a transformed ancestor is in the tree
          (e.g. ListExpandOverlay's pager track), since `transform` makes an
          element the containing block for its `position: fixed` descendants.
          Same escape hatch MovieDetailModal already uses. */}
      {showDeleteConfirm && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-charcoal-900 border border-gray-700 rounded-lg w-full max-w-md shadow-xl">
            <div className="p-5 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white">Delete this list?</h3>
            </div>
            <div className="p-5 space-y-3 text-gray-300">
              <p>This action will permanently delete “{list?.name}”.</p>
              <p className="text-sm text-gray-400">All items in the list will also be removed.</p>
            </div>
            <div className="p-5 border-t border-gray-800 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-md border border-gray-700 text-gray-200 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteList}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Header - Unbounded, no background */}
      <div className="relative w-full mb-6 md:mb-8">
        {/* Back/close button and badge - top left */}
        <div className="relative flex items-center gap-3 mb-3 md:mb-4">
          {/* Same glass-chip treatment either way — only the affordance
              differs, since closing a sheet and navigating back a page are
              genuinely different actions, not just a style choice. */}
          <button
            onClick={goToListsHome}
            aria-label={variant === "overlay" ? "Close" : undefined}
            className={
              variant === "overlay"
                ? "flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                : "flex items-center gap-2 h-9 pl-3 pr-4 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-sm md:text-base font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            }
          >
            {variant === "overlay" ? (
              <X className="w-4 h-4" />
            ) : (
              <>
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Lists</span>
              </>
            )}
          </button>
          {/* Visibility badge - owners: clickable only in edit mode */}
          {isOwner ? (
            <>
              {isEditing ? (
                <button
                  onClick={handleToggleVisibility}
                  className="sm:hidden flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border border-transparent bg-gray-800/30 text-gray-300"
                  aria-label={list.is_public ? "Make Private" : "Make Public"}
                  title={list.is_public ? "Make Private" : "Make Public"}
                >
                  {list.is_public ? (
                    <>
                      <Globe className="w-3 h-3 mr-1.5" />
                      Public
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3 mr-1.5" />
                      Private
                    </>
                  )}
                </button>
              ) : (
                <div className="sm:hidden flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-800/30 text-gray-300">
                  {list.is_public ? (
                    <>
                      <Globe className="w-3 h-3 mr-1.5" />
                      Public
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3 mr-1.5" />
                      Private
                    </>
                  )}
                </div>
              )}
              {/* Desktop/Tablet: non-clickable badge */}
              <div className="hidden sm:flex items-center gap-2">
                {list.is_public ? (
                  <div className="flex items-center px-2.5 py-0.5 text-xs md:text-sm font-medium text-green-400 rounded-full bg-green-900/30">
                    <Globe className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                    Public
                  </div>
                ) : (
                  <div className="flex items-center px-2 py-1 text-xs font-medium text-gray-400 rounded-full bg-gray-800/30">
                    <Lock className="w-3 h-3 mr-1" />
                    Private
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {list.is_public ? (
                <div className="flex items-center px-2.5 py-0.5 text-xs md:text-sm font-medium text-green-400 rounded-full bg-green-900/30">
                  <Globe className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                  Public
                </div>
              ) : (
                <div className="flex items-center px-2 py-1 text-xs font-medium text-gray-400 rounded-full bg-gray-800/30">
                  <Lock className="w-3 h-3 mr-1" />
                  Private
                </div>
              )}
            </div>
          )}

          {/* Mobile manage menu trigger */}
          {isOwner && (
            <div className="ml-auto sm:hidden relative" ref={manageMenuRef}>
              <button
                onClick={() => setShowMobileManage((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={showMobileManage}
                className="flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-gray-300 hover:bg-white/10"
                title="Manage list"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showMobileManage && (
                <div className="absolute right-0 top-full mt-2 w-44 z-50 rounded-lg border border-gray-700/50 bg-charcoal-900 shadow-lg p-1">
                  <button
                    onClick={() => { setIsEditing((v) => !v); setShowMobileManage(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-800 text-gray-200"
                  >
                    <GripVertical className="w-4 h-4" />
                    {isEditing ? "Done Editing" : "Edit Order"}
                  </button>
                  <button
                    onClick={() => { setIsEditingDetails(true); setShowMobileManage(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-800 text-gray-200"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Details
                  </button>
                  {isEditing && (
                    <>
                      <button
                        onClick={() => { handleToggleVisibility(); setShowMobileManage(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-800 text-gray-200"
                      >
                        {list.is_public ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                        {list.is_public ? "Make Private" : "Make Public"}
                      </button>
                      <button
                        onClick={() => { setShowDeleteConfirm(true); setShowMobileManage(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-red-900/30 text-red-300"
                      >
                        <Trash className="w-4 h-4" />
                        Delete List
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls - positioned absolute top right */}
        {isOwner && (
          <>
          {/* Desktop/Tablet */}
          <div className="hidden sm:flex absolute top-0 right-0 items-center gap-2">
            {isEditing && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-gray-400 transition-colors border rounded-lg border-gray-600/50 hover:bg-gray-800/50 bg-gray-800/30"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add</span>
              </button>
            )}

            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                isEditing
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : "text-gray-400 border-gray-600/50 hover:bg-gray-800/50 bg-gray-800/30"
              }`}
            >
              <GripVertical className="w-4 h-4" />
              <span className="text-sm">{isEditing ? "Done" : "Edit"}</span>
            </button>

            {isEditing && (
              <>
                <button
                  onClick={handleToggleVisibility}
                  className="flex items-center gap-2 px-3 py-2 text-gray-400 transition-colors border rounded-lg border-gray-600/50 hover:bg-gray-800/50 bg-gray-800/30"
                >
                  {list.is_public ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  <span className="text-sm">{list.is_public ? "Private" : "Make Public"}</span>
                </button>

                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-3 py-2 text-red-300 transition-colors border rounded-lg border-red-600/30 hover:bg-red-900/30 bg-red-900/10"
                >
                  <Trash className="w-4 h-4" />
                  <span className="text-sm">Delete</span>
                </button>
              </>
            )}
          </div>
          {/* Mobile - simplified actions under header */}
          <div className="sm:hidden flex flex-wrap gap-2 mb-3">
            {isEditing && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-gray-300 transition-colors border rounded-lg border-gray-600/50 bg-gray-800/30 hover:bg-gray-800/50 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            )}
          </div>
          </>
        )}

        {/* Title and description - full width, unbounded */}
        {isEditingDetails ? (
          <div className="space-y-3">
            <div className="space-y-3 p-4 border border-gray-600/50 rounded-lg bg-gray-800/20">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={`w-full text-white uppercase bg-transparent border-b-2 border-blue-500 font-unbounded focus:outline-none ${
                  variant === "overlay" ? "text-xl tracking-normal" : "text-3xl md:text-4xl tracking-wide"
                }`}
                placeholder="List name"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2 text-gray-300 border border-gray-600 rounded-md bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="List description (optional)"
                rows={3}
              />
              {isOwner && (
                <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-0.5">
                  <button
                    type="button"
                    onClick={() => { if (list.is_public) handleToggleVisibility(); }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      !list.is_public ? "bg-gray-600 text-white" : "text-gray-400 hover:text-gray-300"
                    }`}
                  >
                    <Lock className="w-3 h-3" />
                    Private
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (!list.is_public) handleToggleVisibility(); }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      list.is_public ? "bg-green-600 text-white" : "text-gray-400 hover:text-gray-300"
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    Public
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleUpdateDetails}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditingDetails(false);
                  setEditName(list.name);
                  setEditDescription(list.description || "");
                }}
                className="px-4 py-2 text-sm text-gray-300 border border-gray-600 rounded-md bg-gray-800/50 hover:bg-gray-700/50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start md:items-center gap-2 md:gap-3 mb-2">
              <h1 className={`text-white uppercase font-unbounded break-words ${
                variant === "overlay" ? "text-xl tracking-normal leading-tight" : "text-3xl md:text-4xl tracking-wide leading-tight md:leading-snug"
              }`}>{list.name}</h1>
              {isOwner && (
                <button
                  onClick={() => setIsEditingDetails(true)}
                  className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-gray-400 hover:bg-white/10 hover:text-gray-300 transition-colors flex-shrink-0"
                >
                  <Edit2 className={variant === "overlay" ? "w-4 h-4" : "w-4 h-4 md:w-5 md:h-5"} />
                </button>
              )}
            </div>
            {list.description && (
              <p className={`mb-2 text-gray-300 ${variant === "overlay" ? "text-sm" : "text-base md:text-lg"}`}>{list.description}</p>
            )}
            <p className="text-xs font-mono uppercase tracking-wider text-gray-500">
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
          localSearchMode={true}
          availableMovies={moviesFromListItems}
          searchContext={list?.name || "this list"}
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
          <h3 className="mb-2 text-lg font-medium text-white">
            No movies in this list
          </h3>
          <p className="max-w-md mb-6 text-gray-400">
            This list is empty. {isOwner ? "Add some movies to get started!" : "Check back later for updates."}
          </p>
          {isOwner && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Movies
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Reorder-mode indicator — one calm glass banner instead of the
              previous loud green alert box, plus a second, near-identical
              amber warning underneath it (both fired on the same filter
              condition and said almost the same thing). */}
          {isEditing && (
            <div className="flex items-center gap-2 px-4 py-2.5 mb-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
              <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-300">Reorder mode — drag any row to rearrange.</p>
            </div>
          )}

          {isEditing && (filterType !== "none" || sortBy !== "ranking") && (
            <div className="flex items-start gap-2 px-4 py-2.5 mb-4 rounded-xl border border-gold-500/20 bg-gold-500/5">
              <AlertCircle className="w-4 h-4 text-gold-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gold-200">
                Clear filters and sort by My Ranking to drag and drop.
                {!isOwner && " Changes here won't be saved either way — you're only previewing."}
              </p>
            </div>
          )}

          {isEditing && !isOwner && filterType === "none" && sortBy === "ranking" && (
            <div className="flex items-start gap-2 px-4 py-2.5 mb-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
              <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-300">
                Previewing — reordering here won't be saved.
                {userId ? " Only the list owner can save changes." : " Log in and create your own list to save your own order."}
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
                : ""
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
                  hideBookmark={isWatchlist}
                />
              ))}
              {/* Add Card for Grid View */}
              {viewMode === "grid" && isOwner && isEditing && (
                <Button
                  variant="cta"
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex flex-col items-center justify-center min-h-[325px] h-full aspect-[2/3] w-full text-black font-unbounded text-2xl gap-2"
                  style={{ minHeight: 0, minWidth: 0 }}
                  aria-label="Add movie"
                >
                  <Plus className="w-12 h-12 mb-2" />
                  <span>Add Movies</span>
                </Button>
              )}
            </div>
          </SortableContext>

        </DndContext>
        {/* Add CTA for Row View */}
        {viewMode === "list" && isOwner && isEditing && (
          <div className="flex justify-center mt-8">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-3 px-8 py-4 text-xl text-white transition-colors bg-blue-600 rounded-lg shadow-lg font-unbounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Add movies"
            >
              <Plus className="w-7 h-7" />
              Add Movies
            </button>
          </div>
        )}
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

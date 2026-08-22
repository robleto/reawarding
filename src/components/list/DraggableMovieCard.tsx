"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import type { Movie } from "@/types/types";
import MovieCard from "@/components/award/MovieCard";

type Props = {
  item: {
    id: string;
    movie: Movie;
    score: number | null;
    seen_it: boolean;
    ranking: number | null;
  };
  currentUserId: string;
  viewMode: "grid" | "list";
  position: number;
  onUpdate: (updates: { seen_it?: boolean; score?: number | null }) => void;
  onRemove: () => void;
  isEditing: boolean;
  /** Native-feeling glass row styling (list viewMode only) — see MovieCard's
   * `native` prop, same default. */
  native?: boolean;
  /** Suppress the bookmark toggle — passed when this list IS the watchlist,
   * so the icon isn't redundant with the list itself. */
  hideBookmark?: boolean;
};

export default function DraggableMovieCard({
  item,
  currentUserId,
  viewMode,
  position,
  onUpdate,
  onRemove,
  isEditing,
  native = true,
  hideBookmark,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const userSeenIt = item.seen_it ?? false;
  const userScore = item.score ?? null;

  const handleUpdate = (movieId: string, updates: { seen_it?: boolean; ranking?: number | null }) => {
    onUpdate({
      seen_it: updates.seen_it,
      score: updates.ranking,
    });
  };

  if (viewMode === "grid") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`relative ${isDragging ? "z-50" : ""}`}
      >
        {/* Position Number */}
        <div className="absolute top-2 left-2 z-30 bg-charcoal-900/80 border border-gray-300/50 text-white text-lg font-unbounded font-bold px-3 py-2 rounded-md shadow-sm backdrop-blur-sm">
          {position}
        </div>

        {/* Drag Handle */}
        {isEditing && (
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 left-16 z-30 min-w-[44px] min-h-[44px] flex items-center justify-center touch-none bg-red-500/90 rounded-md shadow-lg transition-colors border-2 border-white cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-5 h-5 text-white" />
          </div>
        )}

        {/* Remove Button */}
        {isEditing && (
          <Button
            onClick={onRemove}
            variant="danger"
            className="absolute top-2 right-2 z-30"
          >
            <X className="w-3 h-3" />
          </Button>
        )}

        <MovieCard
          movie={item.movie}
          variant="grid"
          ranking={userScore}
          seenIt={userSeenIt}
          onUpdate={handleUpdate}
          hideBookmark={hideBookmark}
        />
      </div>
    );
  }

  // List View
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex items-center gap-2 ${isDragging ? "z-50" : ""}`}
    >
      {/* Drag Handle */}
      {isEditing && (
        <div
          {...attributes}
          {...listeners}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center touch-none cursor-grab hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
        >
          <GripVertical className="w-5 h-5 text-gray-400" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <MovieCard
          movie={item.movie}
          variant="compact"
          rank={position}
          ranking={userScore}
          seenIt={userSeenIt}
          showYear
          onUpdate={handleUpdate}
          native={native}
          hideBookmark={hideBookmark}
        />
      </div>

      {/* Remove Button */}
      {isEditing && (
        <Button
          onClick={onRemove}
          variant="danger"
          className="flex-shrink-0"
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

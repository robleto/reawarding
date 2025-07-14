"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { GripVertical, X, Film } from "lucide-react";
import { getRatingStyle } from "@/utils/getRatingStyle";
import type { Movie } from "@/types/types";
import SeenItButton from "@/components/movie/SeenItButton";

// Fallback component for missing poster images
const DraggablePosterFallback = ({ 
  title, 
  className = "" 
}: { 
  title: string; 
  className?: string; 
}) => (
  <div className={`flex items-center justify-center bg-gray-100 text-gray-400 aspect-[2/3] ${className}`}>
    <div className="text-center px-4">
      <Film className="w-12 h-12 mx-auto mb-2" />
      <div className="text-sm font-medium text-center leading-tight">
        {title}
      </div>
    </div>
  </div>
);

type Props = {
  item: {
    id: string;
    movie: Movie;
    score: number | null;
    seen_it: boolean;
    ranking: number;
  };
  currentUserId: string;
  viewMode: "grid" | "list";
  onUpdate: (updates: { seen_it?: boolean; score?: number | null }) => void;
  onRemove: () => void;
  isEditing: boolean;
};

const RANKING_OPTIONS = Array.from({ length: 10 }, (_, i) => 10 - i);

export default function DraggableMovieCard({
  item,
  currentUserId,
  viewMode,
  onUpdate,
  onRemove,
  isEditing,
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

  const ratingStyle = getRatingStyle(item.score ?? 0);

  // Check if poster image exists and is valid
  const hasValidPoster = item.movie.poster_url && item.movie.poster_url.trim() !== '' && !item.movie.poster_url.includes('placeholder');

  if (viewMode === "grid") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`relative flex flex-col overflow-visible transition bg-white shadow hover:shadow-lg rounded-xl ${
          isDragging ? "z-50" : ""
        }`}
      >
        {/* Drag Handle */}
        {isEditing && (
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 z-10 p-1 bg-white rounded shadow-sm cursor-grab hover:bg-gray-50"
          >
            <GripVertical className="w-4 h-4 text-gray-500" />
          </div>
        )}

        {/* Remove Button */}
        {isEditing && (
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 z-10 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}

        {hasValidPoster ? (
          <Image
            src={item.movie.poster_url}
            alt={item.movie.title}
            width={300}
            height={450}
            className="w-full h-auto rounded-t-xl"
            unoptimized
            onError={(e) => {
              // Hide broken image and show fallback
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        {!hasValidPoster && (
          <DraggablePosterFallback
            title={item.movie.title}
            className="w-full rounded-t-xl"
          />
        )}

        <div className="flex flex-col justify-between flex-grow h-full px-3 py-2 min-h-[7rem]">
          <div>
            <h3 className="text-sm font-semibold leading-tight line-clamp-2">
              {item.movie.title}
            </h3>
            <p className="text-xs text-gray-600">{item.movie.release_year}</p>
          </div>

          <div className="flex items-end justify-between mt-3">
            <SeenItButton
              seenIt={item.seen_it}
              onClick={() => onUpdate({ seen_it: !item.seen_it })}
              showText={true}
              size="md"
            />

            <div className="relative z-20">
              <select
                value={item.score ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  onUpdate({ score: value === "" ? null : parseInt(value) });
                }}
                className="text-sm font-bold px-2 py-1 min-w-[40px] min-h-[32px] rounded-lg border-0 appearance-none cursor-pointer"
                style={{
                  backgroundColor: ratingStyle.background,
                  color: ratingStyle.text,
                }}
              >
                <option value="">-</option>
                {RANKING_OPTIONS.map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between gap-4 px-4 py-3 border-b hover:bg-gray-50 ${
        isDragging ? "z-50 bg-white shadow-lg rounded" : ""
      }`}
    >
      {/* Drag Handle */}
      {isEditing && (
        <div
          {...attributes}
          {...listeners}
          className="p-1 cursor-grab hover:bg-gray-100 rounded"
        >
          <GripVertical className="w-4 h-4 text-gray-500" />
        </div>
      )}

      {/* Poster */}
      <Image
        src={item.movie.thumb_url}
        alt={item.movie.title}
        width={200}
        height={150}
        className="w-16 h-24 rounded shadow object-cover"
        unoptimized
      />

      {/* Details */}
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900">{item.movie.title}</h3>
        <div className="text-sm text-gray-600">{item.movie.release_year}</div>
      </div>

      {/* Seen It */}
      <SeenItButton
        seenIt={item.seen_it}
        onClick={() => onUpdate({ seen_it: !item.seen_it })}
        showText={true}
        size="md"
      />

      {/* Ranking */}
      <div className="relative">
        <select
          value={item.score ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            onUpdate({ score: value === "" ? null : parseInt(value) });
          }}
          className="px-2 py-1 text-sm font-bold rounded shadow-sm border-0"
          style={{
            backgroundColor: ratingStyle.background,
            color: ratingStyle.text,
          }}
        >
          <option value="">–</option>
          {RANKING_OPTIONS.map((num) => (
            <option key={num} value={num}>
              {num}
            </option>
          ))}
        </select>
      </div>

      {/* Remove Button */}
      {isEditing && (
        <button
          onClick={onRemove}
          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

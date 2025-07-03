"use client";

import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { getRatingStyle } from "@/utils/getRatingStyle";
import type { Movie } from "@/types/types";

type Props = {
  movie: Movie;
  currentUserId: string;
  ranking: number | null;
  seenIt: boolean;
  onUpdate: (movieId: number, updates: { seen_it?: boolean; ranking?: number | null }) => void;
};

export default function MovieRowCard({ movie, currentUserId, onUpdate, ranking, seenIt }: Props) {
  const style = getRatingStyle(ranking ?? 0);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b hover:bg-gray-50">
      {/* Poster */}
      <Image
        src={movie.thumb_url}
        alt={movie.title}
        width={200}
        height={150}
        className="rounded shadow"
        unoptimized
      />

      {/* Details */}
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900">{movie.title}</h3>
        <div className="text-sm text-gray-600">{movie.release_year}</div>
      </div>

      {/* Seen It */}
      <button
        onClick={() => onUpdate(movie.id, { seen_it: !seenIt })}
        className="flex items-center gap-1 text-sm font-medium"
      >
        {seenIt ? (
          <>
            <Eye className="w-4 h-4 text-blue-600" />
            <span className="text-blue-600">Watched</span>
          </>
        ) : (
          <>
            <EyeOff className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400">Unseen</span>
          </>
        )}
      </button>

      {/* Ranking Dropdown */}
      <div className="relative">
        <select
          value={ranking ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            onUpdate(movie.id, { 
              ranking: value === "" ? null : parseInt(value) 
            });
          }}
          className="px-2 py-1 text-sm font-bold rounded shadow-sm"
          style={{ backgroundColor: style.background, color: style.text }}
        >
          <option value="">–</option>
          {Array.from({ length: 10 }, (_, i) => 10 - i).map((num) => {
            const optStyle = getRatingStyle(num);
            return (
              <option
                key={num}
                value={num}
                style={{ backgroundColor: optStyle.background, color: optStyle.text }}
              >
                {num}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}

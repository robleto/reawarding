import React from "react";
import Link from "next/link";
import Image from "next/image";
import { normalizeImageUrl } from "@/utils/imageUrl";

type MovieList = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  updated_at: string;
  movie_count?: number;
  posterUrls?: string[];
};

interface ListCardProps {
  list: MovieList;
  readOnly?: boolean;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
  return `${Math.floor(diffInDays / 365)} years ago`;
}

const FAN_SLOTS = 5;

const ListCard = ({ list, readOnly }: ListCardProps) => {
  const posterUrls = (list.posterUrls || []).filter((u) => typeof u === "string" && u.trim().length > 0);
  const fanSlots: (string | null)[] = Array.from({ length: FAN_SLOTS }, (_, i) => posterUrls[i] ?? null);

  return (
    <Link href={`/lists/${list.id}`} tabIndex={readOnly ? -1 : 0} aria-disabled={readOnly}>
      {/*
        Inset approach: the outer wrapper has pt-14 (56px) of empty space at the top,
        always reserved (even for empty lists) so every card in a row aligns. Fan
        posters/placeholders sit at absolute top-0 within that space, visually floating
        above the glass card border without needing the parent container to allow
        overflow. This sidesteps the overflow-x-auto clipping issue on the scroll row.
      */}
      <div className={`relative pt-14 ${readOnly ? "opacity-80 pointer-events-none" : ""}`}>
        {/* Fan of posters — positioned in the 56px inset zone above the glass card.
            Empty/unfilled slots render as dashed placeholders that "get filled in"
            as movies are added, so the fan always occupies the same footprint. */}
        <div className="absolute top-0 left-0 right-0 h-20 flex items-center justify-center z-10 pointer-events-none select-none">
          {fanSlots.map((url, i) => {
            const center = (FAN_SLOTS - 1) / 2;
            return (
              <div
                key={i}
                className={`absolute w-16 h-24 rounded-xl overflow-hidden border-2 ${
                  url
                    ? "shadow-lg border-gray-800"
                    : "border-charcoal-900 bg-gray-800"
                }`}
                style={{
                  left: `calc(50% + ${(i - center) * 32}px - 32px)`,
                  zIndex: FAN_SLOTS - Math.abs(i - center),
                  transform: `rotate(${(i - 2) * 7}deg)`,
                }}
              >
                {(() => {
                  const src = url ? normalizeImageUrl(url) : null;
                  return src ? (
                    <Image
                      src={src}
                      alt="Movie poster"
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : url ? (
                    <div className="w-full h-full bg-gray-700" />
                  ) : null;
                })()}
              </div>
            );
          })}
        </div>

        {/* Glass card body — dark-only. Was light-glass/dark-glass dual-mode;
            simplified to a single canonical surface that matches the homepage
            card treatment (charcoal at low opacity, gray-700 border). */}
        <div className="group rounded-xl shadow-md flex flex-col overflow-hidden min-h-[260px] bg-charcoal-900/60 border border-gray-700/40 hover:border-gray-600/60 transition-colors">
          <div className="p-6 pt-12 flex-1 flex flex-col min-h-0">
            {/* Header — title spans the full card width now that Public/Private
                has moved down to the footer */}
            <h3 className="text-xl font-bold text-white leading-snug line-clamp-2 group-hover:text-blue-400 transition-colors">
              {list.name}
            </h3>

            {/* Meta — small updated timestamp, between title and description */}
            <p className="mt-1 mb-3 text-xs text-gray-500">
              Updated {formatRelativeTime(list.updated_at)}
            </p>

            {/* Description */}
            {list.description && (
              <p className="text-sm text-gray-300 mb-4 line-clamp-2 leading-relaxed">
                {list.description}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-600/50 text-sm text-gray-300">
              <div className="flex items-center font-semibold">
                <svg className="w-4 h-4 mr-1.5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                {list.movie_count ?? 0} {list.movie_count === 1 ? "movie" : "movies"}
              </div>
              {list.is_public ? (
                <div className="flex items-center text-green-400 bg-green-900/30 px-2.5 py-1 rounded-full text-xs font-medium">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path
                      fillRule="evenodd"
                      d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Public
                </div>
              ) : (
                <div className="flex items-center text-gray-400 bg-gray-700/50 px-2.5 py-1 rounded-full text-xs font-medium">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Private
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ListCard;

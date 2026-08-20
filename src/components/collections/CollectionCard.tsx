"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { normalizeImageUrl } from "@/utils/imageUrl";
import type { UserCollectionProgress } from "@/hooks/useUserCollectionProgress";

// Adapts ReadyMadeCard's fan-of-posters identity (src/components/lists/ReadyMadeCard.tsx)
// for a canonical, editorial collection instead of a Lists suggestion — posters
// carry the identity here on purpose, not a per-category Lucide icon in a
// gradient badge (the generic pattern src/components/films/CollectionCard.tsx
// uses on the public /films/collections browse page). This is a distinct,
// profile-scoped component, not a variant of that one.
const FAN_SLOTS = 5;

interface CollectionCardProps {
  collection: UserCollectionProgress;
  viewHref: string;
  /** A plain click opens this in-place (CollectionExpandOverlay) instead of
      navigating to the routed detail page — the href stays live for cmd/
      ctrl/shift/middle-click and no-JS fallback, same pattern as ListCard/
      ReadyMadeCard's onOpen prop. */
  onOpen?: () => void;
}

export default function CollectionCard({ collection, viewHref, onOpen }: CollectionCardProps) {
  const handleOpenClick = (e: React.MouseEvent) => {
    if (!onOpen) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onOpen();
  };

  const fanSlots: (string | null)[] = Array.from({ length: FAN_SLOTS }, (_, i) => collection.posterUrls[i] ?? null);
  const center = (FAN_SLOTS - 1) / 2;

  const renderFanSlot = (url: string | null, i: number) => (
    <div
      key={i}
      className={`absolute rounded-xl overflow-hidden border-2 ${
        url ? "shadow-lg border-gray-800" : "border-charcoal-900 bg-gray-800"
      }`}
      style={{
        width: 64,
        height: 96,
        left: `calc(50% + ${(i - center) * 32}px - 32px)`,
        zIndex: FAN_SLOTS - Math.abs(i - center),
        transform: `rotate(${(i - 2) * 7}deg)`,
      }}
    >
      {(() => {
        const src = url ? normalizeImageUrl(url) : null;
        return src ? <Image src={src} alt="" fill className="object-cover" sizes="64px" /> : null;
      })()}
    </div>
  );

  return (
    <div className="group relative pt-14">
      <Link
        href={viewHref}
        onClick={handleOpenClick}
        className="absolute top-0 left-0 right-0 h-20 flex items-center justify-center z-10 select-none"
        aria-label={collection.title}
      >
        {fanSlots.map((url, i) => renderFanSlot(url, i))}
        {/* Completion is the one thing worth a badge here — not a per-category
            icon (every collection would otherwise need one, and an abstract
            Lucide icon says nothing real about this specific collection the
            way its own posters already do). Only appears once actually earned. */}
        {collection.isCompleted && (
          <span className="absolute top-0 right-[18%] z-20 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-black shadow-md ring-2 ring-charcoal-900">
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
          </span>
        )}
      </Link>
      <div className="rounded-xl shadow-md flex flex-col overflow-hidden min-h-[220px] bg-charcoal-900/60 border border-gray-700/40 hover:border-gray-600/60 transition-colors">
        <Link href={viewHref} onClick={handleOpenClick} className="flex-1 min-h-0 flex flex-col px-5 pt-10 pb-5" aria-label={collection.title}>
          <div className="flex-shrink-0 flex items-start justify-between gap-3">
            {collection.category && (
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-500 truncate">
                {collection.category}
              </p>
            )}
            <div
              className={`flex-shrink-0 ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium ${
                collection.isCompleted ? "text-emerald-300 bg-emerald-500/10" : "text-gold-300 bg-gold-500/10"
              }`}
            >
              {collection.filmsSeen} of {collection.totalFilms} seen
            </div>
          </div>
          <h3 className="flex-shrink-0 mt-2 text-xl font-bold text-white leading-tight line-clamp-2 group-hover:text-gold-400 transition-colors">
            {collection.title}
          </h3>
          {collection.description && (
            <p className="mt-1 text-sm text-gray-400 line-clamp-2">{collection.description}</p>
          )}
          {/* Progress bar — same plain fill-vs-track language used elsewhere
              in the app, not a decorative ring/gauge. */}
          <div className="mt-auto pt-4">
            <div className="h-1.5 rounded-full bg-gray-700/60 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${collection.isCompleted ? "bg-emerald-400" : "bg-gold-400"}`}
                style={{ width: `${Math.min(100, collection.completionPercentage)}%` }}
              />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

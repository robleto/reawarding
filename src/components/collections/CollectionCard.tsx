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
  /** Stretch to fill the height of a flex-column ancestor instead of the
      default fixed min-height — same fillHeight ListCard/ReadyMadeCard use
      for their own home carousels. Bigger fan-of-posters + proportional
      (~1/3) fan zone instead of the grid card's fixed 56px inset. */
  fillHeight?: boolean;
  /** Only meaningful alongside fillHeight: true = full color and slightly
      enlarged (centered in the carousel), false = greyed out and slightly
      shrunk (a neighbor, out of focus), undefined = no effect. */
  focused?: boolean;
}

export default function CollectionCard({ collection, viewHref, onOpen, fillHeight, focused }: CollectionCardProps) {
  const handleOpenClick = (e: React.MouseEvent) => {
    if (!onOpen) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onOpen();
  };

  const fanSlots: (string | null)[] = Array.from({ length: FAN_SLOTS }, (_, i) => collection.posterUrls[i] ?? null);
  const center = (FAN_SLOTS - 1) / 2;

  // fillHeight uses a bigger poster + wider per-slot offset so the fan
  // reaches nearer the card's edges (the grid card's size stays as it was).
  const posterW = fillHeight ? 80 : 64;
  const posterH = fillHeight ? 120 : 96;
  const slotOffset = fillHeight ? 48 : 32;

  const renderFanSlot = (url: string | null, i: number) => (
    <div
      key={i}
      className={`absolute rounded-xl overflow-hidden border-2 ${
        url ? "shadow-lg border-gray-800" : "border-charcoal-900 bg-gray-800"
      }`}
      style={{
        width: posterW,
        height: posterH,
        left: `calc(50% + ${(i - center) * slotOffset}px - ${posterW / 2}px)`,
        zIndex: FAN_SLOTS - Math.abs(i - center),
        transform: `rotate(${(i - 2) * 7}deg)`,
      }}
    >
      {(() => {
        const src = url ? normalizeImageUrl(url) : null;
        return src ? <Image src={src} alt="" fill className="object-cover" sizes={`${posterW}px`} /> : null;
      })()}
    </div>
  );

  const cardBody = (
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
  );

  const titleAndDescription = (
    <>
      <h3 className="flex-shrink-0 mt-2 text-xl font-bold text-white leading-tight line-clamp-2 group-hover:text-gold-400 transition-colors">
        {collection.title}
      </h3>
      {collection.description && (
        <p className="mt-1 text-sm text-gray-400 line-clamp-2">{collection.description}</p>
      )}
    </>
  );

  // fillHeight-only: category moves here on its own (the seen-count pill
  // that used to sit beside it is promoted to bigStat below instead —
  // showing the same number twice, small then big, was pure clutter).
  const compactHeader = collection.category && (
    <p className="flex-shrink-0 font-mono text-[11px] uppercase tracking-[0.18em] text-gray-500 truncate">
      {collection.category}
    </p>
  );

  // The freed-up middle of the card (fillHeight only) — same treatment as
  // Ready-Made's AlmostProgressMeta: the number is the thing worth noticing
  // with this much space, not a corner pill. The completion check lives
  // here now too, next to the words it's confirming, instead of floating
  // unanchored over the poster fan above.
  const bigStat = (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-1 text-center">
      <div className="font-mono font-bold text-4xl tabular-nums">
        <span className={collection.isCompleted ? "text-emerald-300" : "text-gold-300"}>{collection.filmsSeen}</span>
        <span className="text-gray-500 text-2xl"> / {collection.totalFilms}</span>
      </div>
      <p className="flex items-center gap-1 text-xs text-gray-500 uppercase tracking-wider">
        {collection.isCompleted && (
          <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-500 text-black">
            <Check className="w-2.5 h-2.5" strokeWidth={3} />
          </span>
        )}
        {collection.isCompleted ? "Collection complete" : "Films seen"}
      </p>
    </div>
  );

  const progressBar = (
    <div className="mt-auto pt-4">
      <div className="h-1.5 rounded-full bg-gray-700/60 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${collection.isCompleted ? "bg-emerald-400" : "bg-gold-400"}`}
          style={{ width: `${Math.min(100, collection.completionPercentage)}%` }}
        />
      </div>
    </div>
  );

  const completionBadge = collection.isCompleted && (
    <span className="absolute top-0 right-[18%] z-20 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-black shadow-md ring-2 ring-charcoal-900">
      <Check className="w-3.5 h-3.5" strokeWidth={3} />
    </span>
  );

  return (
    <div
      className={`group relative transition-all duration-300 ease-out ${fillHeight ? "h-full flex flex-col" : "pt-14"} ${
        focused === true ? "scale-105" : focused === false ? "scale-95 grayscale opacity-50" : ""
      }`}
    >
      {fillHeight ? (
        <>
          {/* Fan zone — ~1/3 of the card's own height via a 1:2 flex-grow
              ratio against the glass body below, same proportional split
              ListCard's fillHeight mode uses. */}
          <Link
            href={viewHref}
            onClick={handleOpenClick}
            className="relative flex-1 min-h-0 flex items-end justify-center pb-5 select-none"
            aria-label={collection.title}
          >
            {fanSlots.map((url, i) => renderFanSlot(url, i))}
          </Link>
          <div className="group rounded-xl shadow-md flex flex-col overflow-hidden bg-charcoal-900/60 border border-gray-700/40 hover:border-gray-600/60 transition-colors flex-[2_2_0%] min-h-0 -mt-8">
            <Link href={viewHref} onClick={handleOpenClick} className="p-6 flex-1 flex flex-col min-h-0" aria-label={collection.title}>
              {compactHeader}
              {titleAndDescription}
              {bigStat}
              {progressBar}
            </Link>
          </div>
        </>
      ) : (
        <>
          <Link
            href={viewHref}
            onClick={handleOpenClick}
            className="absolute top-0 left-0 right-0 h-20 flex items-center justify-center z-10 select-none"
            aria-label={collection.title}
          >
            {fanSlots.map((url, i) => renderFanSlot(url, i))}
            {completionBadge}
          </Link>
          <div className="rounded-xl shadow-md flex flex-col overflow-hidden min-h-[220px] bg-charcoal-900/60 border border-gray-700/40 hover:border-gray-600/60 transition-colors">
            <Link href={viewHref} onClick={handleOpenClick} className="flex-1 min-h-0 flex flex-col px-5 pt-10 pb-5" aria-label={collection.title}>
              {cardBody}
              {titleAndDescription}
              {progressBar}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

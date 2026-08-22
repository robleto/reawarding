"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useIsProfileOwner } from "@/hooks/useIsProfileOwner";
import { useUserCollectionProgress } from "@/hooks/useUserCollectionProgress";
import CollectionCard from "@/components/collections/CollectionCard";
import CollectionExpandOverlay from "@/components/collections/CollectionExpandOverlay";

// Editorial collections (film_collections/film_collection_items) with real
// per-user progress (user_collection_progress_view). That view is hard-scoped
// to auth.uid() internally, so it only ever reflects the CURRENT SESSION's
// own progress — meaningful only when the viewer is looking at their own
// profile, same practical constraint the old quality-tag feature had for a
// different reason (expressions RLS, owner-only).
//
// No local heading or "back to profile" link — like every other profile tab
// (films/rankings/awards/lists), this renders inside [username]/layout.tsx,
// which already owns identity (ProfileHeader) and navigation (ProfileTabs);
// duplicating either here read as a standalone page nested oddly inside one.
//
// Horizontal snap-scroll carousel + fullscreen swipe overlay, same as Lists
// (src/app/lists/home.tsx) and Ready-Made (ReadyMadeCarousel) — one card
// takes up the bulk of the available space, centered card in focus, swipe
// left/right to browse, click/tap opens CollectionExpandOverlay for the full
// pan-gesture pager. Height is a plain viewport fraction rather than an
// exact fill-to-bottom calc — unlike the Lists page, this one sits below
// ProfileHeader/ProfileTabs, whose height isn't a fixed constant (bio text
// wraps, avatar size is responsive), so "the rest of the viewport" isn't a
// number that can be computed statically here.
export default function CollectionsPage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";
  const { profile, loading } = usePublicProfile(username);
  const isOwner = useIsProfileOwner(profile?.id);

  const { collections, loading: collectionsLoading, updateProgress } = useUserCollectionProgress(isOwner);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const carouselRowRef = useRef<HTMLDivElement | null>(null);
  const [focusedCardIndex, setFocusedCardIndex] = useState(0);

  // Which card is centered in the carousel — measured directly (each card's
  // rendered center vs. the row's center) rather than guessed from scroll
  // position, same approach as the Lists home carousel. Drives the "focus"
  // effect: the centered card is full color and slightly enlarged, neighbors
  // are greyed out and slightly shrunk.
  useEffect(() => {
    const row = carouselRowRef.current;
    if (!row) return;
    let raf = 0;
    const updateFocusedCard = () => {
      const cards = Array.from(row.children) as HTMLElement[];
      if (cards.length === 0) return;
      const rowRect = row.getBoundingClientRect();
      const rowCenter = rowRect.left + rowRect.width / 2;
      let closestIndex = 0;
      let closestDistance = Infinity;
      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const distance = Math.abs(cardCenter - rowCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });
      setFocusedCardIndex(closestIndex);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateFocusedCard);
    };
    updateFocusedCard();
    row.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      row.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [collections.length]);

  if (loading || (isOwner && collectionsLoading)) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[220px] bg-gray-800/40 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!isOwner) {
    return <p className="text-sm text-gray-500">Collection progress is only visible on your own profile.</p>;
  }

  if (collections.length === 0) {
    return <p className="text-sm text-gray-500">No collections available yet.</p>;
  }

  return (
    <div className="relative overflow-visible">
      <div
        ref={carouselRowRef}
        className="flex items-start gap-5 overflow-x-auto pb-4 pt-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
        style={{
          // Symmetric inset matching each card's own width formula
          // (w-[78vw] max-w-[280px]) — lets the first and last cards
          // scroll to a truly centered position too, not just the ones
          // in the middle.
          paddingLeft: "calc((100% - min(78vw, 280px)) / 2)",
          paddingRight: "calc((100% - min(78vw, 280px)) / 2)",
        }}
      >
        {collections.map((collection, index) => (
          // aspect-[3/4], not a viewport-height fraction: this page sits
          // below ProfileHeader/ProfileTabs (variable height), so "fill the
          // rest of the viewport" isn't a number available here the way it
          // is on the standalone Lists page — sizing the card from its own
          // width instead sidesteps that and keeps it proportionate rather
          // than stretched into mostly-empty vertical space.
          <div key={collection.collectionId} className="w-[78vw] max-w-[280px] aspect-[3/4] flex-shrink-0 overflow-visible snap-center snap-always">
            <CollectionCard
              collection={collection}
              viewHref={`/${username}/collections/${collection.slug}`}
              onOpen={() => setExpandedIndex(index)}
              fillHeight
              focused={index === focusedCardIndex}
            />
          </div>
        ))}
      </div>

      {expandedIndex !== null && (
        <CollectionExpandOverlay
          collections={collections}
          userId={profile?.id ?? null}
          initialIndex={expandedIndex}
          onClose={() => setExpandedIndex(null)}
          onProgressChange={updateProgress}
        />
      )}
    </div>
  );
}

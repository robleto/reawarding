"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useIsProfileOwner } from "@/hooks/useIsProfileOwner";
import { useUserCollectionProgress } from "@/hooks/useUserCollectionProgress";
import CollectionCard from "@/components/collections/CollectionCard";
import CollectionExpandOverlay from "@/components/collections/CollectionExpandOverlay";

// Full grid of editorial collections (film_collections/film_collection_items)
// with real per-user progress (user_collection_progress_view). That view is
// hard-scoped to auth.uid() internally, so it only ever reflects the CURRENT
// SESSION's own progress — meaningful only when the viewer is looking at
// their own profile, same practical constraint the old quality-tag feature
// had for a different reason (expressions RLS, owner-only).
export default function CollectionsPage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";
  const { profile, loading } = usePublicProfile(username);
  const isOwner = useIsProfileOwner(profile?.id);

  const { collections, loading: collectionsLoading } = useUserCollectionProgress(isOwner);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (loading || (isOwner && collectionsLoading)) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[220px] bg-gray-800/40 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <Link
        href={`/${username}`}
        className="inline-flex items-center gap-1.5 mb-6 text-sm text-gray-400 hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to profile
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-white font-unbounded">Collections</h1>
      <p className="mb-6 text-sm text-gray-500">Editorial film collections, tracked against what you&apos;ve seen</p>

      {!isOwner ? (
        <p className="text-sm text-gray-500">
          Collection progress is only visible on your own profile.
        </p>
      ) : collections.length === 0 ? (
        <p className="text-sm text-gray-500">No collections available yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {collections.map((collection, index) => (
            <CollectionCard
              key={collection.collectionId}
              collection={collection}
              viewHref={`/${username}/collections/${collection.slug}`}
              onOpen={() => setExpandedIndex(index)}
            />
          ))}
        </div>
      )}

      {expandedIndex !== null && (
        <CollectionExpandOverlay
          collections={collections}
          userId={profile?.id ?? null}
          initialIndex={expandedIndex}
          onClose={() => setExpandedIndex(null)}
        />
      )}
    </div>
  );
}

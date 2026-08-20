"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useIsProfileOwner } from "@/hooks/useIsProfileOwner";
import { useUserCollectionProgress } from "@/hooks/useUserCollectionProgress";
import CollectionDetailView from "@/components/collections/CollectionDetailView";

// Direct-link/no-JS fallback route for a single collection — the in-app
// entry point is CollectionExpandOverlay (opened from the index page's
// cards), same relationship /year/[year] has to the ballot editor overlay.
export default function CollectionDetailPage() {
  const params = useParams<{ username: string; slug: string }>();
  const username = params?.username ?? "";
  const slug = params?.slug ?? "";

  const { profile, loading } = usePublicProfile(username);
  const isOwner = useIsProfileOwner(profile?.id);

  const { collections, loading: collectionsLoading } = useUserCollectionProgress(isOwner);
  const collection = collections.find((c) => c.slug === slug) ?? null;

  if (loading || (isOwner && collectionsLoading)) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] bg-gray-800/40 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div>
        <Link
          href={`/${username}/collections`}
          className="inline-flex items-center gap-1.5 mb-6 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Collections
        </Link>
        <p className="text-sm text-gray-500">Collection progress is only visible on your own profile.</p>
      </div>
    );
  }

  if (!collection) {
    return (
      <div>
        <Link
          href={`/${username}/collections`}
          className="inline-flex items-center gap-1.5 mb-6 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Collections
        </Link>
        <p className="text-sm text-gray-500">This collection doesn&apos;t exist.</p>
      </div>
    );
  }

  return (
    <CollectionDetailView
      collectionId={collection.collectionId}
      title={collection.title}
      description={collection.description}
      filmsSeen={collection.filmsSeen}
      totalFilms={collection.totalFilms}
      isCompleted={collection.isCompleted}
      userId={profile?.id ?? null}
      variant="route"
      backHref={`/${username}/collections`}
    />
  );
}

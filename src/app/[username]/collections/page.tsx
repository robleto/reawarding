"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useIsProfileOwner } from "@/hooks/useIsProfileOwner";
import { useQualityTagCollections } from "@/hooks/useQualityTagCollections";
import { slugifyTitle } from "@/utils/slug";
import ReadyMadeCard from "@/components/lists/ReadyMadeCard";

// Full grid of "My Collections" — films grouped by quality tag. expressions
// RLS is owner-only, so this only ever has content on your own profile; a
// visitor on someone else's profile sees the empty state below.
export default function CollectionsPage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";
  const { movies, profile, loading } = usePublicProfile(username);
  const isOwner = useIsProfileOwner(profile?.id);
  const ownerUserId = isOwner ? profile?.id ?? null : null;

  const { collections, loading: collectionsLoading } = useQualityTagCollections(ownerUserId, movies);

  if (loading || collectionsLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[260px] bg-gray-800/40 rounded-lg" />
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
      <h1 className="mb-1 text-2xl font-bold text-white font-unbounded">My Collections</h1>
      <p className="mb-6 text-sm text-gray-500">Films grouped by what you noticed</p>

      {collections.length === 0 ? (
        <p className="text-sm text-gray-500">
          No collections yet — tag 2 or more films with the same quality tag (from a film&apos;s
          detail view, once you&apos;ve seen and rated it) and they&apos;ll show up here.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {collections.map((collection) => (
            <ReadyMadeCard
              key={collection.tag}
              title={collection.tag}
              count={collection.count}
              subtitle={<span>Tagged films</span>}
              posterUrls={collection.posterUrls}
              viewHref={`/${username}/collections/${slugifyTitle(collection.tag)}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

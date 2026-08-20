// DELETE ME — superseded by src/app/[username]/collections/[slug]/page.tsx.
// This whole [tag] route ran on useQualityTagCollections, which has been
// retired (personal quality-tag "Collections" replaced by the editorial
// film_collections system, confirmed with the user 2026-08-20). Left in
// place rather than removed by the agent, per the user's request to mark
// files as deletable rather than delete them directly — safe to delete
// this whole [tag] directory once you've confirmed the [slug] route works.
"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useIsProfileOwner } from "@/hooks/useIsProfileOwner";
import { useQualityTagCollections } from "@/hooks/useQualityTagCollections";
import { slugifyTitle } from "@/utils/slug";
import MovieCard from "@/components/award/MovieCard";

// Single collection detail — read-only, same spirit as /[username]/awards
// (viewing your own history, not an editing surface). Ratings are still
// changed from the modal/film page elsewhere in the app.
export default function CollectionDetailPage() {
  const params = useParams<{ username: string; tag: string }>();
  const username = params?.username ?? "";
  const tagSlug = params?.tag ?? "";

  const { movies, profile, loading } = usePublicProfile(username);
  const isOwner = useIsProfileOwner(profile?.id);
  const ownerUserId = isOwner ? profile?.id ?? null : null;

  const { collections, loading: collectionsLoading } = useQualityTagCollections(ownerUserId, movies);

  const collection = collections.find((c) => slugifyTitle(c.tag) === tagSlug) ?? null;

  const collectionMovies = useMemo(() => {
    if (!collection) return [];
    const byId = new Map(movies.map((m) => [m.id, m]));
    return collection.movieIds
      .map((id) => byId.get(id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m));
  }, [collection, movies]);

  if (loading || collectionsLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] bg-gray-800/40 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <Link
        href={`/${username}/collections`}
        className="inline-flex items-center gap-1.5 mb-6 text-sm text-gray-400 hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        My Collections
      </Link>

      {!collection ? (
        <p className="text-sm text-gray-500">This collection doesn&apos;t exist (or isn&apos;t visible to you).</p>
      ) : (
        <>
          <h1 className="mb-1 text-2xl font-bold text-white font-unbounded">{collection.tag}</h1>
          <p className="mb-6 text-sm text-gray-500">
            {collection.count} {collection.count === 1 ? "film" : "films"}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {collectionMovies.map((movie) => {
              const r = movie.rankings?.[0];
              return (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  variant="grid"
                  ranking={r?.ranking ?? null}
                  seenIt={r?.seen_it ?? false}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useIsProfileOwner } from "@/hooks/useIsProfileOwner";
import { useRedirectOwnerToWorkbench } from "@/hooks/useRedirectOwnerToWorkbench";
import { useProfile } from "@/contexts/ProfileContext";
import ListCard from "@/components/list/ListCard";
import ListExpandOverlay from "@/components/list/ListExpandOverlay";
import { enrichListsWithCountsAndPosters } from "@/lib/listEnrichment";

type MovieList = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  list_type: string | null;
  updated_at: string;
  movie_count?: number;
  posterUrls?: string[];
};

// Same low-key nav-out pill as the main Lists page (src/app/lists/home.tsx).
// "Create a list from a template" is an owner action, so unlike the rest of
// this page it never shows to a visitor — there's nothing for them to create.
function ReadyMadePill() {
  return (
    <Link
      href="/lists/ready-made"
      className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 bg-gold-500/[0.06] px-3 py-1.5 font-unbounded text-xs font-semibold text-gold-300 hover:border-gold-500/50 hover:bg-gold-500/[0.12] transition-colors"
    >
      Ready-made lists
      <ArrowRight className="w-3 h-3" aria-hidden="true" />
    </Link>
  );
}

type ListsFilter = "public" | "private";

export default function ProfileListsPage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";
  const supabase = useSupabaseClient();
  const { profile, loading: profileLoading, notFound } = usePublicProfile(username);
  const isOwner = useIsProfileOwner(profile?.id);
  const { viewMode: profileViewMode } = useProfile();
  const redirecting = useRedirectOwnerToWorkbench("/lists", isOwner, profileViewMode);

  const [publicLists, setPublicLists] = useState<MovieList[]>([]);
  const [privateLists, setPrivateLists] = useState<MovieList[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ListsFilter>("public");
  const [expandedListIndex, setExpandedListIndex] = useState<number | null>(null);

  useEffect(() => {
    if (profileLoading || !profile) return;

    async function fetchLists() {
      setLoading(true);

      // Only pull private rows when the viewer is the owner — RLS
      // (movie_lists SELECT policy: user_id = auth.uid() OR is_public = true)
      // would block a visitor from getting them back anyway, but scoping the
      // query here avoids the wasted round trip.
      const query = supabase
        .from("movie_lists")
        .select("*")
        .eq("user_id", profile!.id)
        .neq("list_type", "watchlist")
        .order("updated_at", { ascending: false });

      const { data: listsData } = isOwner ? await query : await query.eq("is_public", true);

      if (!listsData || listsData.length === 0) {
        setPublicLists([]);
        setPrivateLists([]);
        setLoading(false);
        return;
      }

      const enriched = await enrichListsWithCountsAndPosters(supabase, listsData);

      setPublicLists(enriched.filter((l) => l.is_public));
      setPrivateLists(enriched.filter((l) => !l.is_public));
      setLoading(false);
    }

    fetchLists();
  }, [profileLoading, profile, supabase, isOwner]);

  if (redirecting) {
    return null;
  }

  if (profileLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 border-b-2 border-yellow-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading lists...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-white mb-2">User not found</h1>
        <p className="text-gray-400">No user with the username &ldquo;{username}&rdquo; exists.</p>
      </div>
    );
  }

  const hasAnyLists = publicLists.length > 0 || privateLists.length > 0;

  if (!hasAnyLists) {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-semibold text-white mb-2">No lists yet</h3>
        <p className="text-gray-400 text-sm">
          {isOwner
            ? "Create your first list from the Lists page."
            : `@${username} hasn't created any public lists yet.`}
        </p>
      </div>
    );
  }

  // Owner gets a Public/Private toggle over their own lists, mirroring the
  // My/Public toggle on the main Lists page (src/app/lists/home.tsx) — the
  // "My" side doesn't apply here since this whole page is already scoped to
  // one user. A visitor never has a private bucket to toggle to, so they
  // just get the public shelf, no toggle at all.
  const activeLists = isOwner && activeFilter === "private" ? privateLists : publicLists;

  return (
    <div>
      {isOwner && (
        <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 p-0.5">
          {(["public", "private"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFilter(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                activeFilter === key
                  ? "bg-gold-500 text-black"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              {key === "public" ? "Public" : "Private"}
              <span className={`ml-1 font-mono ${activeFilter === key ? "text-black/60" : "text-gray-500"}`}>
                ({key === "public" ? publicLists.length : privateLists.length})
              </span>
            </button>
          ))}
        </div>
      )}

      {activeLists.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-6 py-10 text-center">
          <p className="text-gray-300 font-medium mb-1">
            {activeFilter === "private" ? "No private lists yet." : "No public lists yet."}
          </p>
          <p className="text-sm text-gray-500">Try the other tab, or create your own list.</p>
        </div>
      ) : (
        <div className="relative overflow-visible">
          <div className="flex gap-5 overflow-x-auto pb-4 pt-4 pr-3 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {activeLists.map((list, index) => (
              <div key={list.id} className="w-[78vw] max-w-[280px] flex-shrink-0 overflow-visible snap-start">
                <ListCard list={list} onOpen={() => setExpandedListIndex(index)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {expandedListIndex !== null && (
        <ListExpandOverlay
          lists={activeLists}
          initialIndex={expandedListIndex}
          onClose={() => setExpandedListIndex(null)}
        />
      )}

      {isOwner && (
        <div className="flex justify-center pt-4 pb-2">
          <ReadyMadePill />
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseBrowser";
import { useProfile } from "@/contexts/ProfileContext";
import { useFollowing } from "@/hooks/useFollowing";
import FollowButton from "@/components/social/FollowButton";
import ScreenState from "@/components/ui/ScreenState";
import { normalizeImageUrl } from "@/utils/imageUrl";

type MemberProfile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export default function MembersPage() {
  const sessionUser = useUser();
  const { profile: ownProfile } = useProfile();
  const { followingIds, toggleFollow } = useFollowing(ownProfile?.id ?? null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load(term: string) {
      setLoading(true);

      let request = supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio")
        .limit(40);

      request = term
        ? request.or(`username.ilike.%${term}%,full_name.ilike.%${term}%`)
        : request.order("created_at", { ascending: false });

      if (ownProfile?.id) {
        request = request.neq("id", ownProfile.id);
      }

      const { data } = await request;
      setResults((data ?? []) as MemberProfile[]);
      setLoading(false);
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => void load(query.trim()), 200);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, ownProfile?.id]);

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-white mb-4">Find Members</h1>

      <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 mb-6">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or username..."
          className="w-full bg-transparent text-sm text-gray-200 placeholder-gray-500 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 rounded-full border-2 border-yellow-400/30 border-t-yellow-400 animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <ScreenState
          title={query ? "No members found" : "No members yet"}
          message={query ? `No one matches "${query}".` : "Check back soon."}
        />
      ) : (
        <div>
          {results.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 py-3 border-b border-gray-800/50 last:border-0"
            >
              <Link href={`/${p.username}`} className="flex items-center gap-3 min-w-0 group">
                {p.avatar_url ? (
                  <Image
                    src={normalizeImageUrl(p.avatar_url)}
                    alt={p.username}
                    width={36}
                    height={36}
                    className="rounded-full object-cover w-9 h-9 flex-shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-800 flex-shrink-0 flex items-center justify-center text-sm font-semibold text-gray-400">
                    {p.username[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-yellow-200 transition-colors">
                    {p.full_name ?? p.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate">@{p.username}</p>
                </div>
              </Link>
              {sessionUser && (
                <FollowButton
                  targetProfileId={p.id}
                  isFollowing={followingIds.has(p.id)}
                  isOwnProfile={sessionUser.id === p.id}
                  onToggle={toggleFollow}
                  size="sm"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

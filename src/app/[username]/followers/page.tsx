"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { UserPlus } from "lucide-react";
import { useUser } from "@supabase/auth-helpers-react";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useFollowing } from "@/hooks/useFollowing";
import FollowButton from "@/components/social/FollowButton";
import ScreenState from "@/components/ui/ScreenState";
import { normalizeImageUrl } from "@/utils/imageUrl";

export default function ProfileFollowersPage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";
  const sessionUser = useUser();

  const { profile, loading: profileLoading } = usePublicProfile(username);
  const { following, followers, followingIds, loading, toggleFollow } = useFollowing(
    profile?.id ?? null
  );

  const isOwnProfile = sessionUser?.id === profile?.id;

  if (profileLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 rounded-full border-2 border-yellow-400/30 border-t-yellow-400 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return <ScreenState title="Profile not found" message="This user doesn't exist." />;
  }

  function ProfileRow({
    p,
  }: {
    p: { id: string; username: string; full_name: string | null; avatar_url: string | null };
  }) {
    return (
      <div className="flex items-center justify-between gap-3 py-3 border-b border-gray-800/50 last:border-0">
        <Link
          href={`/${p.username}`}
          className="flex items-center gap-3 min-w-0 group"
        >
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
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      {/* Tab switcher */}
      <div className="flex items-center justify-between border-b border-gray-800 mb-6">
        <div className="flex">
          <Link
            href={`/${username}/following`}
            className="px-4 py-2.5 text-sm font-medium border-b-2 border-transparent -mb-px text-gray-500 hover:text-gray-300 transition-colors"
          >
            Following
            {following.length > 0 && (
              <span className="ml-1.5 text-xs text-gray-600">{following.length}</span>
            )}
          </Link>
          <Link
            href={`/${username}/followers`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors border-yellow-400 text-white`}
          >
            Followers
            {followers.length > 0 && (
              <span className="ml-1.5 text-xs text-gray-600">{followers.length}</span>
            )}
          </Link>
        </div>
        {isOwnProfile && (
          <Link
            href="/members"
            className="inline-flex items-center gap-1.5 mb-2 px-3 py-1.5 text-xs font-medium rounded-md border border-yellow-500/30 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20 transition-colors flex-shrink-0"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Find Friends
          </Link>
        )}
      </div>

      {followers.length === 0 ? (
        <ScreenState
          title={isOwnProfile ? "No followers yet" : `@${username} has no followers yet`}
          message={isOwnProfile ? "Share your profile to attract followers." : ""}
        />
      ) : (
        <div>
          {followers.map((p) => (
            <ProfileRow key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

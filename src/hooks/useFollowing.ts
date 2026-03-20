"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";

export type FollowProfile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
};

export type UseFollowingResult = {
  /** Profiles this user follows */
  following: FollowProfile[];
  /** Profiles that follow this user */
  followers: FollowProfile[];
  /** IDs of profiles the *current session user* follows (for button state) */
  followingIds: Set<string>;
  loading: boolean;
  /** Toggle follow/unfollow for a target profile ID */
  toggleFollow: (targetProfileId: string) => Promise<void>;
};

/**
 * Loads the follow graph for a given profile ID.
 * Also exposes `followingIds` for the currently logged-in user so
 * FollowButton components can show the correct state anywhere on the page.
 */
export function useFollowing(profileId: string | null): UseFollowingResult {
  const supabase = useSupabaseClient();
  const sessionUser = useUser();

  const [following, setFollowing] = useState<FollowProfile[]>([]);
  const [followers, setFollowers] = useState<FollowProfile[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);

      // People this profile follows
      const { data: followingRows } = await supabase
        .from("follows")
        .select("following_id, profiles!follows_following_id_fkey(id, username, full_name, avatar_url)")
        .eq("follower_id", profileId);

      // People following this profile
      const { data: followerRows } = await supabase
        .from("follows")
        .select("follower_id, profiles!follows_follower_id_fkey(id, username, full_name, avatar_url)")
        .eq("following_id", profileId);

      if (cancelled) return;

      type ProfileRow = { id: string; username: string; full_name: string | null; avatar_url: string | null };

      const toProfile = (row: { profiles: ProfileRow | null }): FollowProfile | null => {
        if (!row.profiles) return null;
        return row.profiles;
      };

      setFollowing(
        (followingRows ?? [])
          .map((r) => toProfile((r as unknown) as { profiles: ProfileRow | null }))
          .filter((p): p is FollowProfile => p !== null)
      );

      setFollowers(
        (followerRows ?? [])
          .map((r) => toProfile((r as unknown) as { profiles: ProfileRow | null }))
          .filter((p): p is FollowProfile => p !== null)
      );

      // Also load the session user's following set (for button state)
      if (sessionUser) {
        const { data: myFollowing } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", sessionUser.id);
        if (!cancelled) {
          setFollowingIds(new Set((myFollowing ?? []).map((r) => r.following_id)));
        }
      }

      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, [profileId, sessionUser?.id, supabase]);

  const toggleFollow = useCallback(
    async (targetProfileId: string) => {
      if (!sessionUser) return;

      const isFollowing = followingIds.has(targetProfileId);

      // Optimistic update
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (isFollowing) next.delete(targetProfileId);
        else next.add(targetProfileId);
        return next;
      });

      if (isFollowing) {
        await supabase
          .from("follows")
          .delete()
          .match({ follower_id: sessionUser.id, following_id: targetProfileId });
      } else {
        await supabase
          .from("follows")
          .insert({ follower_id: sessionUser.id, following_id: targetProfileId });
      }
    },
    [sessionUser, followingIds, supabase]
  );

  return { following, followers, followingIds, loading, toggleFollow };
}

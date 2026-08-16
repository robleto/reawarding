"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";

export type FollowProfile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
};

/** Result of a toggleFollow call, so callers can detect and react to failure. */
export type ToggleFollowResult = {
  success: boolean;
  error?: string;
};

export type UseFollowingResult = {
  /** Profiles this user follows */
  following: FollowProfile[];
  /** Profiles that follow this user */
  followers: FollowProfile[];
  /** IDs of profiles the *current session user* follows (for button state) */
  followingIds: Set<string>;
  loading: boolean;
  /** Set if the most recent load() failed to fetch one or more of the follow lists */
  error: string | null;
  /** Toggle follow/unfollow for a target profile ID */
  toggleFollow: (targetProfileId: string) => Promise<ToggleFollowResult>;
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      // People this profile follows, people following this profile, and (if
      // logged in) the session user's own following set — none of these
      // depend on each other, so fire them concurrently.
      const [followingQuery, followerQuery, myFollowingQuery] = await Promise.all([
        supabase
          .from("follows")
          .select("following_id, profiles!follows_following_id_fkey(id, username, full_name, avatar_url)")
          .eq("follower_id", profileId),
        supabase
          .from("follows")
          .select("follower_id, profiles!follows_follower_id_fkey(id, username, full_name, avatar_url)")
          .eq("following_id", profileId),
        sessionUser
          ? supabase
              .from("follows")
              .select("following_id")
              .eq("follower_id", sessionUser.id)
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (cancelled) return;

      const { data: followingRows, error: followingError } = followingQuery;
      const { data: followerRows, error: followerError } = followerQuery;
      const { data: myFollowing, error: myFollowingError } = myFollowingQuery;

      const loadError = followingError ?? followerError ?? myFollowingError;
      if (loadError) {
        setError(loadError.message || "Failed to load follow data.");
        setLoading(false);
        return;
      }

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
        setFollowingIds(new Set((myFollowing ?? []).map((r) => r.following_id)));
      }

      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, [profileId, sessionUser?.id, supabase]);

  const toggleFollow = useCallback(
    async (targetProfileId: string): Promise<ToggleFollowResult> => {
      if (!sessionUser) {
        return { success: false, error: "You must be signed in to follow." };
      }

      const isFollowing = followingIds.has(targetProfileId);

      // Optimistic update
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (isFollowing) next.delete(targetProfileId);
        else next.add(targetProfileId);
        return next;
      });

      const revert = () => {
        setFollowingIds((prev) => {
          const next = new Set(prev);
          if (isFollowing) next.add(targetProfileId);
          else next.delete(targetProfileId);
          return next;
        });
      };

      if (isFollowing) {
        const { error: deleteError } = await supabase
          .from("follows")
          .delete()
          .match({ follower_id: sessionUser.id, following_id: targetProfileId });
        if (deleteError) {
          revert();
          return { success: false, error: deleteError.message || "Failed to unfollow." };
        }
      } else {
        const { error: insertError } = await supabase
          .from("follows")
          .insert({ follower_id: sessionUser.id, following_id: targetProfileId });
        if (insertError) {
          revert();
          return { success: false, error: insertError.message || "Failed to follow." };
        }
      }

      return { success: true };
    },
    [sessionUser, followingIds, supabase]
  );

  return { following, followers, followingIds, loading, error, toggleFollow };
}

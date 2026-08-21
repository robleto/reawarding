"use client";

import { useState, useEffect, useCallback } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import type { Database } from "@/types/supabase";
import useGuestRankingStore from "@/hooks/useGuestRankingStore";
import { toNormalizedAward, type UserAward } from "@/utils/normalizeUserAward";

export type { UserAward };

/**
 * useUserAwards — returns the current user's awards for homepage state.
 *
 * Determines homepage state:
 * - awardCount === 0 → "The Ballot"
 * - awardCount 1-5   → "The Shelf"
 * - awardCount 5+    → "The Control Room"
 *
 * Authenticated: queries `awards` table.
 * Guest: reads from Zustand guest store.
 */
export function useUserAwards() {
  const supabase = useSupabaseClient<Database>();
  const user = useUser();
  // Subscribe to the awards slice with a selector so this hook re-renders
  // whenever guestStore.setAward() is called (Zustand notifies subscribers).
  // Previously used useGuestRankingStore() (whole store — stable reference),
  // which meant fetchAwards never re-ran and the awards list stayed stale.
  const guestAwards = useGuestRankingStore((state) => state.awards);
  const isGuest = !user;

  const [awards, setAwards] = useState<UserAward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAwards = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (isGuest) {
      // guestAwards is a Record<number, GuestAward> — convert to array
      const awardsArray = Object.values(guestAwards) as any[];
      setAwards(
        awardsArray
          .map(toNormalizedAward)
          .filter((award): award is UserAward => Boolean(award))
          .sort((a, b) => b.year - a.year)
      );
      setLoading(false);
      return;
    }

    // Authenticated: query Supabase awards table
    try {
      const { data, error } = await supabase
        .from("awards")
        .select("year, category, winner_id, nominee_ids")
        .eq("user_id", user!.id)
        .eq("category", "best-picture")
        .order("year", { ascending: false });

      if (error) {
        // Table might not exist yet — graceful fallback
        if (error.code === "42P01" || error.code === "42703") {
          setAwards([]);
        } else {
          console.warn("[useUserAwards] Error fetching awards:", error.message);
          setAwards([]);
          setError(error.message);
        }
      } else {
        const normalized = (data || [])
          .map(toNormalizedAward)
          .filter((award): award is UserAward => Boolean(award));
        setAwards(normalized);
      }
    } catch (err) {
      console.warn("[useUserAwards] Unexpected error:", err);
      setAwards([]);
      setError(err instanceof Error ? err.message : "Failed to load awards");
    }

    setLoading(false);
  }, [isGuest, guestAwards, supabase, user]);

  useEffect(() => {
    fetchAwards();
  }, [fetchAwards]);

  // Refetch when tab regains focus (user may have edited on Awards page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchAwards();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchAwards]);

  const awardCount = awards.length;

  return {
    awards,
    awardCount,
    loading,
    error,
    refetch: fetchAwards,
  };
}

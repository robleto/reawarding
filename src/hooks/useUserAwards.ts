"use client";

import { useState, useEffect, useCallback } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import type { Database } from "@/types/supabase";
import useGuestRankingStore from "@/hooks/useGuestRankingStore";

export interface UserAward {
  year: number;
  category: string;
  winnerId: number | null;
  nomineeIds: number[];
}

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
  const guestStore = useGuestRankingStore();
  const isGuest = !user;

  const [awards, setAwards] = useState<UserAward[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAwards = useCallback(async () => {
    if (isGuest) {
      // Read from guest store
      const guestAwards = guestStore.getAllAwards();
      setAwards(
        guestAwards.map((a) => ({
          year: a.year,
          category: a.category,
          winnerId: a.winnerId,
          nomineeIds: a.nomineeIds,
        }))
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
        .order("year", { ascending: false });

      if (error) {
        // Table might not exist yet — graceful fallback
        if (error.code === "42P01" || error.code === "42703") {
          setAwards([]);
        } else {
          console.warn("[useUserAwards] Error fetching awards:", error.message);
          setAwards([]);
        }
      } else {
        setAwards(
          (data || []).map((row: any) => ({
            year: row.year,
            category: row.category,
            winnerId: row.winner_id,
            nomineeIds: row.nominee_ids || [],
          }))
        );
      }
    } catch (err) {
      console.warn("[useUserAwards] Unexpected error:", err);
      setAwards([]);
    }

    setLoading(false);
  }, [isGuest, guestStore, supabase, user]);

  useEffect(() => {
    fetchAwards();
  }, [fetchAwards]);

  const awardCount = awards.length;

  return {
    awards,
    awardCount,
    loading,
    refetch: fetchAwards,
  };
}

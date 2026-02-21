"use client";

import { useState, useEffect, useCallback } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import type { Database } from "@/types/supabase";
import useGuestRankingStore from "@/hooks/useGuestRankingStore";

export interface UserAward {
  year: number;
  category: string;
  winnerId: string | number | null;
  nomineeIds: (string | number)[];
}

function isBestPictureCategory(category: unknown): boolean {
  if (typeof category !== "string") return false;
  const normalized = category.trim().toLowerCase().replace(/[_\s]+/g, "-");
  return normalized === "best-picture";
}

function toNormalizedAward(raw: any): UserAward | null {
  const year = Number(raw?.year);
  if (!Number.isFinite(year)) return null;

  const payload =
    raw?.nominations && typeof raw.nominations === "object"
      ? { ...raw, ...raw.nominations }
      : raw;

  const rawCategory = typeof raw?.category === "string" ? raw.category : "best-picture";
  const category = rawCategory.trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (!isBestPictureCategory(category)) return null;

  const rawWinnerId =
    payload?.winnerId ??
    payload?.winner_id ??
    payload?.winner?.id ??
    payload?.winner_movie_id ??
    null;

  const nomineeSource = Array.isArray(payload?.nomineeIds)
    ? payload.nomineeIds
    : Array.isArray(payload?.nominee_ids)
      ? payload.nominee_ids
      : Array.isArray(payload?.nominees)
        ? payload.nominees.map((n: any) => n?.id ?? n)
        : [];

  const nomineeIds = nomineeSource
    .filter((id: unknown) => id != null && id !== "")
    .map((id: unknown) => {
      const asNum = Number(id);
      return Number.isFinite(asNum) && String(asNum) === String(id) ? asNum : id;
    }) as (string | number)[];
  const winnerId: string | number | null =
    rawWinnerId != null && rawWinnerId !== ""
      ? (() => {
          const asNum = Number(rawWinnerId);
          return Number.isFinite(asNum) && String(asNum) === String(rawWinnerId) ? asNum : rawWinnerId;
        })()
      : nomineeIds[0] ?? null;

  return {
    year,
    category,
    winnerId,
    nomineeIds,
  };
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
  // Subscribe to the awards slice with a selector so this hook re-renders
  // whenever guestStore.setAward() is called (Zustand notifies subscribers).
  // Previously used useGuestRankingStore() (whole store — stable reference),
  // which meant fetchAwards never re-ran and the awards list stayed stale.
  const guestAwards = useGuestRankingStore((state) => state.awards);
  const isGuest = !user;

  const [awards, setAwards] = useState<UserAward[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAwards = useCallback(async () => {
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
    refetch: fetchAwards,
  };
}

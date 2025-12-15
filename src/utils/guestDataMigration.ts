import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { getGuestData, clearGuestData } from "./guestMode";

export async function migrateGuestData(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ success: boolean; migratedCount: number; error?: string }> {
  try {
    const guestData = getGuestData();
    
    if (!guestData.rankings || guestData.rankings.length === 0) {
      return { success: true, migratedCount: 0 };
    }

    // Map guest movieIds (TMDB numeric) -> DB movies.id (uuid)
    const tmdbIds = Array.from(new Set(guestData.rankings.map((r) => r.movieId)));
    const { data: movieRows, error: movieLookupError } = await supabase
      .from("movies")
      .select("id, tmdb_id")
      .in("tmdb_id", tmdbIds);

    if (movieLookupError) {
      console.error("Error looking up movies by tmdb_id:", movieLookupError);
      return { success: false, migratedCount: 0, error: movieLookupError.message };
    }

    const tmdbToUuid = new Map<number, string>();
    for (const row of movieRows || []) {
      if (row.tmdb_id != null) tmdbToUuid.set(row.tmdb_id, row.id);
    }

    const rankingsToInsertRaw: Array<Database["public"]["Tables"]["rankings"]["Insert"] | null> =
      guestData.rankings.map((ranking) => {
        const movieId = tmdbToUuid.get(ranking.movieId);
        if (!movieId) return null;
        return {
          user_id: userId,
          movie_id: movieId,
          ranking: ranking.ranking,
          seen_it: ranking.seenIt,
        };
      });

    const rankingsToInsert: Database["public"]["Tables"]["rankings"]["Insert"][] =
      rankingsToInsertRaw.filter(
        (r): r is Database["public"]["Tables"]["rankings"]["Insert"] => r !== null
      );

    if (rankingsToInsert.length === 0) {
      return { success: false, migratedCount: 0, error: "No matching movies found to migrate guest rankings." };
    }

    // Insert rankings into the database
    const { error } = await supabase.from("rankings").upsert(rankingsToInsert, {
      onConflict: "user_id,movie_id",
      ignoreDuplicates: false,
    });

    if (error) {
      console.error("Error migrating guest data:", error);
      return { success: false, migratedCount: 0, error: error.message };
    }

    // Only clear guest data if we migrated everything (avoid data loss).
    if (rankingsToInsert.length === guestData.rankings.length) {
      clearGuestData();
    }

    return { success: true, migratedCount: rankingsToInsert.length };
  } catch (error) {
    console.error("Error migrating guest data:", error);
    return { 
      success: false, 
      migratedCount: 0, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

export function hasGuestData(): boolean {
  const guestData = getGuestData();
  return !!(guestData.rankings && guestData.rankings.length > 0);
}

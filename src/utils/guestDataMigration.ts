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

    // Convert guest rankings to database format
    const rankingsToInsert = guestData.rankings.map((ranking) => ({
      user_id: userId,
      movie_id: ranking.movieId,
      ranking: ranking.ranking,
      seen_it: ranking.seenIt,
    }));

    // Insert rankings into the database
    const { error } = await supabase
      .from("user_rankings")
      .upsert(rankingsToInsert, {
        onConflict: "user_id,movie_id",
        ignoreDuplicates: false,
      });

    if (error) {
      console.error("Error migrating guest data:", error);
      return { success: false, migratedCount: 0, error: error.message };
    }

    // Clear guest data after successful migration
    clearGuestData();

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

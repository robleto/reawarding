import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export async function ensureUserWatchlist(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  try {
    const existing = await supabase
      .from("movie_lists")
      .select("id")
      .eq("user_id", userId)
      .eq("list_type", "watchlist")
      .limit(1)
      .maybeSingle();

    if (existing.data?.id) return existing.data.id as string;

    const insertRes = await supabase
      .from("movie_lists")
      .insert({
        user_id: userId,
        name: "Watchlist",
        description: "Movies I want to watch",
        is_public: false,
        list_type: "watchlist",
      })
      .select("id")
      .single();

    if (insertRes.error) throw insertRes.error;
    return insertRes.data?.id ?? null;
  } catch (error) {
    console.error("ensureUserWatchlist error", error);
    return null;
  }
}

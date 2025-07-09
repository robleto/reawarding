import { supabase } from "@/lib/supabaseBrowser";
import type { Database } from "@/types/supabase";

export async function fetchRankings() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("User fetch error:", userError.message);
    throw userError;
  }

  if (!user) {
    console.warn("User not found during fetch.");
    return [];
  }

  const { data, error } = await supabase
    .from("movies")
    .select(`
      id,
      title,
      release_year,
      poster_url,
      thumb_url,
      rankings (
        id,
        seen_it,
        ranking,
        user_id
      )
    `)
    .eq("rankings.user_id", user.id); // ✅ filter only this user's rankings

  if (error) {
    console.error("Supabase fetch error:", error);
    throw error;
  }

  return data;
}

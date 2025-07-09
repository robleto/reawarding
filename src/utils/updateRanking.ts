import { supabase } from "@/lib/supabaseBrowser";
import type { Database } from "@/types/supabase";

export async function updateRanking({
  movie_id,
  seen_it,
  ranking,
}: {
  movie_id: number | string;
  seen_it: boolean;
  ranking: number;
}) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.error("❌ Error fetching user:", userError.message);
    throw userError;
  }

  if (!user) {
    console.warn("⚠️ No user signed in — skipping update.");
    throw new Error("User not signed in");
  }

  const payload = {
    user_id: user.id,
    movie_id: Number(movie_id),
    seen_it: seen_it,
    ranking: ranking,
  };
  
console.log("⬆️ Submitting payload to Supabase:", {
  payload,
  userId: user.id,
  isMatching: user.id === payload.user_id,
});

  const { data, error } = await supabase
    .from("rankings")
    .upsert(payload, {
      onConflict: "user_id,movie_id",
    });

  if (error) {
    console.error("❌ Supabase upsert error:", error.message, error.details);
    throw error;
  }

  console.log("✅ Upsert succeeded:", data);
  return data;
}

// src/utils/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

export async function fetchRankings() {
	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
	);

	const { data, error } = await supabase.from("moviesDB").select("*");
	if (error) throw new Error(error.message);
	return data;
}

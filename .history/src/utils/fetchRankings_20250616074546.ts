// src/utils/fetchRankings.ts
import { supabase } from "@/utils/supabaseClient";

export async function fetchRankings() {
	const { data, error } = await supabase.from("moviesDB").select("*");

	if (error) {
		console.error("Supabase fetch error:", error.message);
		throw error; // Re-throw so useEffect can catch it
	}

	return data;
}

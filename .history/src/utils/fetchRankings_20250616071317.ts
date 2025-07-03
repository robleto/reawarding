// src/utils/fetchRankings.ts
import { supabase } from "@/utils/supabaseServer";


export async function fetchRankings() {
	const { data, error } = await supabase.from("moviesDB").select("*");

	if (error) throw new Error(error.message);
	return data;
}

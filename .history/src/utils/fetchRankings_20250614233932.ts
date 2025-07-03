// src/utils/fetchRankings.ts
import { supabase } from "./supabaseClient";

export async function fetchRankings() {
	const { data, error } = await supabase.from("moviesDB").select("*");

	if (error) throw new Error(error.message);
	return data;
}

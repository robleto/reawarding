// src/utils/fetchRankings.ts
import { supabaseServer } from "@/utils/supabaseServer";

import { supabase } from "@/utils/supabaseClient";

export async function fetchRankings() {
	const { data, error } = await supabase.from("moviesDB").select("*");

	if (error) throw new Error(error.message);
	return data;
}

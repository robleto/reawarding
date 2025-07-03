// src/utils/fetchRankings.ts


export async function fetchRankings() {
	const { data, error } = await supabase.from("moviesDB").select("*");

	if (error) throw new Error(error.message);
	return data;
}

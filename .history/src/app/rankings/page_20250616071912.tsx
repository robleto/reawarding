export const dynamic = "force-dynamic";

import { supabaseServer } from "@/utils/supabaseServer";

type Movie = {
	id: number;
	title: string;
	// Add other fields as needed
};

export default async function RankingsPage() {
	const supabase = supabaseServer();

	const { data: movies, error } = await supabase.from("moviesDB").select("*");

	if (error) {
		console.error("Error fetching rankings:", error.message);
		return (
			<div>
				<h1>Error fetching rankings</h1>
				<p>{error.message}</p>
			</div>
		);
	}

	return (
		<div>
			<h1>Rankings</h1>
			{movies?.map((movie: Movie) => (
				<div key={movie.id}>{movie.title}</div>
			))}
		</div>
	);
}

// src/app/rankings/page.tsx
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "@/types/supabase"; // Make sure this file isn't blank

export default async function RankingsPage() {
	const supabase = createServerComponentClient<Database>({ cookies });

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
			{movies?.map((movie) => (
				<div key={movie.id}>{movie.title}</div>
			))}
		</div>
	);
}

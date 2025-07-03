// src/app/rankings/page.tsx
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "@/types/supabase";

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
				<div key={movie.id}>
					<strong>{movie.title}</strong> ({movie.year}) —{" "}
					{movie.studio}
				</div>
			))}
		</div>
	);
}

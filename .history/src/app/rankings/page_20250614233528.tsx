// app/rankings/page.tsx

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Movie {
	id: string;
	title: string;
	year: number;
	studio: string;
	genre: string;
	rating: number;
	user_ranking: number;
	seen: boolean;
	thumb_url: string;
	nominee?: boolean;
}

export default function RankingsPage() {
	const [movies, setMovies] = useState<Movie[]>([]);

	useEffect(() => {
		const fetchMovies = async () => {
			const { data, error } = await supabase.from("moviesDB").select("*");
			if (error) console.error("Error fetching movies:", error);
			else setMovies(data);
		};
		fetchMovies();
	}, []);

	return (
		<div className="max-w-screen-xl px-4 py-8 mx-auto">
			<h1 className="mb-6 text-4xl font-bold">Rankings</h1>
			<table className="w-full border-collapse table-auto">
				<thead>
					<tr className="text-left bg-gray-200">
						<th className="p-2">Seen</th>
						<th className="p-2">Ranking</th>
						<th className="p-2">Thumb</th>
						<th className="p-2">Movie</th>
						<th className="p-2">Year</th>
						<th className="p-2">Studio</th>
						<th className="p-2">Rating</th>
						<th className="p-2">Genre</th>
						<th className="p-2">Nominee</th>
					</tr>
				</thead>
				<tbody>
					{movies
						.sort(
							(a, b) =>
								a.year - b.year ||
								a.user_ranking - b.user_ranking
						)
						.map((movie) => (
							<tr
								key={movie.id}
								className="border-b border-gray-300"
							> 
									<input
										type="checkbox"
										checked={movie.seen}
										readOnly
									/>
								</td>
							> 
              <td className="p-2">{movie.user_ranking}</td>
									<Image
										src={movie.thumb_url}
										alt={movie.title}
										width={64}
										height={96}
										className="w-16 h-auto rounded"
									/>
								</td>
								<td className="p-2 font-semibold">
									{movie.title}
								</td>
								<td className="p-2">{movie.year}</td>
								<td className="p-2">{movie.studio}</td>
								<td className="p-2">{movie.rating}</td>
								<td className="p-2">{movie.genre}</td>
								<td className="p-2">
									{movie.nominee ? "🏆" : ""}
								</td>
							</tr>
						))}
				</tbody>
			</table>
		</div>
	);
}

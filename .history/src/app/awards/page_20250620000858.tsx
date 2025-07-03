import YearSection from "@/components/award/YearSection";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase"; // if you're using Supabase types

interface DisplayMovie {
	id: string;
	title: string;
	release_year: string;
	thumb_url: string;
	poster_url: string;
	ranking: number;
}

interface YearData {
	year: string;
	winner: DisplayMovie;
	nominees: DisplayMovie[];
}

export default async function AwardsPage() {
	const supabase = createServerComponentClient<Database>({ cookies });

	const { data: movies, error } = await supabase
		.from("movies")
		.select("id, title, release_year, thumb_url, poster_url, rankings(ranking)")
		.order("release_year", { ascending: false });

	if (error || !movies) {
		return (
			<div className="p-6 text-red-600">Failed to load movie data.</div>
		);
	}

	const moviesWithRankings: DisplayMovie[] = movies.map((movie) => ({
		id: String(movie.id),
		title: movie.title,
		release_year: movie.release_year,
		thumb_url: movie.thumb_url,
		poster_url: movie.poster_url,
		ranking: movie.rankings?.[0]?.ranking ?? 0,
	}))
  .filter((m) => m.ranking !== null);

	const groupedByYear = moviesWithRankings.reduce<
		Record<string, DisplayMovie[]>
	>((acc, movie) => {
		const year = movie.release_year;
		if (!acc[year]) acc[year] = [];
		acc[year].push(movie);
		return acc;
	}, {});

	const formattedYears: YearData[] = Object.entries(groupedByYear)
		.map(([year, movies]) => {
			// Sort by ranking DESC
			const sorted = [...movies].sort((a, b) => b.ranking - a.ranking);

			return {
				year,
				winner: sorted[0], // ⬅️ Highest ranked
				nominees: sorted.slice(0, 10), // ⬅️ Top 10
			};
		})
		.sort((a, b) => Number(b.year) - Number(a.year)); // Year DESC

	return (
		<div className="flex flex-col items-center justify-center h-48 gap-2">
			<main className="flex-1 mt-8 space-y-24">
				{formattedYears.map((yearData) => (
					<YearSection
						key={yearData.year}
						year={yearData.year}
						winner={yearData.winner}
						movies={yearData.nominees}
					/>
				))}
			</main>
		</div>
	);
}

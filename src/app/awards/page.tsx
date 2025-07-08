import EditableYearSection from "@/components/award/EditableYearSection";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase"; // if you're using Supabase types

interface DisplayMovie {
	id: string;
	title: string;
	release_year: number;
	thumb_url: string;
	poster_url: string;
	ranking: number;
}

interface YearData {
	year: string;
	winner: DisplayMovie;
	nominees: DisplayMovie[];
	allMovies: DisplayMovie[]; // All movies for the year
}

export default async function AwardsPage() {
	const cookieStore = await cookies();
	const supabase = createServerClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll();
				},
				setAll(cookiesToSet) {
					try {
						cookiesToSet.forEach(({ name, value, options }) => {						cookieStore.set(name, value, options);
					});
				} catch {
					// Ignore cookie setting errors in server components
				}
				},
			},
		}
	);

	const { data: movies, error } = await supabase
		.from("movies")
		.select("id, title, release_year, thumb_url, poster_url, rankings(ranking)")
		.order("release_year", { ascending: false });

	if (error || !movies) {
		return (
			<div className="p-6 text-red-600 dark:text-red-400">Failed to load movie data.</div>
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
			
			// Default nominees: top 10 movies ranked 7 or above
			const defaultNominees = sorted
				.filter(movie => movie.ranking >= 7)
				.slice(0, 10);
			
			// Default winner: highest ranked among nominees (or highest overall if no 7+ movies)
			const defaultWinner = defaultNominees.length > 0 ? defaultNominees[0] : sorted[0];

			return {
				year,
				winner: defaultWinner,
				nominees: defaultNominees,
				allMovies: sorted, // ⬅️ All movies for this year
			};
		})
		.sort((a, b) => Number(b.year) - Number(a.year)); // Year DESC

	return (
		<div className="p-6 pt-16 mx-auto">
			<main className="flex-1 ">
				{formattedYears.map((yearData) => (
					<EditableYearSection
						key={yearData.year}
						year={yearData.year}
						winner={yearData.winner}
						movies={yearData.nominees}
						allMoviesForYear={yearData.allMovies}
					/>
				))}
			</main>
		</div>
	);
}

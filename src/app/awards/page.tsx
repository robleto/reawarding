import EditableYearSection from "@/components/award/EditableYearSection";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";
import type { Movie } from "@/types/types";

interface YearData {
	year: string;
	winner: Movie | undefined;
	nominees: Movie[];
	allMovies: Movie[]; // All movies for the year
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
		.select("*, rankings(*)")
		.order("release_year", { ascending: false });

	if (error || !movies) {
		return (
			<div className="p-6 text-red-600 dark:text-red-400">Failed to load movie data.</div>
		);
	}

	const moviesWithRankings: Movie[] = movies
		.map((movie) => ({
			...(movie as Movie),
			rankings: Array.isArray(movie.rankings) ? movie.rankings : [],
		}))
		.filter(
			(m) => m.rankings && m.rankings.length > 0 && m.rankings[0].ranking !== null
		);

	const groupedByYear = moviesWithRankings.reduce<Record<string, Movie[]>>(
		(acc, movie) => {
			const year = String(movie.release_year);
			if (!acc[year]) acc[year] = [];
			acc[year].push(movie);
			return acc;
		},
		{}
	);

	const formattedYears: YearData[] = Object.entries(groupedByYear)
		.map(([year, moviesInYear]) => {
			// Sort by ranking DESC
			const sorted = [...moviesInYear].sort(
				(a, b) => (b.rankings[0]?.ranking ?? 0) - (a.rankings[0]?.ranking ?? 0)
			);

			// Default nominees: top 10 movies ranked 7 or above
			const defaultNominees = sorted
				.filter((movie) => (movie.rankings[0]?.ranking ?? 0) >= 7)
				.slice(0, 10);

			// Default winner: highest ranked among nominees (or highest overall if no 7+ movies)
			const defaultWinner =
				defaultNominees.length > 0 ? defaultNominees[0] : sorted[0];

			return {
				year,
				winner: defaultWinner,
				nominees: defaultNominees,
				allMovies: sorted, // ⬅️ All movies for this year
			};
		})
		.sort((a, b) => Number(b.year) - Number(a.year)); // Year DESC

	return (
		<div className="p-4 md:p-6 pt-12 md:pt-16 mx-auto">
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

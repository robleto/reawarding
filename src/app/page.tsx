"use client";
import {
	useMovieData,
	filterUnseenMovies,
	sortByRecent,
} from "@/utils/sharedMovieUtils";
import YearReview from "@/components/award/YearSection";
import MoviePosterCard from "@/components/movie/MoviePosterCard";

import type { Movie as BaseMovie } from "@/types/types";

// Remove the unused MovieWithRanking type
// Remove the conflicting Movie interface - use BaseMovie directly

export default function HomePage() {
	const { movies, loading, userId, updateMovieRanking } = useMovieData();

	if (loading) {
		return <p>Loading...</p>;
	}

	// Use BaseMovie[] directly instead of casting to Movie[]
	const unseen = sortByRecent(filterUnseenMovies(movies));

	return (
		<div className="px-4 py-8">
			{/* Start Watching */}
			<h2 className="mb-4 text-xl font-bold">For Your Consideration</h2>
			<div className="flex gap-4 pb-4 overflow-x-auto">
				{unseen.map((movie) => {
					const r = movie.rankings?.[0];
					return (
						<div key={movie.id} className="flex-shrink-0 w-[160px]">
							<MoviePosterCard
								movie={movie}
								currentUserId={userId}
								ranking={r?.ranking ?? null}
								seenIt={r?.seen_it ?? false}
								onUpdate={updateMovieRanking}
							/>
						</div>
					);
				})}
			</div>
			{/* Current Best Picture */}
			<section className="px-6 py-8">
				<h2 className="mb-4 text-xl font-bold">
					🏆 Best Picture of {new Date().getFullYear()}
				</h2>
				<YearReview
					year={String(new Date().getFullYear())}
					movies={movies
						.filter((movie) => {
							const movieYear =
								movie.release_year ||
								(movie.release_year &&
									new Date(movie.release_year).getFullYear());
							return movieYear === new Date().getFullYear();
						})
						.map((movie) => ({
							id: String(movie.id),
							title: movie.title,
							thumb_url: movie.thumb_url,
							poster_url: movie.poster_url,
							ranking: movie.rankings?.[0]?.ranking ?? 0,
						}))}
					winner={(() => {
						const currentYearMovies = movies.filter(
							(movie: BaseMovie) => {
								const movieYear =
									movie.release_year ||
									(movie.release_year &&
										new Date(
											movie.release_year
										).getFullYear());
								return movieYear === new Date().getFullYear();
							}
						);

						const topMovie = currentYearMovies.reduce(
							(topMovie, currentMovie) => {
								const currentRanking =
									currentMovie.rankings?.[0]?.ranking ?? 0;
								const topRanking =
									topMovie?.rankings?.[0]?.ranking ?? 0;
								return currentRanking > topRanking
									? currentMovie
									: topMovie;
							},
							null as BaseMovie | null
						);

						// Transform BaseMovie to the expected format with ranking property
						return topMovie
							? {
									id: String(topMovie.id),
									title: topMovie.title,
									thumb_url: topMovie.thumb_url,
									poster_url: topMovie.poster_url,
									ranking:
										topMovie.rankings?.[0]?.ranking ?? 0,
							  }
							: null;
					})()}
				/>
			</section>
		</div>
	);
}

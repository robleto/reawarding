"use client";
import {
	useMovieData,
	filterUnseenMovies,
	sortByRecent,
} from "@/utils/sharedMovieUtils";
import YearReview from "@/components/award/YearSection";
import MoviePosterCard from "@/components/movie/MoviePosterCard";

import type { Movie as BaseMovie } from "@/types/types";

type MovieWithRanking = BaseMovie & {
	ranking: number;
};
interface Movie extends BaseMovie {
	ranking: number;
	release_year?: number;
	rankings?: { ranking: number }[];
}

export default function HomePage() {
	const { movies, loading, userId } = useMovieData();

	if (loading) {
		return <p>Loading...</p>;
	}

	const unseen = sortByRecent(filterUnseenMovies(movies as Movie[]));

	return (
		<div className="px-4 py-8">
			{/* Start Watching */}
			<h2 className="mb-4 text-xl font-bold">For Your Consideration</h2>
			<div className="flex gap-4 pb-4 overflow-x-auto">
				{unseen.map((movie) => (
					<div key={movie.id} className="flex-shrink-0 w-[160px]">
						<MoviePosterCard
							movie={movie}
							currentUserId={userId}
							onUpdate={() => {}} // no update logic on homepage for now
						/>
					</div>
				))}
			</div>
			{/* Current Best Picture */}
			<section className="px-6 py-8">
				<h2 className="mb-4 text-xl font-bold">
					🏆 Best Picture of {new Date().getFullYear()}
				</h2>
				<YearReview
					year={String(new Date().getFullYear())}
					movies={(movies as Movie[])
						.filter((movie) => {
							const movieYear = movie.release_year || (movie.release_year && new Date(movie.release_year).getFullYear());
							return movieYear === new Date().getFullYear();
						})
						.map((movie) => ({
							id: String(movie.id),
							title: movie.title,
							thumb_url: movie.thumb_url,
							poster_url: movie.poster_url,
							ranking: movie.rankings?.[0]?.ranking ?? 0, // Use the first ranking or default to 0
						}))
					}
					winner={movies
						.filter((movie: Movie) => {
							const movieYear = movie.release_year || (movie.release_year && new Date(movie.release_year).getFullYear());
							return movieYear === new Date().getFullYear();
						})
						.reduce((topMovie, currentMovie) => {
							const currentRanking = currentMovie.rankings?.[0]?.ranking ?? 0;
							const topRanking = topMovie?.rankings?.[0]?.ranking ?? 0;
							return currentRanking > topRanking ? currentMovie : topMovie;
						}, null)}
				/>
			</section>
		</div>
	);
}

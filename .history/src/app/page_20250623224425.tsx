"use client";
import {
	useMovieData,
	filterUnseenMovies,
	sortByRecent,
} from "@/utils/sharedMovieUtils";
import YearReview from "@/components/award/YearSection";
import MoviePosterCard from "@/components/movie/MoviePosterCard";

import type { Movie } from "@/types/types"; // Adjust the import path as needed

export default function HomePage() {
	const { movies, loading, userId } = useMovieData();

	if (loading) {
		return <p>Loading...</p>;
	}

	const unseen = sortByRecent(filterUnseenMovies(movies));

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
					movies={movies.map((movie: Movie) => ({
						...movie,
						id: String(movie.id),
						ranking: movie.ranking ?? 0,
					}))}
					winner={null} // Replace null with the actual winner if available
			/>
			</section>
		</div>
	);
}

"use client";
import {
	useMovieData,
	filterUnseenMovies,
	sortByRecent,
} from "@/utils/sharedMovieUtils";
import YearReview from "@/components/YearReview";
import MoviePosterCard from "@/components/movie/MoviePosterCard";

export default function HomePage() {
	const { movies, loading, userId } = useMovieData();

	if (loading) {
		return <p>Loading...</p>;
	}

	const unseen = sortByRecent(filterUnseenMovies(movies));

	return (
		<div className="px-4 py-8">
			{/* Start Watching */}
			<h2 className="mb-4 text-xl font-bold">Start Watching</h2>
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

			<section className="px-6 py-8">
				<h2 className="mb-4 text-xl font-bold">
					🏆 Best Picture of {new Date().getFullYear()}
				</h2>
				<YearReview year={new Date().getFullYear()} />
			</section>
		</div>
	);
}

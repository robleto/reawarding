import React from "react";
import MovieCard from "./MovieCard";
import WinnerCard from "./WinnerCard";

interface Movie {
	id: string;
	title: string;
	thumb_url: string;
	poster_url: string;
	ranking: number;
}

interface YearSectionProps {
	year: string;
	movies: Movie[];
	winner: Movie;
}

export default function YearSection({
	year,
	movies,
	winner,
}: YearSectionProps) {
	const nomineeList = movies.filter((movie) => movie.id !== winner.id);

	return (
		<section className="w-full max-w-screen-xl px-6 py-0 mx-auto font-sans">
			<div className="relative flex flex-col gap-6 md:flex-row md:gap-8">
				{/* Timeline and year label */}
				<div className="absolute top-0 bottom-0 left-0 flex flex-col items-center">
					<h2 className="text-3xl font-bold text-[#1c3728] mt-2">
						✉️ {year}
					</h2>
					<div className="w-5 h-5 mt-2 rounded-full bg-[#d6d6d3] border-2 border-white" />
					<div className="w-[2px] flex-1 bg-[#d6d6d3]" />
				</div>

				{/* Spacer to account for timeline offset */}
				<div className="w-[80px] shrink-0" />

				{/* Content block */}
				<div className="flex flex-col md:flex-row w-full bg-white rounded-xl shadow-md border border-[#d6d6d3] p-6 mb-24 gap-12">
					{/* Winner */}
					<div className="w-full md:w-1/3">
						<WinnerCard
							title={winner.title}
							poster_url={winner.poster_url}
							rating={winner.ranking}
						/>
					</div>

					{/* Divider */}
					<div className="hidden md:block w-px bg-[#d6d6d3]" />

					{/* Nominees */}
					<div className="w-full md:w-2/3">
						<div className="flex items-center gap-2 mb-4">
							<div
								className="w-8 h-8 bg-[url('/icons/oscar.png')] bg-cover"
								aria-hidden="true"
							/>
							<h3 className="text-xl font-bold text-[#7e7e7e]">
								Top 10 of the Year
							</h3>
						</div>
						<div className="grid grid-cols-2 gap-4 md:grid-cols-3">
							{nomineeList.map((movie) => (
								<MovieCard
									key={movie.id}
									title={movie.title}
									imageUrl={movie.thumb_url}
									rating={movie.ranking}
								/>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

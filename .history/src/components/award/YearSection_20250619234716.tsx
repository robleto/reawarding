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
	movies: Movie[]; // Top 10 including or excluding winner
	winner: Movie;
}

export default function YearSection({
	year,
	movies,
	winner,
}: YearSectionProps) {
	// Optional: remove winner from nominees if needed
	const nomineeList = movies.filter((movie) => movie.id !== winner.id);

	return (
		<section className="w-full max-w-screen-xl px-8 py-12 mx-auto">
			<div className="relative flex items-start gap-4 min-h-[600px]">
				{/* Year Label + Timeline Dot */}
				<div className="absolute top-0 bottom-0 left-0 flex flex-col items-center">
					<h2 className="text-3xl font-bold text-[#1c3728] font-['Inter'] mt-2">
						{year}
					</h2>
					<div className="w-5 h-5 mt-2 rounded-full bg-[#d6d6d3] border-2 border-white" />
					<div className="w-[2px] flex-1 bg-[#d6d6d3]" />
				</div>

				<div className="w-[80px]" />

				<div className="flex flex-col md:flex-row gap-12 w-full bg-white rounded-xl shadow-md border border-[#d6d6d3] p-6">
					{/* Winner */}
					<div className="w-full md:w-1/3">
						<WinnerCard
							title={winner.title}
							poster={winner.thumb_url}
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
							<h3 className="text-xl font-bold text-[#7e7e7e] font-['Inter']">
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

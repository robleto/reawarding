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
	winner?: Movie | null;
}

export default function YearSection({
	year,
	movies,
	winner,
}: YearSectionProps) {
	const nomineeList = movies
		.filter((movie) => !winner || movie.id !== winner.id)
		.filter((movie) => movie.ranking >= 7)
		.sort((a, b) => b.ranking - a.ranking)
		.slice(0, 10);

	return (
		<section className="w-full max-w-screen-xl px-6 py-0 mx-auto my-0 font-sans">
			<div className="relative flex flex-col gap-6 md:flex-row md:gap-8">
				{/* Timeline and year label */}
				<h2 className="md:absolute block top-0 md:top-[125px] left-0 text-3xl font-bold text-[#A0A0A0] dark:text-[#9CA3AF] mt-2 md:rotate-[-90deg] origin-left font-['Unbounded'] tracking-widest">
					{year}
				</h2>
				<div className="top-0 bottom-0 flex-col items-center hidden md:absolute md:flex left-4">
					<div className="w-5 h-5 mt-2 rounded-full bg-[#A0A0A0] dark:bg-[#9CA3AF] border-2 border-[#F4F4F4] dark:border-gray-800" />
					<div className="w-[2px] flex-1 bg-[#bebebe] dark:bg-gray-600" />
				</div>

				{/* Spacer to account for timeline offset */}
				<div className="hidden md:inline-block w-0 md:w-[20px] shrink-0" />

				{/* Content block */}
				<div className="flex flex-col md:flex-row w-full bg-white dark:year-card-dark rounded-xl shadow-md dark:shadow-gray-900/50 border border-[#d6d6d3] dark:border-gray-600/50 p-6 mb-24 gap-12 transition-all duration-300 hover:shadow-lg dark:hover:shadow-gray-900/60">
					{/* Winner */}
					<div className="w-full md:w-1/3">
						{winner ? (
							<WinnerCard
								title={winner.title}
								poster_url={winner.poster_url}
								rating={winner.ranking}
							/>
						) : (
							<div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
								No Best Picture selected yet.
							</div>
						)}
					</div>

					{/* Divider */}
					<div className="hidden md:block w-px bg-[#d6d6d3] dark:bg-gray-600/50" />

					{/* Nominees */}
					<div className="w-full md:w-2/3">
						<div className="flex items-center gap-2 mb-4">
							<span className="text-xl">✉️</span>
							<h3 className="text-2xl font-bold text-[#7e7e7e] dark:text-gray-200">
								Nominees
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

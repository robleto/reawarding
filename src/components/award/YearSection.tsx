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
				<h2 className="md:absolute block top-0 md:top-[125px] left-0 text-3xl font-bold text-[#A0A0A0] mt-2 md:rotate-[-90deg] origin-left font-unbounded tracking-widest">
					{year}
				</h2>
				<div className="top-0 bottom-0 flex-col items-center hidden md:absolute md:flex left-4">
					<div className="w-5 h-5 mt-2 rounded-full bg-[#A0A0A0] border-2 border-[#F4F4F4]" />
					<div className="w-[2px] flex-1 bg-[#bebebe]" />
				</div>

				{/* Spacer to account for timeline offset */}
				<div className="hidden md:inline-block w-0 md:w-[20px] shrink-0" />

				{/* Content block */}
				<div className="flex flex-col overflow-visible transition bg-white dark:bg-gray-800 shadow hover:shadow-lg dark:shadow-gray-800 rounded-xl md:flex-row w-full shadow-md p-6 mb-24 gap-12">
					{/* Winner */}
					<div className="w-full md:w-1/3">
						<div className="inline-flex items-center justify-center gap-2 mb-4">
							<span className="text-xl">🏆</span>
							<h3 className="text-2xl font-bold text-[#cb8601] dark:text-yellow-400 font-unbounded">
								Winner
							</h3>
						</div>
						{winner ? (
							<WinnerCard
								title={winner.title}
								poster_url={winner.poster_url}
								rating={winner.ranking}
							/>
						) : (
							<div className="text-center py-8">
								<p className="text-gray-500 dark:text-gray-400">
									No winner selected
								</p>
							</div>
						)}
					</div>

					<div className="hidden md:block w-px bg-gray-200 dark:bg-gray-700" />

					{/* Nominees */}
					<div className="w-full md:w-2/3">
						<div className="flex items-center gap-2 mb-4">
							<span className="text-xl">✉️</span>
							<h3 className="text-2xl font-bold text-[#7e7e7e] dark:text-gray-200 font-unbounded">
								Nominees
							</h3>
						</div>

						<div className="grid grid-cols-2 gap-4 md:grid-cols-3">
							{nomineeList.map((movie) => (
								<MovieCard
									key={movie.id}
									title={movie.title}
									imageUrl={movie.poster_url}
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

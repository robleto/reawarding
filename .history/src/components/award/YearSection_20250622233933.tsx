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
  
	const nomineeList = movies
		.filter((movie) => movie.id !== winner.id)
		.filter((movie) => movie.ranking >= 7)
		.sort((a, b) => b.ranking - a.ranking) // optional: highest ranks first
		.slice(0, 10);

	return (
		<section className="w-full max-w-screen-xl px-6 py-0 mx-auto my-0 font-sans">
			<div className="relative flex flex-col gap-6 md:flex-row md:gap-8">
				{/* Timeline and year label */}
				<h2 className="absolute top-[125px] left-0 text-3xl font-bold text-[#A0A0A0] mt-2 rotate-[-90deg] origin-left font-['Unbounded'] tracking-widest">
					{year}
				</h2>
				<div className="absolute top-0 bottom-0 flex flex-col items-center display-none left-4 md-display-block">
					{/* <h2 className="text-3xl font-bold text-[#1c3728] mt-2">
						{year}
					</h2> */}
					<div className="w-5 h-5 mt-2 rounded-full bg-[#A0A0A0] border-2 border-[#F4F4F4]" />
					<div className="w-[2px] flex-1 bg-[#bebebe]" />
				</div>

				{/* Spacer to account for timeline offset */}
				<div className="w-[20px] shrink-0" />

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
							<span className="text-xl">✉️</span>
							<h3 className="text-2xl font-bold text-[#7e7e7e]">
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

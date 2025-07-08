"use client";

import { useState } from "react";
import MoviePosterCard from "@/components/movie/MoviePosterCard";
import MovieRowCard from "@/components/movie/MovieRowCard";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import MovieFilters from "@/components/filters/MovieFilters";
import type { Movie } from "@/types/types";

import {
	useMovieDataWithGuest,
	useViewMode,
	useMovieFilters,
	SORT_OPTIONS,
	GROUP_OPTIONS,
	type SortKey,
	type GroupKey,
} from "@/utils/sharedMovieUtils";

import Loader from "@/components/ui/Loading";

export const dynamic = "force-dynamic";

export default function FilmsPage() {
	const { movies, loading, user, userId, updateMovieRanking } = useMovieDataWithGuest();
	const [viewMode, setViewMode] = useViewMode("grid");
	const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	
	const {
		sortBy,
		sortOrder,
		groupBy,
		filterType,
		filterValue,
		setSortBy,
		setSortOrder,
		setGroupBy,
		setFilterType,
		setFilterValue,
		groupedMovies,
		uniqueYears,
		uniqueRanks,
	} = useMovieFilters(movies);

	const handleOpenModal = (movie: Movie) => {
		setSelectedMovie(movie);
		setIsModalOpen(true);
	};

	const handleCloseModal = () => {
		setSelectedMovie(null);
		setIsModalOpen(false);
	};

	if (!user) {
		return (
			<div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
				Please sign in to view your films.
			</div>
		);
	}


	if (loading) {
		return <Loader message="Loading films..." />;
	}

	return (
		<div className="max-w-screen-xl px-6 py-10 mx-auto">

			<MovieFilters
				viewMode={viewMode}
				setViewMode={setViewMode}
				sortBy={sortBy}
				setSortBy={setSortBy}
				sortOrder={sortOrder}
				setSortOrder={setSortOrder}
				groupBy={groupBy}
				setGroupBy={setGroupBy}
				filterType={filterType}
				setFilterType={setFilterType}
				filterValue={filterValue}
				setFilterValue={setFilterValue}
				uniqueYears={uniqueYears}
				uniqueRanks={uniqueRanks}
			/>

			{groupedMovies.map(({ key, movies }: { key: string; movies: import("@/types/types").Movie[] }) => (
				<div key={key} className="mb-10">
					{groupBy !== "none" && (
            <h2
              className="mb-6 text-4xl font-unbounded font-regular text-gray-800 dark:text-gray-100 tracking-wider"
            >
              {key}
            </h2>
					)}
					{viewMode === "grid" ? (
						<div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-5">
							{movies.map((movie) => {
								const r = movie.rankings?.[0];
								return (
									<MoviePosterCard
										key={movie.id}
										movie={movie}
										currentUserId={userId}
										ranking={r?.ranking ?? null}
										seenIt={r?.seen_it ?? false}
										onUpdate={updateMovieRanking}
										onClick={() => handleOpenModal(movie)}
									/>
								);
							})}
						</div>
					) : (
						<div className="flex flex-col">
							{movies.map((movie, index) => {
								const r = movie.rankings?.[0];
								return (
									<MovieRowCard
										key={movie.id}
										movie={movie}
										currentUserId={userId}
										ranking={r?.ranking ?? null}
										seenIt={r?.seen_it ?? false}
										isLast={index === movies.length - 1}
										onUpdate={updateMovieRanking}
										onClick={() => handleOpenModal(movie)}
									/>
								);
							})}
						</div>
					)}
				</div>
			))}

			{/* Movie Detail Modal */}
			{selectedMovie && (
				<MovieDetailModal
					movie={selectedMovie}
					isOpen={isModalOpen}
					onClose={handleCloseModal}
					initialRanking={selectedMovie.rankings?.[0]?.ranking ?? null}
					initialSeenIt={selectedMovie.rankings?.[0]?.seen_it ?? false}
				/>
			)}
		</div>
	);
}

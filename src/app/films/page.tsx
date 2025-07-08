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

<<<<<<< HEAD
=======
	if (!user) {
		return (
			<div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
				Please sign in to view your films.
			</div>
		);
	}


>>>>>>> 2122713 (feat: Enhance dark mode support and UI elements)
	if (loading) {
		return <Loader message="Loading films..." />;
	}

	return (
		<div className="max-w-screen-xl px-6 py-10 mx-auto">
<<<<<<< HEAD
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
=======
			<div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
				<div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-700 dark:text-gray-300">
					<div className="flex items-center gap-2">
						<label htmlFor="group-select">Group by</label>
						<select
							id="group-select"
							value={groupBy}
							onChange={(e) =>
								setGroupBy(e.target.value as GroupKey)
							}
							className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
						>
							{GROUP_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>

					<div className="flex items-center gap-2">
						<label htmlFor="sort-select">Sort by</label>
						<select
							id="sort-select"
							value={sortBy}
							onChange={(e) =>
								setSortBy(e.target.value as SortKey)
							}
							className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
						>
							{SORT_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>

						<button
							onClick={() =>
								setSortOrder(
									sortOrder === "asc" ? "desc" : "asc"
								)
							}
							aria-label="Toggle sort order"
							className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
							title={`Sort ${
								sortOrder === "asc" ? "Descending" : "Ascending"
							}`}
						>
							{sortOrder === "asc" ? (
								<span className="text-xl">▲</span>
							) : (
								<span className="text-xl">▼</span>
							)}
						</button>
					</div>

					{/* Filter Controls */}
					<div className="flex items-center gap-2">
						<label htmlFor="filter-type-select">Filter by</label>
						<select
							id="filter-type-select"
							value={filterType}
							onChange={(e) =>
								setFilterType(e.target.value as "none" | "year" | "rank")
							}
							className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
						>
							<option value="none">None</option>
							<option value="year">Year</option>
							<option value="rank">Ranking</option>
						</select>

						{filterType === "year" && (
							<select
								value={filterValue}
								onChange={(e) => setFilterValue(e.target.value)}
								className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
							>
								<option value="all">All Years</option>
								{uniqueYears.map((year) => (
									<option key={year} value={year}>
										{year}
									</option>
								))}
							</select>
						)}

						{filterType === "rank" && (
							<select
								value={filterValue}
								onChange={(e) => setFilterValue(e.target.value)}
								className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
							>
								<option value="all">All Rankings</option>
								{uniqueRanks.map((rank) => (
									<option key={rank} value={rank}>
										{rank}
									</option>
								))}
							</select>
						)}
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						onClick={() => setViewMode("list")}
						className={`p-2 rounded-full border ${
							viewMode === "list"
								? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-600"
								: "text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600"
						} hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}
						aria-label="List view"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="w-5 h-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 6h16M4 12h16M4 18h16"
							/>
						</svg>
					</button>
					<button
						onClick={() => setViewMode("grid")}
						className={`p-2 rounded-full border ${
							viewMode === "grid"
								? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-600"
								: "text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600"
						} hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}
						aria-label="Grid view"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="w-5 h-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 6h6v6H4V6zm0 8h6v6H4v-6zm10-8h6v6h-6V6zm0 8h6v6h-6v-6z"
							/>
						</svg>
					</button>
				</div>
			</div>
>>>>>>> 2122713 (feat: Enhance dark mode support and UI elements)

			{groupedMovies.map(({ key, movies }: { key: string; movies: import("@/types/types").Movie[] }) => (
				<div key={key} className="mb-10">
					{groupBy !== "none" && (
<<<<<<< HEAD
            <h2
              className="mb-6 text-4xl font-unbounded font-regular text-gray-800 dark:text-gray-100 tracking-wider"
            >
              {key}
            </h2>
=======
						<h2 className="mb-4 text-xl font-bold text-gray-800 dark:text-gray-200">
							{key}
						</h2>
>>>>>>> 2122713 (feat: Enhance dark mode support and UI elements)
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

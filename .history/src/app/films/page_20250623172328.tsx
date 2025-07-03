"use client";

import MoviePosterCard from "@/components/movie/MoviePosterCard";
import MovieRowCard from "@/components/movie/MovieRowCard";
import {
	useMovieData,
	useViewMode,
	groupMovies,
	SORT_OPTIONS,
	GROUP_OPTIONS,
	type SortKey,
	type GroupKey,
	type SortOrder,
} from "@/utils/sharedMovieUtils";

import { useState } from "react";

export const dynamic = "force-dynamic";

export default function FilmsPage() {
	const { movies, loading, user, userId } = useMovieData();
	const [viewMode, setViewMode] = useViewMode();
	const [sortBy, setSortBy] = useState<SortKey>("title");
	const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
	const [groupBy, setGroupBy] = useState<GroupKey>("release_year");

	if (!user) {
		return (
			<div className="flex flex-col items-center justify-center h-48 text-gray-500">
				Please sign in to view your films.
			</div>
		);
	}

	import Loader from "@/components/ui/Loader";

	if (loading) {
		return <Loader message="Loading films..." />;
	}
	

	const grouped = groupMovies(movies, groupBy, sortBy, sortOrder);

	return (
		<div className="max-w-screen-xl px-6 py-10 mx-auto">
			<div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
				<div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-700">
					<div className="flex items-center gap-2">
						<label htmlFor="group-select">Group by</label>
						<select
							id="group-select"
							value={groupBy}
							onChange={(e) =>
								setGroupBy(e.target.value as GroupKey)
							}
							className="border border-gray-300 rounded-md px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
							className="border border-gray-300 rounded-md px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
							className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
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
				</div>

				<div className="flex items-center gap-2">
					<button
						onClick={() => setViewMode("list")}
						className={`p-2 rounded-full border ${
							viewMode === "list"
								? "bg-blue-100 text-blue-600 border-blue-300"
								: "text-gray-400"
						}`}
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
								? "bg-blue-100 text-blue-600 border-blue-300"
								: "text-gray-400"
						}`}
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

			{grouped.map(({ key, movies }) => (
				<div key={key} className="mb-10">
					{groupBy !== "none" && (
						<h2 className="mb-4 text-xl font-bold text-gray-800">
							{key}
						</h2>
					)}
					{viewMode === "grid" ? (
						<div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-5">
							{movies.map((movie) => (
								<MoviePosterCard
									key={movie.id}
									movie={movie}
									currentUserId={userId}
									onUpdate={() => {}}
								/>
							))}
						</div>
					) : (
						<div className="flex flex-col divide-y">
							{movies.map((movie) => (
								<MovieRowCard
									key={movie.id}
									movie={movie}
									currentUserId={userId}
									onUpdate={() => {}}
								/>
							))}
						</div>
					)}
				</div>
			))}
		</div>
	);
}

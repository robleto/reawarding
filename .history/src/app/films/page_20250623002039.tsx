"use client";

import { useEffect, useState } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import type { Database } from "@/types/supabase";
import MoviePosterCard from "@/components/movie/MoviePosterCard";
import MovieRowCard from "@/components/movie/MovieRowCard";
import type { Movie } from "@/types/types";

export const dynamic = "force-dynamic";

type SortKey = "title" | "release_year" | "ranking";
type GroupKey = "release_year" | "ranking" | "none";

const SORT_OPTIONS = [
	{ value: "title", label: "Title" },
	{ value: "release_year", label: "Release Year" },
	{ value: "ranking", label: "My Ranking" },
];

const GROUP_OPTIONS = [
	{ value: "release_year", label: "Year" },
	{ value: "ranking", label: "Ranking" },
	{ value: "none", label: "None" },
];

function sortMovies(
	movies: Movie[],
	sortBy: SortKey,
	sortOrder: "asc" | "desc"
) {
	return [...movies].sort((a, b) => {
		const aRank = a.rankings[0]?.ranking ?? 0;
		const bRank = b.rankings[0]?.ranking ?? 0;

		const aYear = a.release_year ?? 0;
		const bYear = b.release_year ?? 0;

		if (aRank !== bRank) {
			return sortOrder === "asc" ? aRank - bRank : bRank - aRank;
		}

		// Secondary sort: release year ascending
		return aYear - bYear;
	});
}

function groupMovies(
	movies: Movie[],
	groupBy: GroupKey,
	sortBy: SortKey,
	sortOrder: "asc" | "desc"
) {
	if (groupBy === "release_year") {
		const groups: Record<string, Movie[]> = {};
		movies.forEach((movie) => {
			const year = movie.release_year?.toString() ?? "Unknown";
			if (!groups[year]) groups[year] = [];
			groups[year].push(movie);
		});
		return Object.entries(groups)
			.sort(([a], [b]) => Number(b) - Number(a))
			.map(([year, group]) => ({
				key: year,
				movies: sortMovies(group, sortBy, sortOrder),
			}));
	}

	if (groupBy === "ranking") {
		const groups: Record<string, Movie[]> = {};
		movies.forEach((movie) => {
			const ranking =
				movie.rankings[0]?.ranking?.toString() ?? "Unranked";
			if (!groups[ranking]) groups[ranking] = [];
			groups[ranking].push(movie);
		});
		return Object.entries(groups)
			.sort(([a], [b]) => {
				if (a === "Unranked") return 1;
				if (b === "Unranked") return -1;
				return Number(b) - Number(a);
			})
			.map(([rank, group]) => ({
				key: rank,
				movies: sortMovies(group, sortBy, sortOrder),
			}));
	}

	return [
		{ key: "All Movies", movies: sortMovies(movies, sortBy, sortOrder) },
	];
}

export default function RankingsPage() {
	const [movies, setMovies] = useState<Movie[]>([]);
	const [loading, setLoading] = useState(true);
	const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
		if (typeof window !== "undefined") {
			return (
				(localStorage.getItem("viewMode") as "grid" | "list") || "grid"
			);
		}
		return "grid";
	});
	const [sortBy, setSortBy] = useState<SortKey>("ranking");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [groupBy, setGroupBy] = useState<GroupKey>("none");

	const supabase = useSupabaseClient<Database>();
	const user = useUser();
	const currentUserId = user?.id ?? "";

	useEffect(() => {
		if (!user) return;

		async function fetchData() {
			setLoading(true);

			const { data, error } = await supabase
				.from("movies")
				.select(
					`
          id,
          title,
          release_year,
          poster_url,
          thumb_url,
          rankings!left (
            id,
            seen_it,
            ranking,
            user_id
          )
        `
				)
				.eq("rankings.user_id", currentUserId)
				.range(0, 2999);

			if (error) {
				console.error("Fetch error:", error.message);
				setMovies([]);
			} else {
				const enriched: Movie[] = data.map((movie) => {
					const match = movie.rankings.find(
						(r) => r.user_id === currentUserId
					);
					const safeRanking = match
						? [{ ...match, id: match.id ?? crypto.randomUUID() }]
						: [
								{
									id: crypto.randomUUID(),
									user_id: currentUserId,
									seen_it: false,
									ranking: 0,
								},
						  ];
					return {
						...movie,
						rankings: safeRanking,
						thumb_url: movie.thumb_url ?? "",
					} as Movie;
				});

				setMovies(enriched);
			}

			setLoading(false);
		}

		fetchData();
	}, [user, supabase, currentUserId]);

	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("viewMode", viewMode);
		}
	}, [viewMode]);

	async function handleUpdate(
		movieId: number,
		updates: { seen_it?: boolean; ranking?: number }
	) {
		const movie = movies.find((m) => m.id === movieId);
		const existing = movie?.rankings?.[0];

		const payload = {
			...(existing?.id ? { id: existing.id } : {}),
			user_id: currentUserId,
			movie_id: movieId,
			seen_it: updates.seen_it ?? existing?.seen_it ?? false,
			ranking: updates.ranking ?? existing?.ranking ?? 0,
		};

		const { error } = await supabase
			.from("rankings")
			.upsert(payload, { onConflict: "user_id,movie_id" });

		if (error) {
			console.error("Update error:", error.message);
		} else {
			const updatedMovies = movies.map((m) =>
				m.id === movieId ? { ...m, rankings: [payload] } : m
			);
			setMovies(updatedMovies);
		}
	}

	if (!user) {
		return (
			<div className="flex flex-col items-center justify-center h-48 text-gray-500">
				Please sign in to view your rankings.
			</div>
		);
	}

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center h-48 gap-2">
				<svg
					className="animate-spin h-8 w-8 text-[#ba7a00]"
					viewBox="0 0 24 24"
					fill="none"
				>
					<circle
						className="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						strokeWidth="4"
					/>
					<path
						className="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8v8H4z"
					/>
				</svg>
				<p className="text-sm text-gray-500">Loading movies...</p>
			</div>
		);
	}

	const grouped = groupMovies(movies, groupBy, sortBy, sortOrder);

	return (
		<div className="max-w-screen-xl px-6 py-10 mx-auto">
			<div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
				<div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-700">
					<div className="flex items-center gap-2">
						<label
							htmlFor="group-select"
							className="whitespace-nowrap"
						>
							Group by
						</label>
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
						<label
							htmlFor="sort-select"
							className="whitespace-nowrap"
						>
							Sort by
						</label>
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
									currentUserId={currentUserId}
									onUpdate={handleUpdate}
								/>
							))}
						</div>
					) : (
						<div className="flex flex-col divide-y">
							{movies.map((movie) => (
								<MovieRowCard
									key={movie.id}
									movie={movie}
									currentUserId={currentUserId}
									onUpdate={handleUpdate}
								/>
							))}
						</div>
					)}
				</div>
			))}
		</div>
	);
}

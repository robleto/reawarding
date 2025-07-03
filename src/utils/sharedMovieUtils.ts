// Shared movie page utilities for Rankings and Films

import { useState, useEffect } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import type { Database } from "@/types/supabase";
import type { Movie } from "@/types/types";

export type SortKey = "title" | "release_year" | "ranking";
export type GroupKey = "release_year" | "ranking" | "none";
export type SortOrder = "asc" | "desc";

export const SORT_OPTIONS = [
	{ value: "title", label: "Title" },
	{ value: "release_year", label: "Release Year" },
	{ value: "ranking", label: "My Ranking" },
];

export const GROUP_OPTIONS = [
	{ value: "release_year", label: "Year" },
	{ value: "ranking", label: "Ranking" },
	{ value: "none", label: "None" },
];

export function sortMovies(
	movies: Movie[],
	sortBy: SortKey,
	sortOrder: "asc" | "desc"
): Movie[] {
	return [...movies].sort((a, b) => {
		const getValue = (movie: Movie) => {
			if (sortBy === "ranking") return movie.rankings[0]?.ranking ?? 0;
			if (sortBy === "release_year") return movie.release_year ?? 0;
			if (sortBy === "title") return movie.title?.toLowerCase() ?? "";
			return 0;
		};
		const aValue = getValue(a);
		const bValue = getValue(b);
		if (sortOrder === "asc") return aValue > bValue ? 1 : -1;
		return aValue < bValue ? 1 : -1;
	});
}

export function groupMovies(
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
			.map(([key, group]) => ({
				key,
				movies: sortMovies(group, sortBy, sortOrder),
			}));
	}

	if (groupBy === "ranking") {
		const groups: Record<string, Movie[]> = {};
		movies.forEach((movie) => {
			const rank = movie.rankings[0]?.ranking?.toString() ?? "Unranked";
			if (!groups[rank]) groups[rank] = [];
			groups[rank].push(movie);
		});
		return Object.entries(groups)
			.sort(([a], [b]) => {
				if (a === "Unranked") return 1;
				if (b === "Unranked") return -1;
				return Number(b) - Number(a);
			})
			.map(([key, group]) => ({
				key,
				movies: sortMovies(group, sortBy, sortOrder),
			}));
	}

	return [
		{
			key: "All Movies",
			movies: sortMovies(movies, sortBy, sortOrder),
		},
	];
}

export function filterUnseenMovies(movies: Movie[]) {
	return movies.filter((movie) => !movie.rankings[0]?.seen_it);
}

export function sortByCreatedAt(movies: Movie[]) {
	return [...movies].sort((a, b) => {
		const aDate = new Date(a.created_at ?? 0).getTime();
		const bDate = new Date(b.created_at ?? 0).getTime();
		return bDate - aDate; // Newest first
	});
}
export function sortByRecent(movies: Movie[]) {
	return [...movies].sort((a, b) => {
		const aYear = a.release_year ?? 0;
		const bYear = b.release_year ?? 0;
		return bYear - aYear;
	});
}

export function useMovieData() {
	const [movies, setMovies] = useState<Movie[]>([]);
	const [loading, setLoading] = useState(true);
	const supabase = useSupabaseClient<Database>();
	const user = useUser();
	const userId = user?.id;

	useEffect(() => {
		// Don't proceed if user is not authenticated or userId is not available
		if (!user || !userId) {
			setLoading(false);
			setMovies([]);
			return;
		}
		
		async function fetchData() {
			setLoading(true);
			const { data, error } = await supabase
				.from("movies")
				.select(
					`*,
					rankings!left (
						id,
						seen_it,
						ranking,
						user_id
					)`
				)
				.eq("rankings.user_id", userId)
				.range(0, 2999);

			if (error) {
				console.error("Fetch error:", error.message);
				setMovies([]);
			} else {
				const enriched: Movie[] = data.map((movie) => {
					// Safely filter rankings to only include ones for the current user
					const userRankings = Array.isArray(movie.rankings) 
						? movie.rankings.filter((r: any) => r && r.user_id === userId)
						: [];
					
					return {
						...movie,
						rankings: userRankings,
						thumb_url: movie.thumb_url ?? "",
					} as Movie;
				});
				setMovies(enriched);
			}
			setLoading(false);
		}
		fetchData();
	}, [userId, supabase, user]);

	const updateMovieRanking = async (
		movieId: number,
		updates: { seen_it?: boolean; ranking?: number | null }
	) => {
		const movie = movies.find((m) => m.id === movieId);
		const existing = movie?.rankings?.[0];

		// Handle null ranking - if ranking is explicitly null, we want to delete the ranking
		if (updates.ranking === null) {
			// If there's an existing ranking record, delete it
			if (existing?.id) {
				const { error } = await supabase
					.from("rankings")
					.delete()
					.eq("id", existing.id);

				if (error) {
					console.error("Delete error:", error.message);
					return;
				}
			}

			// Update local state to remove the ranking
			setMovies((prevMovies) =>
				prevMovies.map((m) => {
					if (m.id === movieId) {
						return { ...m, rankings: [] };
					}
					return m;
				})
			);
			return;
		}

		const payload = {
			...(existing?.id ? { id: existing.id } : {}),
			user_id: userId,
			movie_id: movieId,
			seen_it: updates.seen_it ?? existing?.seen_it ?? false,
			ranking: updates.ranking ?? existing?.ranking ?? 0,
		};

		const { error } = await supabase
			.from("rankings")
			.upsert(payload, { onConflict: "user_id,movie_id" });

		if (error) {
			console.error("Update error:", error.message);
			return;
		}

		// Update local state immediately
		setMovies((prevMovies) =>
			prevMovies.map((m) => {
				if (m.id === movieId) {
					const updatedRankings = [...m.rankings];
					if (updatedRankings.length === 0) {
						// Create new ranking if none exists
						updatedRankings.push({
							id: crypto.randomUUID(),
							user_id: userId!,
							seen_it: updates.seen_it ?? false,
							ranking: updates.ranking ?? 0,
						});
					} else {
						// Update existing ranking
						updatedRankings[0] = {
							...updatedRankings[0],
							seen_it: updates.seen_it ?? updatedRankings[0].seen_it,
							ranking: updates.ranking ?? updatedRankings[0].ranking,
						};
					}
					return { ...m, rankings: updatedRankings };
				}
				return m;
			})
		);
	};

	return { movies, loading, user, userId: userId ?? "", updateMovieRanking };
}

export function useViewMode(defaultMode: "grid" | "list" = "grid") {
	const [viewMode, setViewMode] = useState<"grid" | "list">(defaultMode);

	useEffect(() => {
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("viewMode") as
				| "grid"
				| "list"
				| null;
			if (stored) {
				setViewMode(stored);
			}
		}
	}, []);

	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("viewMode", viewMode);
		}
	}, [viewMode]);

	return [viewMode, setViewMode] as const;
}

export function useMovieFilters(movies: Movie[]) {
	const [hasMounted, setHasMounted] = useState(false);
	const [sortBy, setSortBy] = useState<SortKey>(() => {
		return (typeof window !== "undefined" && (localStorage.getItem("sortBy") as SortKey)) || "ranking";
	});
	const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
		return (typeof window !== "undefined" && (localStorage.getItem("sortOrder") as SortOrder)) || "desc";
	});
	const [groupBy, setGroupBy] = useState<GroupKey>(() => {
		return (typeof window !== "undefined" && (localStorage.getItem("groupBy") as GroupKey)) || "none";
	});
	const [filterType, setFilterType] = useState<"none" | "year" | "rank">(() => {
		return (typeof window !== "undefined" && (localStorage.getItem("filterType") as any)) || "none";
	});
	const [filterValue, setFilterValue] = useState<string>(() => {
		return (typeof window !== "undefined" && localStorage.getItem("filterValue")) || "all";
	});

	useEffect(() => {
		setHasMounted(true);
	}, []);

	// Save filter state to localStorage
	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("sortBy", sortBy);
			localStorage.setItem("sortOrder", sortOrder);
			localStorage.setItem("groupBy", groupBy);
			localStorage.setItem("filterType", filterType);
			localStorage.setItem("filterValue", filterValue);
		}
	}, [sortBy, sortOrder, groupBy, filterType, filterValue]);

	// Filter movies based on current filter settings
	const filteredMovies = movies.filter((movie) => {
		if (filterType === "year") {
			return filterValue === "all" || movie.release_year === Number(filterValue);
		}
		if (filterType === "rank") {
			return filterValue === "all" || movie.rankings?.[0]?.ranking === Number(filterValue);
		}
		return true;
	});

	// Group and sort the filtered movies
	const groupedMovies = groupMovies(filteredMovies, groupBy, sortBy, sortOrder);

	// Generate unique years and ranks for filter dropdowns
	const uniqueYears = Array.from(new Set(movies.map((m) => m.release_year).filter(Boolean))).sort((a, b) => b - a);
	const uniqueRanks = Array.from(
		new Set(movies.map((m) => m.rankings?.[0]?.ranking).filter((r) => typeof r === "number"))
	).sort((a, b) => a - b);

	return {
		// State
		hasMounted,
		sortBy,
		sortOrder,
		groupBy,
		filterType,
		filterValue,
		
		// Setters
		setSortBy,
		setSortOrder,
		setGroupBy,
		setFilterType,
		setFilterValue,
		
		// Computed values
		filteredMovies,
		groupedMovies,
		uniqueYears,
		uniqueRanks,
	};
}

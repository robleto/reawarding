// Shared movie page utilities for Rankings and Films

import { useState, useEffect } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import type { Database } from "@/types/supabase";
import type { Movie } from "@/types/types";
import useGuestRankingStore from "@/hooks/useGuestRankingStore";

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

// New hook that supports both authenticated and guest users
export function useMovieDataWithGuest() {
	const [movies, setMovies] = useState<Movie[]>([]);
	const [loading, setLoading] = useState(true);
	const [hasMounted, setHasMounted] = useState(false);
	const supabase = useSupabaseClient<Database>();
	const user = useUser();
	const guestStore = useGuestRankingStore();
	const userId = user?.id;
	const isGuest = !user;

	useEffect(() => {
		setHasMounted(true);
	}, []);

	useEffect(() => {
		async function fetchData() {
			setLoading(true);
			
			if (isGuest) {
				// For guests, fetch movies without user-specific rankings
				const { data, error } = await supabase
					.from("movies")
					.select("*")
					.range(0, 2999);

				if (error) {
					console.error("Fetch error:", error.message);
					setMovies([]);
				} else {
					// Apply guest data from Zustand store
					const moviesWithGuestData = data.map(movie => {
						const guestRanking = guestStore.getRanking(movie.id);
						return {
							...movie,
							rankings: guestRanking ? [{
								id: `guest_${movie.id}`,
								user_id: 'guest',
								ranking: guestRanking.ranking,
								seen_it: guestRanking.seenIt,
							}] : [],
							thumb_url: movie.thumb_url ?? "",
						} as Movie;
					});
					
					setMovies(moviesWithGuestData);
				}
			} else if (userId) {
				// For authenticated users, fetch with their rankings
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
			}
			setLoading(false);
		}
		
		fetchData();
	}, [userId, supabase, user, isGuest]);

	const updateMovieRanking = async (
		movieId: number,
		updates: { seen_it?: boolean; ranking?: number | null }
	) => {
		if (isGuest) {
			// For guests, update Zustand store - need to map seen_it to seenIt
			const guestUpdates: { ranking?: number | null; seenIt?: boolean } = {};
			if (updates.ranking !== undefined) guestUpdates.ranking = updates.ranking;
			if (updates.seen_it !== undefined) guestUpdates.seenIt = updates.seen_it;
			
			guestStore.updateRanking(movieId, guestUpdates);
			
			// Update local state immediately for better UX
			setMovies((prevMovies) =>
				prevMovies.map((m) => {
					if (m.id === movieId) {
						const guestRanking = guestStore.getRanking(movieId);
						if (guestRanking) {
							return {
								...m,
								rankings: [{
									id: `guest_${movieId}`,
									user_id: 'guest',
									ranking: guestRanking.ranking,
									seen_it: guestRanking.seenIt,
								}],
							};
						}
					}
					return m;
				})
			);
			return;
		}

		// For authenticated users, use the existing logic
		const movie = movies.find((m) => m.id === movieId);
		const existing = movie?.rankings?.[0];

		if (updates.ranking === null) {
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
			user_id: userId!,
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

		setMovies((prevMovies) =>
			prevMovies.map((m) => {
				if (m.id === movieId) {
					const updatedRankings = [...m.rankings];
					if (updatedRankings.length === 0) {
						updatedRankings.push({
							id: crypto.randomUUID(),
							user_id: userId!,
							seen_it: updates.seen_it ?? false,
							ranking: updates.ranking ?? 0,
						});
					} else {
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

	return { 
		movies, 
		loading, 
		user, 
		userId: userId ?? "", 
		updateMovieRanking,
		isGuest,
		hasMounted
	};
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
	// Only persist filterType/filterValue if not 'movie'
	const getInitialFilterType = () => {
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("filterType") as any;
			return stored === "movie" ? "none" : stored || "none";
		}
		return "none";
	};
	const getInitialFilterValue = () => {
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("filterValue");
			return localStorage.getItem("filterType") === "movie" ? "all" : stored || "all";
		}
		return "all";
	};
	const [sortBy, setSortBy] = useState<SortKey>(() => {
		return (typeof window !== "undefined" && (localStorage.getItem("sortBy") as SortKey)) || "ranking";
	});
	const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
		return (typeof window !== "undefined" && (localStorage.getItem("sortOrder") as SortOrder)) || "desc";
	});
	const [groupBy, setGroupBy] = useState<GroupKey>(() => {
		return (typeof window !== "undefined" && (localStorage.getItem("groupBy") as GroupKey)) || "none";
	});
	const [filterType, setFilterType] = useState<"none" | "year" | "rank" | "movie">(
		getInitialFilterType
	);
	const [filterValue, setFilterValue] = useState<string>(getInitialFilterValue);

	useEffect(() => {
		setHasMounted(true);
	}, []);

	// Save filter state to localStorage, but do NOT persist movie search filter
	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("sortBy", sortBy);
			localStorage.setItem("sortOrder", sortOrder);
			localStorage.setItem("groupBy", groupBy);
			if (filterType !== "movie") {
				localStorage.setItem("filterType", filterType);
				localStorage.setItem("filterValue", filterValue);
			}
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
		if (filterType === "movie") {
			return String(movie.id) === filterValue;
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

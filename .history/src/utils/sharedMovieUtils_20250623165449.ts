// Shared movie page utilities for Rankings and Films

import { useState, useEffect } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import type { Database } from "@/types/supabase";
import type { Movie } from "@/types/types";

export type SortKey = "title" | "release_year" | "ranking";
export type GroupKey = "release_year" | "ranking" | "none";export type SortOrder = "asc" | "desc";

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

export function useMovieData() {
	const [movies, setMovies] = useState<Movie[]>([]);
	const [loading, setLoading] = useState(true);
	const supabase = useSupabaseClient<Database>();
	const user = useUser();
	const userId = user?.id ?? "";

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
				.eq("rankings.user_id", userId)
				.range(0, 2999);

			if (error) {
				console.error("Fetch error:", error.message);
				setMovies([]);
			} else {
				const enriched: Movie[] = data.map((movie) => {
					const match = movie.rankings.find(
						(r) => r.user_id === userId
					);
					const safeRanking = match
						? [{ ...match, id: match.id ?? crypto.randomUUID() }]
						: [
								{
									id: crypto.randomUUID(),
									user_id: userId,
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
	}, [userId, supabase, user]);

	return { movies, loading, user, userId };
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

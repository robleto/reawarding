"use client";

import { use, useEffect, useState } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import type { Database } from "@/types/supabase";
import type { Movie } from "@/types/types";

export type SortKey = "title" | "release_year" | "ranking";
export type GroupKey = "release_year" | "ranking" | "none";

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
) {
	return [...movies].sort((a, b) => {
		const aRank = a.rankings[0]?.ranking ?? 0;
		const bRank = b.rankings[0]?.ranking ?? 0;

		const aYear = a.release_year ?? 0;
		const bYear = b.release_year ?? 0;

		if (aRank !== bRank) {
			return sortOrder === "asc" ? aRank - bRank : bRank - aRank;
		}

		return aYear - bYear;
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

export function useMovieData(currentUserId: string) {
	const supabase = useSupabaseClient<Database>();
	const user = useUser();
	const [movies, setMovies] = useState<Movie[]>([]);
	const [loading, setLoading] = useState(true);

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

	return { movies, loading };
}

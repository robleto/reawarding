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
			const yearKey = movie.release_year?.toString() ?? "Unknown";
			if (!groups[yearKey]) groups[yearKey] = [];
			groups[yearKey].push(movie);
		});
		return Object.entries(groups)
			.sort(([a], [b]) => {
				if (a === "Unknown") return 1;
				if (b === "Unknown") return -1;
				return Number(b) - Number(a);
			})
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

/**
 * Smart sorting for "For Your Consideration" - balances three priorities:
 * 1. OSCAR CONTENDERS: 2024-2025 releases with critical acclaim (70+ scores)
 * 2. FRESH + OSCAR-WORTHY: Recently added (last 7 days) AND Oscar-eligible years
 * 3. CULTURAL RELEVANCE: Popular/blockbuster films (1000+ votes or 100+ popularity)
 * 
 * Key insight: Prioritize Oscar-eligible YEARS first, then use recency/popularity as tiebreakers
 * This prevents obscure recent imports from dominating over 2024 Oscar contenders
 */
export function sortForYourConsideration(movies: Movie[]) {
	const now = new Date();
	const currentYear = now.getFullYear(); // 2025
	const awardYear = currentYear - 1; // 2024 for 2025 Oscars
	const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	
	// Seeded random number generator for daily shuffle (changes once per day)
	const today = new Date().toDateString(); // e.g., "Wed Nov 13 2025"
	const seed = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
	
	const seededRandom = (index: number) => {
		const x = Math.sin(seed + index) * 10000;
		return x - Math.floor(x);
	};
	
	// Helper: Calculate quality score with fallbacks
	const getQualityScore = (movie: Movie): number => {
		// If we have both professional scores, use them
		if (movie.imdb_rating && movie.metacritic_score) {
			return (movie.imdb_rating * 10 + movie.metacritic_score) / 2;
		}
		// If we have IMDb, weight it higher
		if (movie.imdb_rating) {
			return movie.imdb_rating * 10;
		}
		// If we have Metacritic only
		if (movie.metacritic_score) {
			return movie.metacritic_score;
		}
		// Fallback to TMDB vote_average (scale 0-10, convert to 0-100)
		if ((movie as any).vote_average) {
			return (movie as any).vote_average * 10;
		}
		// No ratings at all - return neutral score
		return 50;
	};
	
	// Helper: Check if film is "acclaimed" (Oscar-worthy quality)
	const isAcclaimed = (movie: Movie): boolean => {
		const score = getQualityScore(movie);
		return score >= 70; // 7.0 IMDb or 70 Metacritic equivalent
	};
	
	// Helper: Check if film has professional critical ratings (not just TMDB)
	const hasCriticalRatings = (movie: Movie): boolean => {
		return !!(movie.imdb_rating || movie.metacritic_score);
	};
	
	// Helper: Check if film is "popular" (buzzworthy blockbuster)
	const isPopular = (movie: Movie): boolean => {
		// Use stored TMDB data from database
		const voteCount = (movie as any).vote_count ?? 0;
		const popularity = (movie as any).popularity ?? 0;
		// Thresholds: 1000+ votes = widely seen, 100+ popularity = TMDB trending
		return voteCount >= 1000 || popularity >= 100;
	};
	
	return [...movies].sort((a, b) => {
		const aYear = a.release_year ?? 0;
		const bYear = b.release_year ?? 0;
		const aCreated = a.created_at ? new Date(a.created_at) : new Date(0);
		const bCreated = b.created_at ? new Date(b.created_at) : new Date(0);
		
		// 1. OSCAR-ELIGIBLE YEARS FIRST (2024-2025) - this is the primary filter
		const aIsEligible = aYear === awardYear || aYear === currentYear;
		const bIsEligible = bYear === awardYear || bYear === currentYear;
		
		if (aIsEligible !== bIsEligible) {
			return aIsEligible ? -1 : 1;
		}
		
		// 2. Within eligible years, prioritize films with critical ratings (IMDb/Metacritic)
		// This ensures Oscar contenders rise above unreleased/unrated films
		if (aIsEligible && bIsEligible) {
			const aHasCritical = hasCriticalRatings(a);
			const bHasCritical = hasCriticalRatings(b);
			
			if (aHasCritical !== bHasCritical) {
				return aHasCritical ? -1 : 1;
			}
			
			// 3. Among films with critical ratings, prioritize acclaimed
			if (aHasCritical && bHasCritical) {
				const aAcclaimed = isAcclaimed(a);
				const bAcclaimed = isAcclaimed(b);
				
				if (aAcclaimed !== bAcclaimed) {
					return aAcclaimed ? -1 : 1;
				}
			}
			
			// 4. Sort by exact quality score
			const aScore = getQualityScore(a);
			const bScore = getQualityScore(b);
			
			if (Math.abs(aScore - bScore) > 5) {
				return bScore - aScore;
			}
			
			// 5. Among similarly-rated films, show fresh additions first (last 7 days)
			const aIsFresh = aCreated >= sevenDaysAgo;
			const bIsFresh = bCreated >= sevenDaysAgo;
			
			if (aIsFresh !== bIsFresh) {
				return aIsFresh ? -1 : 1;
			}
			
			// 6. Tiebreaker: prefer 2024 over 2025 (2025 Oscars more imminent)
			if (aYear !== bYear) {
				return bYear - aYear;
			}
			
			// 7. Final tiebreaker: most recently added
			return bCreated.getTime() - aCreated.getTime();
		}
		
		// 7. For non-eligible years, show popular/buzzworthy films (cultural relevance)
		const aPopular = isPopular(a);
		const bPopular = isPopular(b);
		
		if (aPopular !== bPopular) {
			return aPopular ? -1 : 1;
		}
		
		// 8. Among popular films, prioritize acclaimed ones
		if (aPopular && bPopular) {
			const aAcclaimed = isAcclaimed(a);
			const bAcclaimed = isAcclaimed(b);
			
			if (aAcclaimed !== bAcclaimed) {
				return aAcclaimed ? -1 : 1;
			}
		}
		
		// 9. Sort by quality score
		const aScore = getQualityScore(a);
		const bScore = getQualityScore(b);
		
		if (Math.abs(aScore - bScore) > 5) {
			return bScore - aScore;
		}
		
		// 10. Prefer recent years (shows site is current)
		if (Math.abs(aYear - bYear) > 2) {
			return bYear - aYear;
		}
		
		// 11. Final tiebreaker: database addition date (newer first)
		return bCreated.getTime() - aCreated.getTime();
	})
	// Add daily shuffle within quality tiers to keep it fresh
	.map((movie, index) => ({ movie, randomValue: seededRandom(index) }))
	.sort((a, b) => {
		// Preserve top-tier ordering but shuffle within similar-quality movies
		// Group movies by their primary characteristics
		const aYear = a.movie.release_year ?? 0;
		const bYear = b.movie.release_year ?? 0;
		const aIsEligible = aYear === awardYear || aYear === currentYear;
		const bIsEligible = bYear === awardYear || bYear === currentYear;
		const aScore = getQualityScore(a.movie);
		const bScore = getQualityScore(b.movie);
		
		// Keep eligible vs non-eligible separation
		if (aIsEligible !== bIsEligible) {
			return aIsEligible ? -1 : 1;
		}
		
		// Within each tier (10-point buckets), randomize
		const aTier = Math.floor(aScore / 10);
		const bTier = Math.floor(bScore / 10);
		
		if (aTier !== bTier) {
			return bTier - aTier;
		}
		
		// Same tier = randomize
		return a.randomValue - b.randomValue;
	})
	.map(item => item.movie);
}

// New hook that supports both authenticated and guest users
export function useMovieDataWithGuest() {
	const [movies, setMovies] = useState<Movie[]>([]);
	const [loading, setLoading] = useState(true);
	const [hasMounted, setHasMounted] = useState(false);
	const supabase = useSupabaseClient<Database>();
	const user = useUser();
	const guestStore = useGuestRankingStore();
	// Determine auth state
	// Always provide a string for userId; guests will have an empty string
	const userId: string = user?.id ?? "";
	const isGuest = !user;

	useEffect(() => {
		setHasMounted(true);
	}, []);

	const MOVIE_LIST_FIELDS = `
		id,
		title,
		release_year,
		poster_url,
		thumb_url,
		cached_poster_url,
		cached_thumb_url,
		created_at,
		overview,
		tmdb_id,
		imdb_rating,
		metacritic_score,
		imdb_votes,
		vote_count,
		popularity,
		runtime,
		director,
		cast_list,
		mpaa_rating,
		genres
	`;

	useEffect(() => {
		async function fetchData() {
			setLoading(true);
			
			try {
				if (isGuest) {
					// For guests, fetch movies without user-specific rankings
					const { data, error } = await supabase
						.from("movies")
						.select(MOVIE_LIST_FIELDS)
						.range(0, 2999);

					if (error) {
						console.warn("Guest movie fetch failed, keeping previous list:", error);
						setMovies((prev) => prev);
					} else {
						// Apply guest data from Zustand store
						const moviesWithGuestData = data.map(movie => {
							const guestRanking = movie.tmdb_id != null ? guestStore.getRanking(movie.tmdb_id) : null;
							return {
								...movie,
								rankings: guestRanking ? [{
									id: `guest_${movie.tmdb_id ?? movie.id}`,
									user_id: 'guest',
									ranking: guestRanking.ranking,
									seen_it: guestRanking.seenIt,
								}] : [],
								thumb_url: movie.thumb_url ?? "",
							} as unknown as Movie;
						});
						
						setMovies(moviesWithGuestData);
					}
				} else if (userId) {
					// For authenticated users, fetch movies and their rankings separately for performance
					// RLS policies automatically filter rankings to current user
					const [moviesResult, rankingsResult] = await Promise.all([
						supabase
							.from("movies")
							.select(MOVIE_LIST_FIELDS)
							.range(0, 2999),
						supabase
							.from("rankings")
							.select("*")
							.limit(10000)
							.then(result => {
								// Silently handle rankings errors - user might not have SELECT permission yet
								if (result.error) {
									console.warn("Rankings not accessible (this is OK):", result.error.message);
									return { data: [], error: null };
								}
								return result;
							})
					]);

					if (moviesResult.error) {
						console.warn("Authenticated movie fetch failed, keeping previous list:", moviesResult.error);
						setMovies((prev) => prev);
					} else {
						// Create a map of movie_id -> ranking for fast lookup
						const rankingsMap = new Map();
						if (rankingsResult.data) {
							rankingsResult.data.forEach((r: any) => {
								rankingsMap.set(r.movie_id, r);
							});
						}
						
						const enriched: Movie[] = moviesResult.data.map((movie) => {
							const ranking = rankingsMap.get(movie.id);
							return {
								...movie,
								rankings: ranking ? [ranking] : [],
								thumb_url: movie.thumb_url ?? "",
							} as unknown as Movie;
						});
						setMovies(enriched);
					}
				}
			} catch (err) {
				console.warn("Movie data fetch exception, keeping previous list:", err);
				setMovies((prev) => prev);
			}
			
			setLoading(false);
		}
		
		fetchData();
	}, [userId, supabase, user, isGuest]);

	const updateMovieRanking = async (
		movieId: number | string,
		updates: { seen_it?: boolean; ranking?: number | null }
	) => {
		if (isGuest) {
			if (typeof movieId !== "number") return;
			// For guests, update Zustand store - need to map seen_it to seenIt
			const guestUpdates: { ranking?: number | null; seenIt?: boolean } = {};
			if (updates.ranking !== undefined) guestUpdates.ranking = updates.ranking;
			if (updates.seen_it !== undefined) guestUpdates.seenIt = updates.seen_it;
			
			guestStore.updateRanking(movieId, guestUpdates);
			
			// Update local state immediately for better UX
			setMovies((prevMovies) =>
				prevMovies.map((m) => {
					if (String(m.id) === String(movieId)) {
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
		const movieIdStr = String(movieId);
		const movie = movies.find((m) => String(m.id) === movieIdStr);
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
					if (String(m.id) === movieIdStr) {
						return { ...m, rankings: [] };
					}
					return m;
				})
			);

			// Activity (best-effort)
			try {
				const movieIdMaybe = movieId as unknown;
				const movieIdForActivity =
					typeof movieIdMaybe === "string" &&
					/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
						movieIdMaybe
					)
						? movieIdMaybe
						: null;

				await supabase.from("activity_events").insert({
						actor_id: userId,
						event_type: "ranking_cleared",
						movie_id: movieIdForActivity,
						metadata: { previous_ranking: existing?.ranking ?? null },
					});
			} catch {
				// ignore
			}
			return;
		}

		const payload = {
			...(existing?.id ? { id: existing.id } : {}),
			user_id: userId!,
			movie_id: movieIdStr,
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
				if (String(m.id) === movieIdStr) {
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

		// Activity (best-effort)
		try {
			const movieIdMaybe = movieId as unknown;
			const movieIdForActivity =
				typeof movieIdMaybe === "string" &&
				/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
					movieIdMaybe
				)
					? movieIdMaybe
					: null;

			await supabase.from("activity_events").insert({
					actor_id: userId,
					event_type: "ranking_set",
					movie_id: movieIdForActivity,
					metadata: {
						ranking: payload.ranking,
						seen_it: payload.seen_it,
					},
				});
		} catch {
			// ignore
		}
	};

	return { 
		movies, 
		loading, 
		user,
		userId, 
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

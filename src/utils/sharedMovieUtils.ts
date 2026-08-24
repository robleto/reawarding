// Shared movie page utilities for Rankings and Films

import { useState, useEffect, useRef } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { Movie } from "@/types/types";
import useGuestRankingStore from "@/hooks/useGuestRankingStore";
import { useAuthState } from "@/hooks/useAuthState";
import { generateUUID } from "@/utils/uuid";

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

const MOVIE_LIST_FIELDS = `
	id,
	title,
	release_year,
	poster_url,
	thumb_url,
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

const GUEST_CACHE_KEY = "guest";

/**
 * Shared movies+rankings cache — mirrors the fetch-once/share-the-promise
 * pattern in src/data/officialAwardWinners.ts, but keyed per identity (the
 * signed-in userId, or the single 'guest' key) instead of a single global
 * slot, since the data itself is per-user.
 *
 * useMovieDataWithGuest() is mounted independently by ~9 call sites (Home,
 * Films, Rankings, Nominees, Year, Onboarding, Collections, UnifiedBanner,
 * GuestSuggestions). Without this, every mount re-issues the full movies
 * (.range(0, 2999)) + rankings (up to 10,000 rows) + rescue-fetch fetch from
 * scratch, including a confirmed double-fetch on the Films page alone
 * (UnifiedBanner calls the same hook a second time on that one page load).
 *
 * `entry.movies`/`entry.error` are mutable so that local optimistic updates
 * from updateMovieRanking (see patchMovieCache below) are visible to any
 * *later* mount for the same key, without re-fetching — the entry object is
 * read again after the shared promise resolves, not the value the promise
 * captured at resolution time.
 *
 * Cache-correctness safety net: several write paths outside this file
 * (FilmActions, useCreateAward, onboarding, list/watchlist/import pages)
 * write rankings directly to Supabase without going through
 * updateMovieRanking/patchMovieCache, so they can't keep this cache in sync.
 * Rather than instrument every call site (a whack-a-mole exercise that's
 * easy to lose track of), each entry carries a `fetchedAt` timestamp and is
 * treated as expired after CACHE_STALE_MS — see loadMoviesForKey. That
 * bounds the damage of *any* missed invalidation (including sign-out/back-in
 * reusing a pre-sign-out entry, see the comment on loadMoviesForKey) to "up
 * to CACHE_STALE_MS of staleness" instead of "wrong for the rest of the
 * session." The one exception is FilmActions (the highest-traffic bypass,
 * reachable from every page via the header search), which gets an explicit
 * invalidateMovieCache() call for immediate correctness on top of the TTL.
 */
const CACHE_STALE_MS = 45_000;

interface PendingPatch {
	movieId: string;
	patch: (movie: Movie) => Movie;
}

interface MovieCacheEntry {
	promise: Promise<void>;
	movies: Movie[];
	error: string | null;
	/** Set once the initial fetch resolves; null while still in flight. Used both for TTL staleness checks and to know whether a patch needs to be queued (see pendingPatches) rather than applied directly. */
	fetchedAt: number | null;
	/** Patches applied via patchMovieCache while the initial fetch was still in flight — entry.movies is `[]` at that point, so the patch would otherwise be silently discarded when the fetch resolves and overwrites entry.movies. Replayed onto the freshly-fetched movies in loadMoviesForKey, then cleared. */
	pendingPatches: PendingPatch[];
}

const movieCache = new Map<string, MovieCacheEntry>();

export function getMovieCacheKey(isGuest: boolean, userId: string): string | null {
	if (isGuest) return GUEST_CACHE_KEY;
	return userId || null;
}

/** Drops a cache entry outright so the next mount for this key does a fresh fetch. Exported for write paths outside this file (e.g. FilmActions) that can't call patchMovieCache directly but still want immediate correctness rather than waiting out CACHE_STALE_MS. */
export function invalidateMovieCache(cacheKey: string | null | undefined) {
	if (!cacheKey) return;
	movieCache.delete(cacheKey);
}

/** Applies the same local-state patch used by updateMovieRanking to the shared cache entry, if one exists, so a fresh mount for the same key sees the change instead of stale pre-mutation data. */
function patchMovieCache(cacheKey: string, movieId: string, patch: (movie: Movie) => Movie) {
	const entry = movieCache.get(cacheKey);
	if (!entry) return;
	if (entry.fetchedAt === null) {
		// Initial fetch still in flight: entry.movies is `[]` right now and is
		// about to be overwritten wholesale when the fetch resolves, so a patch
		// applied against it here would just be lost. Queue it for replay
		// instead (see loadMoviesForKey).
		entry.pendingPatches.push({ movieId, patch });
		return;
	}
	entry.movies = entry.movies.map((m) => (m.id === movieId ? patch(m) : m));
}

async function fetchMoviesForKey(
	supabase: SupabaseClient<Database>,
	isGuest: boolean,
	userId: string
): Promise<{ movies: Movie[]; error: string | null }> {
	if (isGuest) {
		// For guests, fetch movies without user-specific rankings
		const { data, error } = await supabase
			.from("movies")
			.select(MOVIE_LIST_FIELDS)
			.range(0, 2999);

		if (error) {
			console.warn("Guest movie fetch failed:", error);
			return { movies: [], error: error.message };
		}

		// Apply guest data from the Zustand store directly (getState, not the
		// hook) so this loader has no dependency on any particular hook instance.
		const guestState = useGuestRankingStore.getState();
		const moviesWithGuestData = data.map((movie) => {
			const guestRanking = guestState.getRanking(movie.id);
			return {
				...movie,
				rankings: guestRanking
					? [
							{
								id: `guest_${movie.id}`,
								user_id: "guest",
								ranking: guestRanking.ranking,
								seen_it: guestRanking.seenIt,
							},
					  ]
					: [],
				thumb_url: movie.thumb_url ?? "",
			} as Movie;
		});

		// Rescue-fetch guest-rated films that fall outside the 3000-row window
		// above, mirroring what the authenticated path already does for its own
		// rankings further down.
		//
		// Without this, a guest could rate a film and watch nothing happen: the
		// rating lands in the Zustand store (so the tab bar and rated counts
		// react) but the film itself never enters `movies`, so it's absent from
		// formattedYears, the ledger, and the archive. The data isn't lost —
		// signing up migrates it and the authenticated path's rescue picks it up
		// — but for a logged-out visitor the whole Watch → Rate → ReAward loop
		// silently no-ops.
		//
		// The window is 3000 of 4415 rows and `.range()` carries no `.order()`,
		// so *which* films are missing is arbitrary and not stable between
		// requests. That makes this a coin flip per rating, not an edge case.
		const presentIds = new Set(data.map((m) => m.id));
		const missingRatedIds = Object.keys(guestState.rankings).filter(
			(id) => !presentIds.has(id)
		);
		if (missingRatedIds.length > 0) {
			const RESCUE_CHUNK_SIZE = 50;
			for (let i = 0; i < missingRatedIds.length; i += RESCUE_CHUNK_SIZE) {
				const chunk = missingRatedIds.slice(i, i + RESCUE_CHUNK_SIZE);
				const { data: extraMovies, error: rescueError } = await supabase
					.from("movies")
					.select(MOVIE_LIST_FIELDS)
					.in("id", chunk);
				if (rescueError) {
					console.warn("Guest rescue fetch failed:", rescueError.message, chunk);
					continue;
				}
				for (const movie of extraMovies ?? []) {
					const guestRanking = guestState.getRanking(movie.id);
					moviesWithGuestData.push({
						...movie,
						rankings: guestRanking
							? [
									{
										id: `guest_${movie.id}`,
										user_id: "guest",
										ranking: guestRanking.ranking,
										seen_it: guestRanking.seenIt,
									},
							  ]
							: [],
						thumb_url: movie.thumb_url ?? "",
					} as Movie);
				}
			}
		}

		return { movies: moviesWithGuestData, error: null };
	}

	// For authenticated users, fetch movies and their rankings separately for performance
	// RLS policies automatically filter rankings to current user
	const [moviesResult, rankingsResult] = await Promise.all([
		supabase.from("movies").select(MOVIE_LIST_FIELDS).range(0, 2999),
		supabase
			.from("rankings")
			.select("*")
			.eq("user_id", userId)
			.limit(10000)
			.then((result) => {
				// Silently handle rankings errors - user might not have SELECT permission yet
				if (result.error) {
					console.warn("Rankings not accessible (this is OK):", result.error.message);
					return { data: [], error: null };
				}
				return result;
			}),
	]);

	if (moviesResult.error) {
		console.warn("Authenticated movie fetch failed:", moviesResult.error);
		return { movies: [], error: moviesResult.error.message };
	}

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
		} as Movie;
	});

	// ── Rescue ranked movies outside the page-0 range ──────────────────
	// Movies ranked by the user that fall outside range(0,2999) won't be
	// in moviesResult. Fetch them separately so smart-list hooks see every
	// film the user has actually interacted with.
	if (rankingsResult.data && rankingsResult.data.length > 0) {
		const enrichedIds = new Set(enriched.map((m) => m.id));
		const missingIds = rankingsResult.data
			.map((r: any) => r.movie_id as string)
			.filter((id: string) => !enrichedIds.has(id));
		if (missingIds.length > 0) {
			// Chunk to keep the `.in()` filter's query string well under any
			// gateway URL-length limit — a single request for hundreds of
			// UUIDs can silently fail with no error surfaced otherwise.
			const RESCUE_CHUNK_SIZE = 50;
			for (let i = 0; i < missingIds.length; i += RESCUE_CHUNK_SIZE) {
				const chunk = missingIds.slice(i, i + RESCUE_CHUNK_SIZE);
				const { data: extraMovies, error: rescueError } = await supabase
					.from("movies")
					.select(MOVIE_LIST_FIELDS)
					.in("id", chunk);
				if (rescueError) {
					console.warn("Rescue fetch for ranked movies failed:", rescueError.message, chunk);
					continue;
				}
				if (extraMovies) {
					for (const movie of extraMovies) {
						const ranking = rankingsMap.get(movie.id);
						enriched.push({
							...movie,
							rankings: ranking ? [ranking] : [],
							thumb_url: movie.thumb_url ?? "",
						} as Movie);
					}
				}
			}
		}
	}

	return { movies: enriched, error: null };
}

/**
 * First call for a given cache key triggers the real fetch(es) and caches
 * the in-flight promise; subsequent calls for the same key reuse it instead
 * of issuing new movies/rankings queries — unless the existing entry has
 * already resolved and is older than CACHE_STALE_MS, in which case it's
 * discarded and treated exactly like a cache miss (fresh fetch, normal
 * loading state). This is also what makes sign-out-then-back-in-as-the-
 * same-user self-correct: the per-userId entry isn't deleted on sign-out,
 * but by the time a real session gap has passed, fetchedAt is stale and
 * this same check throws it away — no separate sign-out special case needed.
 * An entry still in flight (fetchedAt === null) is never treated as stale,
 * so we don't race a second fetch against the first.
 */
function loadMoviesForKey(
	supabase: SupabaseClient<Database>,
	cacheKey: string,
	isGuest: boolean,
	userId: string
): MovieCacheEntry {
	const existing = movieCache.get(cacheKey);
	if (existing) {
		const isStale =
			existing.fetchedAt !== null && Date.now() - existing.fetchedAt > CACHE_STALE_MS;
		if (!isStale) return existing;
		movieCache.delete(cacheKey);
	}

	const entry: MovieCacheEntry = {
		movies: [],
		error: null,
		promise: null as unknown as Promise<void>,
		fetchedAt: null,
		pendingPatches: [],
	};

	entry.promise = fetchMoviesForKey(supabase, isGuest, userId)
		.then(({ movies, error }) => {
			let freshMovies = movies;
			if (entry.pendingPatches.length > 0) {
				// Re-apply any patches that came in while this fetch was in
				// flight, so they aren't silently overwritten by the fresh data.
				freshMovies = freshMovies.map((m) => {
					let result = m;
					for (const { movieId, patch } of entry.pendingPatches) {
						if (result.id === movieId) result = patch(result);
					}
					return result;
				});
				entry.pendingPatches = [];
			}
			entry.movies = freshMovies;
			entry.error = error;
			entry.fetchedAt = Date.now();
			if (error) {
				// Don't cache a hard failure — allow the next mount to retry,
				// mirroring officialAwardWinners' "allow retry" behavior.
				if (movieCache.get(cacheKey) === entry) {
					movieCache.delete(cacheKey);
				}
			}
		})
		.catch((err) => {
			console.warn("Movie data fetch exception:", err);
			entry.movies = [];
			entry.error = err instanceof Error ? err.message : "Failed to load movies";
			entry.fetchedAt = Date.now();
			if (movieCache.get(cacheKey) === entry) {
				movieCache.delete(cacheKey);
			}
		});

	movieCache.set(cacheKey, entry);
	return entry;
}

// New hook that supports both authenticated and guest users
export function useMovieDataWithGuest() {
	const [movies, setMovies] = useState<Movie[]>([]);
	const [loading, setLoading] = useState(true);
	const [hasMounted, setHasMounted] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const supabase = useSupabaseClient<Database>();
	const { user, status: authStatus } = useAuthState();
	const guestStore = useGuestRankingStore();
	const userId = user?.id ?? "";
	const isGuest = authStatus === "unauthenticated";
	const authChecked = authStatus !== "loading";
	const cacheKeyRef = useRef<string | null>(null);

	// Prevent showing a previous account's rankings while auth state is switching.
	useEffect(() => {
		setMovies([]);
		setLoading(true);
		setError(null);
	}, [userId, isGuest, authStatus]);

	useEffect(() => {
		setHasMounted(true);
	}, []);

	useEffect(() => {
		if (!authChecked) return;
		const cacheKey = getMovieCacheKey(isGuest, userId);
		if (!cacheKey) return;

		cacheKeyRef.current = cacheKey;
		let cancelled = false;
		setLoading(true);
		setError(null);

		const entry = loadMoviesForKey(supabase, cacheKey, isGuest, userId);
		entry.promise.then(() => {
			if (cancelled) return;
			// Read entry.movies/error fresh (not a value captured by the promise)
			// so any mutation patched into the cache since the fetch resolved
			// (see patchMovieCache) is reflected even on a mount that arrives late.
			setMovies(entry.movies);
			setError(entry.error);
			setLoading(false);
		});

		return () => {
			cancelled = true;
		};
	}, [authChecked, userId, supabase, isGuest]);

	const updateMovieRanking = async (
		movieId: string,
		updates: { seen_it?: boolean; ranking?: number | null }
	): Promise<boolean> => {
		if (isGuest) {
			// For guests, update Zustand store - need to map seen_it to seenIt
			const guestUpdates: { ranking?: number | null; seenIt?: boolean } = {};
			if (updates.ranking !== undefined) guestUpdates.ranking = updates.ranking;
			if (updates.seen_it !== undefined) guestUpdates.seenIt = updates.seen_it;
			
			guestStore.updateRanking(movieId, guestUpdates);

			// Update local state immediately for better UX
			const applyGuestPatch = (m: Movie): Movie => {
				if (m.id !== movieId) return m;
				const guestRanking = guestStore.getRanking(movieId);
				if (!guestRanking) return m;
				return {
					...m,
					rankings: [{
						id: `guest_${movieId}`,
						user_id: 'guest',
						ranking: guestRanking.ranking,
						seen_it: guestRanking.seenIt,
					}],
				};
			};
			setMovies((prevMovies) => prevMovies.map(applyGuestPatch));
			if (cacheKeyRef.current) {
				patchMovieCache(cacheKeyRef.current, movieId, applyGuestPatch);
			}
			return true;
		}

		// For authenticated users, use the existing logic
		const movie = movies.find((m) => m.id === movieId);
		const existing = movie?.rankings?.[0];

		if (updates.ranking === null) {
			if (existing?.id) {
					const { error } = await supabase
						.from("rankings")
						.delete()
						.eq("id", existing.id)
						.eq("user_id", userId!);

				if (error) {
					console.error("Delete error:", error.message);
					return false;
				}
			}

			const clearRankingPatch = (m: Movie): Movie =>
				m.id === movieId ? { ...m, rankings: [] } : m;
			setMovies((prevMovies) => prevMovies.map(clearRankingPatch));
			if (cacheKeyRef.current) {
				patchMovieCache(cacheKeyRef.current, movieId, clearRankingPatch);
			}
			return true;
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
			return false;
		}

		const applyRankingPatch = (m: Movie): Movie => {
			if (m.id !== movieId) return m;
			const updatedRankings = [...m.rankings];
			if (updatedRankings.length === 0) {
				updatedRankings.push({
					id: generateUUID(),
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
		};
		setMovies((prevMovies) => prevMovies.map(applyRankingPatch));
		if (cacheKeyRef.current) {
			patchMovieCache(cacheKeyRef.current, movieId, applyRankingPatch);
		}
		return true;
	};

	return {
		movies, 
		loading, 
		user,
		userId, 
		updateMovieRanking,
		isGuest,
		hasMounted,
		authChecked,
		error
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
	const [filterType, setFilterType] = useState<"none" | "year" | "rank" | "movie" | "search" | "genre">(
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
			if (filterValue === "all") return true;
			if (filterValue === "unranked") {
				const r = movie.rankings?.[0]?.ranking;
				return r === null || r === undefined || r === 0;
			}
			return movie.rankings?.[0]?.ranking === Number(filterValue);
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
	const uniqueRanks = Array.from(new Set(movies.map((m) => m.rankings?.[0]?.ranking).filter((r): r is number => typeof r === "number" && r > 0))).sort((a, b) => a - b);

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

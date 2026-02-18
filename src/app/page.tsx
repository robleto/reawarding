"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import {
	useMovieDataWithGuest,
} from "@/utils/sharedMovieUtils";
import { getGreeting, getGreetingSubtext } from "@/utils/greeting";
import { useCreateAward } from "@/hooks/useCreateAward";
import { useUserAwards } from "@/hooks/useUserAwards";
import { markStorageWarningShown, shouldShowStorageWarningOnce } from "@/hooks/useGuestRankingStore";
import MoviePosterCard from "@/components/movie/MoviePosterCard";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import UnifiedBanner from "@/components/auth/UnifiedBanner";
import AuthModalManager from "@/components/auth/AuthModalManager";
import HomeEmptyState from "@/components/home/HomeEmptyState";
import AwardCreatedMoment from "@/components/home/AwardCreatedMoment";
import YearExplorer from "@/components/home/YearExplorer";
import EditableYearSection from "@/components/award/EditableYearSection";
import { Film, Plus, ChevronDown, ChevronUp, Star, ArrowRight, Search, Trophy, BarChart3 } from "lucide-react";

import type { Movie as BaseMovie } from "@/types/types";
import type { AwardResult } from "@/hooks/useCreateAward";

const normalizeCategory = (value: string | undefined | null) =>
	(value || "").trim().toLowerCase().replace(/[_\s]+/g, "-");

// ─── Types ──────────────────────────────────────────────

type BallotLevel = "emerging" | "standard" | "complete" | "not-started";
type BallotEntry = { year: number; nomineeCount: number; level: BallotLevel };
type BallotEntryWithFilms = BallotEntry & { films: BaseMovie[] };

// ─── Inline components ──────────────────────────────────

/** Ballot year card — used in the timeline grid */
function BallotCard({ year, nomineeCount, level, films, onClick }: {
	year: number;
	nomineeCount: number;
	level: BallotLevel;
	films: BaseMovie[];
	onClick: () => void;
}) {
	const pct = Math.min(100, (nomineeCount / 10) * 100);

	const border = {
		"not-started": "border-gray-700/30 hover:border-gray-600/50",
		emerging: "border-yellow-500/20 hover:border-yellow-400/40",
		standard: "border-yellow-500/20 hover:border-yellow-400/40",
		complete: "border-emerald-500/20 hover:border-emerald-400/40",
	}[level];

	const bar = {
		"not-started": "bg-gray-600",
		emerging: "bg-yellow-400",
		standard: "bg-yellow-400",
		complete: "bg-emerald-400",
	}[level];

	const badge = {
		"not-started": "bg-gray-700/60 text-gray-400",
		emerging: "bg-yellow-500/15 text-yellow-400",
		standard: "bg-yellow-500/15 text-yellow-300",
		complete: "bg-emerald-500/15 text-emerald-400",
	}[level];

	return (
		<button
			onClick={onClick}
			className={`group flex flex-col rounded-xl border ${border} bg-gray-900/35 hover:bg-gray-800/50 transition-all text-left overflow-hidden focus:outline-none focus-visible:ring-1 focus-visible:ring-yellow-500/40`}
		>
			{/* Poster thumbnail strip */}
			<div className="flex gap-0.5 w-full h-14 overflow-hidden rounded-t-xl">
				{films.slice(0, 3).map((movie) => {
					const src = movie.cached_thumb_url || movie.thumb_url || movie.cached_poster_url || movie.poster_url || "";
					return (
						<div key={movie.id} className="flex-1 relative overflow-hidden bg-gray-800">
							{src ? (
								<Image src={src} alt={movie.title} fill className="object-cover opacity-75 group-hover:opacity-100 transition-opacity" sizes="60px" unoptimized />
							) : (
								<div className="w-full h-full flex items-center justify-center bg-gray-800">
									<Film className="w-3 h-3 text-gray-600" />
								</div>
							)}
						</div>
					);
				})}
				{/* Fill empty slots */}
				{Array.from({ length: Math.max(0, 3 - films.length) }).map((_, i) => (
					<div key={`empty-${i}`} className="flex-1 bg-gray-800/60" />
				))}
			</div>
			{/* Card body */}
			<div className="px-2.5 py-2 flex flex-col gap-1.5">
				<div className="flex items-center justify-between gap-1">
					<span className="text-sm font-bold text-white font-unbounded">{year}</span>
					<span className={`text-[9px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded-full ${badge}`}>
						{level === "not-started" ? "new" : level}
					</span>
				</div>
				<div className="h-1 rounded-full bg-gray-700/50 overflow-hidden">
					<div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${pct}%` }} />
				</div>
				<span className="text-[10px] text-gray-500 tabular-nums">{nomineeCount}/10</span>
			</div>
		</button>
	);
}

// ─── Main component ─────────────────────────────────────

export default function HomePage() {
	const { movies, loading, user, userId, updateMovieRanking, isGuest, authChecked } = useMovieDataWithGuest();
	const allMovies = movies ?? [];
	const [showAuthModal, setShowAuthModal] = useState(false);
	const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
	const [selectedMovie, setSelectedMovie] = useState<BaseMovie | null>(null);
	const [userProfile, setUserProfile] = useState<{
		first_name?: string;
		last_name?: string;
		username?: string;
		preferred_name?: string | null;
		last_login?: string;
	} | null>(null);

	// Award creation state
	const [awardResult, setAwardResult] = useState<AwardResult | null>(null);
	const [awardMovieTitle, setAwardMovieTitle] = useState("");
	const [awardMoviePoster, setAwardMoviePoster] = useState<string | undefined>();
	const [explorerYear, setExplorerYear] = useState<number | null>(null);
	const [explorerIsEditing, setExplorerIsEditing] = useState(false);
	const [showStorageWarning, setShowStorageWarning] = useState(false);
	const [showStartBallot, setShowStartBallot] = useState(false);
	const [showAllBallots, setShowAllBallots] = useState(false);
	const [customYearInput, setCustomYearInput] = useState("");
	const previousExplorerYearRef = useRef<number | null>(null);

	const { createAward } = useCreateAward();
	const { awards, refetch: refetchAwards } = useUserAwards();

	const router = useRouter();
	const supabase = useSupabaseClient();

	// Fetch user profile
	useEffect(() => {
		async function fetchProfile() {
			if (!user?.id) return;
			const { data } = await supabase
				.from("profiles")
				.select("first_name, last_name, username, preferred_name, last_login")
				.eq("id", user.id)
				.single();
			if (data) setUserProfile(data);
		}
		fetchProfile();
	}, [user, supabase]);

	// Handle auth code from email confirmation
	useEffect(() => {
		const handleAuthCode = async () => {
			const params = new URLSearchParams(window.location.search);
			const hashParams = new URLSearchParams(window.location.hash.substring(1));
			const code = params.get('code');
			const token_hash = params.get('token_hash') || hashParams.get('token_hash');
			const type = params.get('type') || hashParams.get('type');
			const access_token = hashParams.get('access_token');
			const refresh_token = hashParams.get('refresh_token');

			if (access_token || token_hash) {
				try {
					let result;
					if (access_token && refresh_token) {
						result = await supabase.auth.setSession({ access_token, refresh_token });
					} else if (token_hash && type) {
						result = await supabase.auth.verifyOtp({ token_hash, type: type as any });
					}
					if (result?.error) {
						const { data: session } = await supabase.auth.getSession();
						if (session?.session) {
							window.history.replaceState({}, '', window.location.pathname);
							window.location.reload();
							return;
						}
					} else {
						window.history.replaceState({}, '', window.location.pathname);
						window.location.reload();
					}
				} catch (err) {
					console.error('Auth processing error:', err);
				}
			}
		};
		handleAuthCode();
	}, [supabase]);

	useEffect(() => {
		if (!isGuest) return;
		if (!shouldShowStorageWarningOnce()) return;
		setShowStorageWarning(true);
		markStorageWarningShown();
	}, [isGuest]);

	useEffect(() => {
		if (!explorerYear) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [explorerYear]);

	useEffect(() => {
		if (!explorerYear) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			if (explorerIsEditing) return;
			setExplorerYear(null);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [explorerYear, explorerIsEditing]);

	useEffect(() => {
		if (previousExplorerYearRef.current !== null && explorerYear === null) {
			void refetchAwards();
		}
		previousExplorerYearRef.current = explorerYear;
		if (explorerYear === null) {
			setExplorerIsEditing(false);
		}
	}, [explorerYear, refetchAwards]);

	const handleAuthSuccess = () => {
		setShowAuthModal(false);
	};

	const handleSignupClick = () => {
		setAuthMode("signup");
		setShowAuthModal(true);
	};

	const handleLoginClick = () => {
		setAuthMode("login");
		setShowAuthModal(true);
	};

	// --- Award creation handlers ---
	const handleMovieSelected = useCallback(
		async (movie: BaseMovie) => {
			if (explorerYear !== null) {
				return;
			}

			const existingRankings: Record<number, number | null | undefined> = {};
			for (const m of allMovies) {
				if (m.rankings?.[0]?.ranking) {
					existingRankings[m.id] = m.rankings[0].ranking;
				}
			}

			const result = await createAward(movie, existingRankings);

			setAwardMovieTitle(movie.title);
			setAwardMoviePoster(movie.poster_url || undefined);
			setAwardResult(result);

			await refetchAwards();
		},
		[createAward, allMovies, refetchAwards, explorerYear]
	);

	// --- Loading state ---
	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
					<p className="text-gray-600 dark:text-gray-300">Loading your session…</p>
				</div>
			</div>
		);
	}

	// ─── Derived data ───────────────────────────────────────
	const currentYear = new Date().getFullYear();

	// --- Greeting ---
	let displayName = "there";
	if (userProfile?.preferred_name) displayName = userProfile.preferred_name;
	else if (userProfile?.first_name) displayName = userProfile.first_name;
	else if (userProfile?.username) displayName = userProfile.username;
	else if (user?.email) displayName = user.email.split('@')[0];

	const lastLogin = userProfile?.last_login;
	const daysSinceLastLogin = lastLogin
		? Math.floor((new Date().getTime() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24))
		: undefined;
	const greeting = getGreeting(lastLogin, displayName);
	const subtext = getGreetingSubtext(daysSinceLastLogin);

	// --- Ranking-derived fallback shelf ---
	const rankingDerivedShelf: { year: number; winner: BaseMovie; nominees: BaseMovie[] }[] = (() => {
		const moviesWithRankings = allMovies.filter(
			(m) => m.rankings && m.rankings.length > 0 && m.rankings[0].ranking !== null
		);
		const grouped: Record<number, BaseMovie[]> = {};
		for (const m of moviesWithRankings) {
			const y = m.release_year;
			if (!grouped[y]) grouped[y] = [];
			grouped[y].push(m);
		}
		return Object.entries(grouped)
			.map(([yearStr, movies]) => {
				const sorted = [...movies].sort(
					(a, b) => (b.rankings![0]?.ranking ?? 0) - (a.rankings![0]?.ranking ?? 0)
				);
				const nominees = sorted
					.filter((m) => (m.rankings![0]?.ranking ?? 0) >= 7)
					.slice(0, 10);
				const winner = nominees.length > 0 ? nominees[0] : sorted[0];
				return { year: Number(yearStr), winner, nominees };
			})
			.filter((d) => d.winner)
			.sort((a, b) => b.year - a.year);
	})();

	// --- Saved best-picture awards shelf ---
	const savedAwardsShelf: { year: number; winner: BaseMovie; nominees: BaseMovie[] }[] = (() => {
		if (awards.length === 0) return [];

		const resolveMovie = (id: string | number | null | undefined): BaseMovie | null => {
			if (id === null || id === undefined) return null;
			return (
				allMovies.find((m) => String(m.id) === String(id)) ??
				null
			);
		};

		return awards
			.filter((award) => normalizeCategory(award.category) === "best-picture")
			.map((award) => {
				const nomineeMovies = award.nomineeIds
					.map((id) => resolveMovie(id))
					.filter((movie): movie is BaseMovie => Boolean(movie));
				const winnerMovie = resolveMovie(award.winnerId) ?? nomineeMovies[0] ?? null;
				if (!winnerMovie) return null;

				const nominees = nomineeMovies.some((movie) => movie.id === winnerMovie.id)
					? nomineeMovies
					: [winnerMovie, ...nomineeMovies];

				return {
					year: award.year,
					winner: winnerMovie,
					nominees: nominees.slice(0, 10),
				};
			})
			.filter((entry): entry is { year: number; winner: BaseMovie; nominees: BaseMovie[] } => Boolean(entry))
			.sort((a, b) => b.year - a.year);
	})();

	// Union: saved awards overwrite ranking-derived
	const rankingShelf: { year: number; winner: BaseMovie; nominees: BaseMovie[] }[] = (() => {
		const byYear = new Map<number, { year: number; winner: BaseMovie; nominees: BaseMovie[] }>();
		for (const row of rankingDerivedShelf) byYear.set(row.year, row);
		for (const row of savedAwardsShelf) byYear.set(row.year, row);
		return Array.from(byYear.values()).sort((a, b) => b.year - a.year);
	})();

	// --- Helper: get best-picture award for a given year ---
	const getBestPictureAward = (year: number) =>
		awards.find(
			(a) =>
				a.year === year &&
				normalizeCategory(a.category) === "best-picture"
		) ?? null;

	// --- ALL ballot years (no subsets — show everything, sorted newest-first) ---
	const allBallotYears: BallotEntry[] = rankingShelf.map((entry) => {
		const nomineeCount = entry.nominees.length;
		const level: BallotLevel =
			nomineeCount >= 10
				? "complete"
				: nomineeCount >= 5
					? "standard"
					: nomineeCount >= 3
						? "emerging"
						: "not-started";
		return { year: entry.year, nomineeCount, level };
	}).sort((a, b) => b.year - a.year);

	// --- Home year model ---
	const primaryYear = currentYear;

	const primaryBallot: BallotEntry = (() => {
		const existing = allBallotYears.find((b) => b.year === currentYear);
		if (existing) return existing;
		return { year: currentYear, nomineeCount: 0, level: "not-started" as BallotLevel };
	})();

	// --- Display data helper: compute nominees/winner/allMoviesForYear for a given year ---
	const getYearDisplayData = (year: number) => {
		const shelf = rankingShelf.find((s) => s.year === year);
		if (!shelf) return null;

		const allMoviesForYear = allMovies
			.filter((m) => m.release_year === year && m.rankings?.length > 0 && m.rankings[0].ranking !== null)
			.sort((a, b) => (b.rankings![0]?.ranking ?? 0) - (a.rankings![0]?.ranking ?? 0));

		return {
			nominees: shelf.nominees,
			winner: shelf.winner,
			allMoviesForYear,
		};
	};

	const primaryYearDisplayData = getYearDisplayData(currentYear);

	// Showcase hero: meaningful best-picture ballot, not forced to current year.
	const showcaseBallot: BallotEntry | null = (() => {
		const withThreePlus = allBallotYears.filter((b) => b.nomineeCount >= 3);
		const withOnePlus = allBallotYears.filter((b) => b.nomineeCount >= 1);
		const candidates = withThreePlus.length > 0 ? withThreePlus : withOnePlus;
		if (candidates.length === 0) return null;

		const withSavedWinner = candidates.filter((b) => {
			const award = getBestPictureAward(b.year);
			return award?.winnerId !== null && award?.winnerId !== undefined && award?.winnerId !== "";
		});
		const pool = withSavedWinner.length > 0 ? withSavedWinner : candidates;
		return [...pool].sort((a, b) => b.year - a.year)[0] ?? null;
	})();
	const showcaseYear = showcaseBallot?.year ?? null;
	const showcaseDisplayData = showcaseYear !== null ? getYearDisplayData(showcaseYear) : null;

	// Timeline filter predicate (applied after getContextMoviesForYear is defined below)
	const _archiveFilter = (b: BallotEntry) => {
		if (b.year === currentYear) return false;
		if (showcaseYear !== null && b.year === showcaseYear) return false;
		return true;
	};

	// --- "Start Another Ballot" suggestions ---
	const shelfYearSet = new Set(rankingShelf.map((e) => e.year));
	const ratedByYear: Record<number, number> = {};
	for (const m of allMovies) {
		if (m.rankings?.length > 0 && m.rankings[0].ranking !== null) {
			const y = m.release_year;
			if (!shelfYearSet.has(y)) {
				ratedByYear[y] = (ratedByYear[y] || 0) + 1;
			}
		}
	}
	const suggestedNewYears = Object.entries(ratedByYear)
		.map(([y, count]) => ({ year: Number(y), ratedCount: count }))
		.sort((a, b) => b.ratedCount - a.ratedCount || b.year - a.year)
		.slice(0, 4);

	const getRecentTimestamp = (movie: BaseMovie) => {
		const dateStr = (movie as BaseMovie & { release_date?: string }).release_date ?? "";
		const timestamp = Date.parse(dateStr);
		return Number.isNaN(timestamp) ? 0 : timestamp;
	};

	const getContextMoviesForYear = (year: number, limit = 3) => {
		const ballot = rankingShelf.find((s) => s.year === year);
		const nomineeIds = new Set(ballot?.nominees.map((m) => m.id) ?? []);
		const yearMovies = allMovies.filter((m) => m.release_year === year);

		const contextRanked = yearMovies
			.filter((m) => m.rankings?.[0]?.ranking !== null && m.rankings?.[0]?.ranking !== undefined)
			.sort((a, b) => (b.rankings?.[0]?.ranking ?? 0) - (a.rankings?.[0]?.ranking ?? 0));

		const contextSeenUnrated = yearMovies
			.filter((m) => m.rankings?.[0]?.seen_it === true && (m.rankings?.[0]?.ranking === null || m.rankings?.[0]?.ranking === undefined))
			.sort((a, b) => getRecentTimestamp(b) - getRecentTimestamp(a));

		const fallbackNominees = (ballot?.nominees ?? [])
			.filter((m) => nomineeIds.has(m.id))
			.sort((a, b) => (b.rankings?.[0]?.ranking ?? 0) - (a.rankings?.[0]?.ranking ?? 0));

		const merged = [...contextRanked, ...contextSeenUnrated, ...fallbackNominees];
		const deduped: BaseMovie[] = [];
		const ids = new Set<number>();
		for (const movie of merged) {
			if (ids.has(movie.id)) continue;
			ids.add(movie.id);
			deduped.push(movie);
			if (deduped.length >= limit) break;
		}
		return deduped;
	};

	// Timeline: all ballot years except current-year anchor and showcase hero, enriched with context films.
	const archiveYears: BallotEntryWithFilms[] = allBallotYears
		.filter(_archiveFilter)
		.map((b) => ({ ...b, films: getContextMoviesForYear(b.year, 3) }));

	// 1) Continue your ballots (up to 3): sorted by most recently changed ranking
	// Find the most recent updated_at timestamp for any ranked movie in each year
	const mostRecentRankingByYear: Record<number, number> = {};
	for (const movie of allMovies) {
		const r = movie.rankings?.[0];
		if (r?.updated_at) {
			const ts = new Date(r.updated_at as string).getTime();
			const yr = movie.release_year;
			if (!mostRecentRankingByYear[yr] || ts > mostRecentRankingByYear[yr]) {
				mostRecentRankingByYear[yr] = ts;
			}
		}
	}

	const continueBallotYears = allBallotYears
		.filter((b) => b.year !== currentYear && b.nomineeCount >= 3 && b.nomineeCount < 10)
		.sort((a, b) => {
			const aTs = mostRecentRankingByYear[a.year] ?? 0;
			const bTs = mostRecentRankingByYear[b.year] ?? 0;
			if (bTs !== aTs) return bTs - aTs;
			return b.year - a.year;
		})
		.slice(0, 3)
		.map((b) => ({
			...b,
			films: getContextMoviesForYear(b.year, 3),
		}))
		.filter((b) => b.films.length > 0);

	// 2) New this year: current year releases sorted by release_date DESC
	const newThisYearMovies = allMovies
		.filter((m) => m.release_year === currentYear)
		.sort((a, b) => getRecentTimestamp(b) - getRecentTimestamp(a))
		.slice(0, 10);

	// If showing award celebration moment, show it
	if (awardResult) {
		return (
			<div className="py-4">
				{isGuest && (
					<UnifiedBanner onSignupClick={handleSignupClick} onLoginClick={handleLoginClick} />
				)}
				{showStorageWarning && (
					<div className="mb-4 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs">
						Your picks are temporary in this browser mode and will disappear on refresh. Sign up to save them.
					</div>
				)}
				<AwardCreatedMoment
					result={awardResult}
					movieTitle={awardMovieTitle}
					moviePosterUrl={awardMoviePoster}
					isGuest={isGuest}
					isFirstAward={rankingShelf.length <= 1}
					onAddNominees={() => {
						setAwardResult(null);
						router.push(`/awards?year=${awardResult.year}`);
					}}
					onFixAnotherYear={() => {
						setAwardResult(null);
					}}
					onSeeMyAwards={() => {
						setAwardResult(null);
					}}
					onSignup={handleSignupClick}
				/>
				<AuthModalManager
					isOpen={showAuthModal}
					onClose={() => setShowAuthModal(false)}
					initialMode={authMode}
					onAuthSuccess={handleAuthSuccess}
				/>
			</div>
		);
	}

	// =============================================
	// STATE 1: "The Ballot" (0 ranked years)
	// =============================================
	if (rankingShelf.length === 0 && !loading) {
		return (
			<div>
				<HomeEmptyState onMovieSelected={handleMovieSelected} />
				{showStorageWarning && isGuest && (
					<div className="mb-4 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs">
						Your picks are temporary in this browser mode and will disappear on refresh. Sign up to save them.
					</div>
				)}
				<AuthModalManager
					isOpen={showAuthModal}
					onClose={() => setShowAuthModal(false)}
					initialMode={authMode}
					onAuthSuccess={handleAuthSuccess}
				/>
			</div>
		);
	}

	// =============================================
	// STATE 2: THE SESSION — "What should I do next?"
	// =============================================

	// Archive has its own display state
	const hasArchiveYears = archiveYears.length > 0;

	return (
		<div className="py-4">
			{/* Unified Banner System for Guests */}
			{isGuest && (
				<UnifiedBanner onSignupClick={handleSignupClick} onLoginClick={handleLoginClick} />
			)}
			{showStorageWarning && isGuest && (
				<div className="mb-4 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs">
					Your picks are temporary in this browser mode and will disappear on refresh. Sign up to save them.
				</div>
			)}

			{/* ─── A) GREETING + QUICK ACTIONS ─────────────────── */}
			<section className="mb-10">
				{!isGuest && (
					<div className="text-center mb-6">
						<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
							{greeting}
						</h2>
						<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
							{subtext}
						</p>
					</div>
				)}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
					<Link
						href="/films"
						className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl border border-gray-700/30 bg-gray-900/40 hover:bg-gray-800/60 hover:border-gray-600/40 transition-all group"
					>
						<Search className="w-5 h-5 text-gray-400 group-hover:text-yellow-400 transition-colors" />
						<span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors">Find Films</span>
					</Link>
					<Link
						href="/rankings"
						className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl border border-gray-700/30 bg-gray-900/40 hover:bg-gray-800/60 hover:border-gray-600/40 transition-all group"
					>
						<BarChart3 className="w-5 h-5 text-gray-400 group-hover:text-yellow-400 transition-colors" />
						<span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors">Your Rankings</span>
					</Link>
					<Link
						href="/awards"
						className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl border border-gray-700/30 bg-gray-900/40 hover:bg-gray-800/60 hover:border-gray-600/40 transition-all group"
					>
						<Trophy className="w-5 h-5 text-gray-400 group-hover:text-yellow-400 transition-colors" />
						<span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors">Your Awards</span>
					</Link>
					<button
						onClick={() => setExplorerYear(primaryYear)}
						className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl border border-gray-700/30 bg-gray-900/40 hover:bg-gray-800/60 hover:border-gray-600/40 transition-all group"
					>
						<Star className="w-5 h-5 text-gray-400 group-hover:text-yellow-400 transition-colors" />
						<span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors">Rate Films</span>
					</button>
				</div>
			</section>

			{/* ─── B) CURRENT YEAR ANCHOR (compact) ───────────── */}
			<section className="mb-8">
				<div className="rounded-2xl border border-gray-700/50 bg-gray-900/55 px-4 py-4 sm:px-5 sm:py-5">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div>
							<p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Current Year</p>
							<h3 className="text-xl font-bold text-white">{currentYear}</h3>
							<p className="text-sm text-gray-400 mt-0.5">
								{primaryBallot.nomineeCount === 0
									? "Continue this year with what you just watched."
									: `${primaryBallot.nomineeCount} nominees so far (${primaryBallot.level}).`}
							</p>
						</div>
						<div className="flex items-center gap-2">
							<button
								onClick={() => setExplorerYear(currentYear)}
								className="px-3 py-2 rounded-lg bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/25 transition-colors text-sm font-medium"
							>
								{primaryBallot.nomineeCount === 0 ? "Add a film you watched" : `Continue ${currentYear} ballot`}
							</button>
							<Link
								href="/films"
								className="px-3 py-2 rounded-lg border border-gray-600/40 text-gray-300 hover:text-white hover:border-gray-500/60 transition-colors text-sm font-medium"
							>
								Rate a film
							</Link>
						</div>
					</div>
					{primaryYearDisplayData && primaryYearDisplayData.nominees.length > 0 && (
						<div className="mt-3 h-1.5 rounded-full bg-gray-800/70 overflow-hidden">
							<div
								className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300"
								style={{ width: `${Math.min(100, (primaryBallot.nomineeCount / 10) * 100)}%` }}
							/>
						</div>
					)}
				</div>
			</section>

			{/* ─── C) SHOWCASE HERO (meaningful ballot) ───────── */}
			{showcaseYear !== null && showcaseDisplayData && showcaseDisplayData.nominees.length > 0 && (
				<section className="mb-12">
					<EditableYearSection
						year={String(showcaseYear)}
						winner={showcaseDisplayData.winner}
						movies={showcaseDisplayData.nominees}
						allMoviesForYear={showcaseDisplayData.allMoviesForYear}
						category="best-picture"
						nomineeImageMode="poster"
					/>
					<div className="-mt-16 text-center">
						<button
							type="button"
							onClick={() => setExplorerYear(showcaseYear)}
							className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-yellow-300 transition-colors"
						>
							Open {showcaseYear} workshop
							<ArrowRight className="w-3.5 h-3.5" />
						</button>
					</div>
				</section>
			)}

			{/* ─── D) ARCHIVE TIMELINE ─────────────────────────── */}
			{hasArchiveYears && (
				<section className="mb-12">
					<button
						onClick={() => setShowAllBallots(!showAllBallots)}
						className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 font-medium transition-colors mb-3"
					>
						<span>Your ballot timeline ({archiveYears.length})</span>
						{showAllBallots ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
					</button>

					{showAllBallots && (
						<div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
								{archiveYears.map((b) => (
									<BallotCard key={b.year} year={b.year} nomineeCount={b.nomineeCount} level={b.level} films={b.films} onClick={() => setExplorerYear(b.year)} />
								))}
							</div>

							{/* Start another ballot */}
							<div className="pt-2">
								<button
									onClick={() => setShowStartBallot(!showStartBallot)}
									className="group flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-yellow-300 transition-colors"
								>
									<Plus className="w-3 h-3" />
									Start another ballot
									{showStartBallot ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
								</button>

								{showStartBallot && (
									<div className="mt-2 p-3 bg-gray-900/50 border border-gray-700/30 rounded-lg animate-in fade-in duration-150">
										{suggestedNewYears.length > 0 && (
											<div className="mb-2.5">
												<p className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wide font-medium">Based on your ratings</p>
												<div className="flex flex-wrap gap-1.5">
													{suggestedNewYears.map(({ year, ratedCount }) => (
														<button
															key={year}
															onClick={() => { setExplorerYear(year); setShowStartBallot(false); }}
															className="px-2.5 py-1 rounded-md bg-gray-800/60 hover:bg-gray-800 border border-gray-700/30 hover:border-yellow-500/20 transition-all text-xs text-gray-300 hover:text-white"
														>
															{year} <span className="text-gray-500">({ratedCount})</span>
														</button>
													))}
												</div>
											</div>
										)}
										<div className="flex gap-2">
											<input
												type="number"
												min={1927}
												max={currentYear}
												value={customYearInput}
												onChange={(e) => setCustomYearInput(e.target.value)}
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														const y = Number(customYearInput);
														if (y >= 1927 && y <= currentYear) {
															setExplorerYear(y);
															setShowStartBallot(false);
															setCustomYearInput("");
														}
													}
												}}
												placeholder={`1927–${currentYear}`}
												className="flex-1 px-2.5 py-1.5 bg-gray-800/50 border border-gray-700/30 rounded-md text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/40 focus:ring-1 focus:ring-yellow-500/20"
											/>
											<button
												onClick={() => {
													const y = Number(customYearInput);
													if (y >= 1927 && y <= currentYear) {
														setExplorerYear(y);
														setShowStartBallot(false);
														setCustomYearInput("");
													}
												}}
												disabled={!customYearInput || Number(customYearInput) < 1927 || Number(customYearInput) > currentYear}
												className="px-3 py-1.5 bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-300 border border-yellow-500/25 rounded-md text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
											>
												Go
											</button>
										</div>
									</div>
								)}
							</div>
						</div>
					)}
				</section>
			)}

			{/* ─── E) CONTINUE YOUR BALLOTS ───────────────────── */}
			{continueBallotYears.length > 0 && (
				<section className="mb-12">
					<div className="flex items-center justify-between mb-3">
						<h2 className="text-lg font-bold text-gray-900 dark:text-white">Continue your ballots</h2>
					</div>
					<div className="grid grid-cols-3 gap-2.5">
						{continueBallotYears.map((entry) => {
							const pct = Math.min(100, (entry.nomineeCount / 10) * 100);
							const barColor = entry.level === "emerging" ? "bg-amber-400" : "bg-emerald-400";
							return (
								<button
									key={entry.year}
									onClick={() => setExplorerYear(entry.year)}
									className="group flex flex-col rounded-xl border border-gray-700/40 bg-gray-900/35 hover:bg-gray-800/50 hover:border-yellow-500/20 transition-all text-left overflow-hidden focus:outline-none focus-visible:ring-1 focus-visible:ring-yellow-500/40"
								>
									{/* Tiny poster strip */}
									<div className="flex gap-0.5 w-full h-16 overflow-hidden rounded-t-xl">
										{entry.films.slice(0, 3).map((movie, i) => {
											const src = movie.cached_thumb_url || movie.thumb_url || movie.cached_poster_url || movie.poster_url || "";
											return (
												<div key={`thumb-${entry.year}-${movie.id}`} className="flex-1 relative overflow-hidden bg-gray-800">
													{src ? (
														<Image
															src={src}
															alt={movie.title}
															fill
															className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
															sizes="80px"
														/>
													) : (
														<div className="w-full h-full bg-gray-800 flex items-center justify-center">
															<Film className="w-4 h-4 text-gray-600" />
														</div>
													)}
													{/* Ranking badge */}
													{movie.rankings?.[0]?.ranking != null && (
														<span className="absolute bottom-0.5 right-0.5 bg-black/70 text-yellow-300 text-[9px] font-bold px-1 rounded leading-tight">
															{movie.rankings[0].ranking}
														</span>
													)}
												</div>
											);
										})}
										{/* Fill empty slots */}
										{Array.from({ length: Math.max(0, 3 - entry.films.length) }).map((_, i) => (
											<div key={`empty-${i}`} className="flex-1 bg-gray-800/60" />
										))}
									</div>

									{/* Card body */}
									<div className="p-2.5 flex-1 flex flex-col gap-1.5">
										<div className="flex items-center justify-between gap-1">
											<span className="text-sm font-bold text-white font-unbounded">{entry.year}</span>
											<span className={`text-[9px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded-full ${
												entry.level === "emerging"
													? "bg-amber-500/15 text-amber-400"
													: "bg-emerald-500/15 text-emerald-400"
											}`}>
												{entry.level}
											</span>
										</div>

										{/* Progress bar */}
										<div className="h-1 rounded-full bg-gray-700/50 overflow-hidden">
											<div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
										</div>

										<p className="text-[10px] text-gray-500 tabular-nums">{entry.nomineeCount}/10 nominees</p>

										<span className="mt-auto text-[10px] font-medium text-yellow-400/70 group-hover:text-yellow-300 transition-colors">
											Continue →
										</span>
									</div>
								</button>
							);
						})}
					</div>
				</section>
			)}

			{/* ─── F) NEW THIS YEAR ───────────────────────────── */}
			{newThisYearMovies.length > 0 && (
				<section className="mb-12">
					<div className="flex items-center justify-between mb-3">
						<div>
							<h2 className="text-lg font-bold text-gray-900 dark:text-white">New this year</h2>
							<p className="text-xs text-gray-500">Recent releases from {currentYear}</p>
						</div>
						<button
							onClick={() => setExplorerYear(currentYear)}
							className="text-sm text-yellow-300 hover:text-yellow-200 transition-colors"
						>
							Browse {currentYear}
						</button>
					</div>
					<div className="-mx-10 sm:-mx-6 px-10 sm:px-6">
						<div className="flex gap-3 pb-3 overflow-x-auto snap-x snap-mandatory pr-8 sm:pr-10">
							{newThisYearMovies.map((movie) => {
								const r = movie.rankings?.[0];
								return (
									<div key={`new-${movie.id}`} className="flex-shrink-0 w-[120px] sm:w-[140px] snap-start">
										<MoviePosterCard
											movie={movie}
											currentUserId={userId}
											ranking={r?.ranking ?? null}
											seenIt={r?.seen_it ?? false}
											onUpdate={updateMovieRanking}
											onClick={() => setSelectedMovie(movie as BaseMovie)}
										/>
									</div>
								);
							})}
						</div>
					</div>
				</section>
			)}



			{/* Auth Modal */}
			<AuthModalManager
				isOpen={showAuthModal}
				onClose={() => setShowAuthModal(false)}
				initialMode={authMode}
				onAuthSuccess={handleAuthSuccess}
			/>

			{/* Movie Detail Modal */}
			{selectedMovie && (
				<MovieDetailModal
					movie={selectedMovie as any}
					isOpen={!!selectedMovie}
					onClose={() => setSelectedMovie(null)}
					onUpdate={(movieId, newRanking, newSeenIt) => {
						updateMovieRanking(movieId, { ranking: newRanking, seen_it: newSeenIt });
					}}
					initialRanking={(selectedMovie.rankings?.[0]?.ranking) ?? null}
					initialSeenIt={(selectedMovie.rankings?.[0]?.seen_it) ?? false}
				/>
			)}

			{/* Year Explorer Overlay */}
			{explorerYear && (
				<div className="fixed inset-0 z-50">
					<button
						type="button"
						aria-label="Close year workspace"
						className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity"
						onClick={() => {
							if (explorerIsEditing) return;
							setExplorerYear(null);
						}}
					/>

					<div className="relative h-full w-full overflow-y-auto px-4 sm:px-6 py-6">
						<div className="mx-auto max-w-6xl">
							<YearExplorer
								year={explorerYear}
								allMovies={allMovies}
								currentUserId={userId}
								existingAward={getBestPictureAward(explorerYear)}
								onCreateAward={handleMovieSelected}
								onUpdateMovieRanking={updateMovieRanking}
								onClose={() => setExplorerYear(null)}
								isGuest={isGuest}
								onEditingChange={setExplorerIsEditing}
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

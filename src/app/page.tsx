"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import {
	useMovieDataWithGuest,
	filterUnseenMovies,
	sortForYourConsideration,
} from "@/utils/sharedMovieUtils";
import { getGreeting, getGreetingSubtext } from "@/utils/greeting";
import { useCreateAward } from "@/hooks/useCreateAward";
import { useUserAwards } from "@/hooks/useUserAwards";
import MoviePosterCard from "@/components/movie/MoviePosterCard";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import UnifiedBanner from "@/components/auth/UnifiedBanner";
import AuthModalManager from "@/components/auth/AuthModalManager";
import HomeEmptyState from "@/components/home/HomeEmptyState";
import AwardCreatedMoment from "@/components/home/AwardCreatedMoment";
import AwardCard from "@/components/home/AwardCard";
import YearExplorer from "@/components/home/YearExplorer";
import MovieSearchPicker from "@/components/home/MovieSearchPicker";
import { Film } from "lucide-react";

import type { Movie as BaseMovie } from "@/types/types";
import type { AwardResult } from "@/hooks/useCreateAward";
import StatsSummary from "@/components/stats/StatsSummary";

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

	const { createAward, createFromRatings } = useCreateAward();
	const { awards, awardCount, loading: awardsLoading, refetch: refetchAwards } = useUserAwards();

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
			setAwardMovieTitle(movie.title);
			setAwardMoviePoster(movie.poster_url || undefined);

			// Build existing rankings map for additive inference
			const existingRankings: Record<number, number | null | undefined> = {};
			for (const m of allMovies) {
				if (m.rankings?.[0]?.ranking) {
					existingRankings[m.id] = m.rankings[0].ranking;
				}
			}

			const result = await createAward(movie, existingRankings);
			setAwardResult(result);

			// Refetch awards to update count
			setTimeout(() => refetchAwards(), 500);
		},
		[createAward, allMovies, refetchAwards]
	);

	const handleCreateFromRatings = useCallback(
		async (year: number, nominees: BaseMovie[], winner: BaseMovie) => {
			setAwardMovieTitle(winner.title);
			setAwardMoviePoster(winner.poster_url || undefined);

			const result = await createFromRatings(year, nominees, winner);
			setAwardResult(result);
			setExplorerYear(null);

			setTimeout(() => refetchAwards(), 500);
		},
		[createFromRatings, refetchAwards]
	);

	// --- Loading state ---
	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
					<p className="text-gray-600 dark:text-gray-300">Loading amazing movies...</p>
				</div>
			</div>
		);
	}

	// --- Derived data ---
	const unseen = sortForYourConsideration(filterUnseenMovies(allMovies));
	const currentYear = new Date().getFullYear();

	const getConsensusRating = (movie: BaseMovie): number | null => {
		if (typeof movie.tmdb_rating === "number" && movie.tmdb_rating > 0) return movie.tmdb_rating;
		if (typeof movie.imdb_rating === "number" && movie.imdb_rating > 0) return movie.imdb_rating;
		if (typeof movie.metacritic_score === "number" && movie.metacritic_score > 0) return movie.metacritic_score / 10;
		return null;
	};

	const ratedMoviesWithScores = allMovies
		.map((movie) => ({
			movie,
			myRating: typeof movie.rankings?.[0]?.ranking === "number" ? movie.rankings[0].ranking : null,
			consensusRating: getConsensusRating(movie),
		}))
		.filter((entry) => entry.myRating !== null);

	const allTimerMovies = ratedMoviesWithScores
		.filter((entry) => entry.myRating === 10)
		.sort((a, b) => (b.consensusRating ?? 0) - (a.consensusRating ?? 0))
		.slice(0, 30);

	const hotTakeThreshold = 3;
	const hotTakePositive = ratedMoviesWithScores
		.map((entry) => ({ ...entry, difference: (entry.myRating ?? 0) - (entry.consensusRating ?? 0) }))
		.filter((entry) => entry.consensusRating !== null && entry.difference >= hotTakeThreshold)
		.sort((a, b) => b.difference - a.difference);
	const hotTakeNegative = ratedMoviesWithScores
		.map((entry) => ({ ...entry, difference: (entry.myRating ?? 0) - (entry.consensusRating ?? 0) }))
		.filter((entry) => entry.consensusRating !== null && entry.difference <= -hotTakeThreshold)
		.sort((a, b) => b.difference - a.difference);
	const hotTakeMovies = [...hotTakePositive, ...hotTakeNegative];

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

	// --- Year chips for "Fix Another Year" ---
	const yearChips = Array.from(
		{ length: Math.min(10, currentYear - 1927 + 1) },
		(_, i) => currentYear - i
	);

	// If showing award celebration moment, show it
	if (awardResult) {
		return (
			<div className="py-4">
				{isGuest && (
					<UnifiedBanner onSignupClick={handleSignupClick} onLoginClick={handleLoginClick} />
				)}
				<AwardCreatedMoment
					result={awardResult}
					movieTitle={awardMovieTitle}
					moviePosterUrl={awardMoviePoster}
					isGuest={isGuest}
					isFirstAward={awardCount <= 1}
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
	// STATE MACHINE: 3-state homepage
	// =============================================

	// STATE 1: "The Ballot" (0 awards)
	if (awardCount === 0 && !awardsLoading) {
		return (
			<div>
				<HomeEmptyState onMovieSelected={handleMovieSelected} />

				{/* For Your Consideration */}
				<section className="mt-6">
					<h2 className="text-xl font-bold text-gray-900 dark:text-white">For Your Consideration</h2>
					{unseen.length > 0 ? (
						<div className="-mx-10 sm:-mx-6 px-10 sm:px-6">
							<div className="flex gap-4 pb-4 overflow-x-auto snap-x snap-mandatory pr-8 sm:pr-10">
								{unseen.map((movie) => {
									const r = movie.rankings?.[0];
									return (
										<div key={movie.id} className="flex-shrink-0 w-[140px] sm:w-[160px] snap-start">
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
					) : (
						<div className="text-center py-8 text-gray-500 dark:text-gray-400">
							<Film className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
							<p>You&apos;ve seen all the movies! Check back for new releases.</p>
						</div>
					)}
				</section>

				{/* Auth Modal */}
				<AuthModalManager
					isOpen={showAuthModal}
					onClose={() => setShowAuthModal(false)}
					initialMode={authMode}
					onAuthSuccess={handleAuthSuccess}
				/>
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
			</div>
		);
	}

	// STATE 2: "The Shelf" (1-5 awards) or STATE 3: "The Control Room" (5+ awards)
	const isControlRoom = awardCount > 5;

	return (
		<div className="py-4">
			{/* Unified Banner System for Guests */}
			{isGuest && (
				<UnifiedBanner onSignupClick={handleSignupClick} onLoginClick={handleLoginClick} />
			)}

			{/* Greeting (all states for authenticated users) */}
			{!isGuest && (
				<div className="text-center mb-6">
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
						{greeting}
					</h2>
					<p className="text-sm text-gray-600 dark:text-gray-300">
						{subtext}
					</p>
				</div>
			)}

			{/* Quick search for new awards */}
			<div className="max-w-xl mx-auto mb-6">
				<MovieSearchPicker
					onSelect={handleMovieSelected}
					placeholder="Search to pick a Best Picture..."
				/>
			</div>

			{/* Your Awards — The Shelf */}
			<section className="mb-6">
				<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Your Awards</h2>
				<div className="grid gap-2 sm:grid-cols-2">
					{awards.map((award) => (
						<AwardCard
							key={award.year}
							year={award.year}
							winnerId={award.winnerId ?? 0}
							nomineeIds={award.nomineeIds}
							onClick={() => router.push(`/awards?year=${award.year}`)}
						/>
					))}
				</div>
				<div className="mt-3 text-center">
					<button
						onClick={() => router.push('/awards')}
						className="inline-flex items-center gap-2 px-4 py-2 text-sm text-yellow-300 hover:text-yellow-200 transition-colors"
					>
						See all awards
						<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
						</svg>
					</button>
				</div>
			</section>

			{/* Fix Another Year — Year chips */}
			<section className="mb-6">
				<h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Fix Another Year</h2>
				<div className="flex flex-wrap gap-2 mb-3">
					{yearChips.map((y) => {
						const hasAward = awards.some((a) => a.year === y);
						return (
							<button
								key={y}
								onClick={() => setExplorerYear(explorerYear === y ? null : y)}
								className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
									explorerYear === y
										? "bg-yellow-500/20 text-yellow-300 border-yellow-500/40"
										: hasAward
										? "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
										: "bg-gray-800/50 text-gray-400 border-gray-700/50 hover:bg-gray-800/80 hover:text-gray-200"
								}`}
							>
								{y}
							</button>
						);
					})}
				</div>

				{/* Year Explorer inline */}
				{explorerYear && (
					<YearExplorer
						year={explorerYear}
						allMovies={allMovies}
						currentUserId={userId}
						onCreateAward={handleMovieSelected}
						onCreateFromRatings={handleCreateFromRatings}
						onUpdateMovieRanking={updateMovieRanking}
						onClose={() => setExplorerYear(null)}
					/>
				)}
			</section>

			{/* For Your Consideration */}
			<section className="mt-6">
				<h2 className="text-xl font-bold text-gray-900 dark:text-white">For Your Consideration</h2>
				{unseen.length > 0 ? (
					<div className="-mx-10 sm:-mx-6 px-10 sm:px-6">
						<div className="flex gap-4 pb-4 overflow-x-auto snap-x snap-mandatory pr-8 sm:pr-10">
							{unseen.map((movie) => {
								const r = movie.rankings?.[0];
								return (
									<div key={movie.id} className="flex-shrink-0 w-[140px] sm:w-[160px] snap-start">
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
				) : (
					<div className="text-center py-8 text-gray-500 dark:text-gray-400">
						<Film className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
						<p>You&apos;ve seen all the movies! Check back for new releases.</p>
					</div>
				)}
			</section>

			{/* Your All-Timers (Shelf + Control Room, once rankings exist) */}
			{allTimerMovies.length > 0 && (
				<section className="mt-6">
					<h2 className="text-xl font-bold text-gray-900 dark:text-white">Your All-Timers</h2>
					<p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
						Your 10/10 films, in one quick row.
					</p>
					<div className="-mx-10 sm:-mx-6 px-10 sm:px-6">
						<div className="flex gap-4 pb-4 overflow-x-auto snap-x snap-mandatory pr-8 sm:pr-10">
							{allTimerMovies.map(({ movie }) => {
								const ranking = movie.rankings?.[0];
								return (
									<div key={`all-timer-${movie.id}`} className="flex-shrink-0 w-[140px] sm:w-[160px] snap-start">
										<MoviePosterCard
											movie={movie}
											currentUserId={userId}
											ranking={ranking?.ranking ?? null}
											seenIt={ranking?.seen_it ?? false}
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

			{/* Hot Takes (Control Room only) */}
			{isControlRoom && hotTakeMovies.length > 0 && (
				<section className="mt-2 mb-6">
					<h2 className="text-xl font-bold text-gray-900 dark:text-white">Hot Takes</h2>
					<p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
						From your strongest positive gaps (3.0+) straight to your strongest negative gaps (-3.0 and below).
					</p>
					<div className="-mx-10 sm:-mx-6 px-10 sm:px-6">
						<div className="flex gap-4 pb-4 overflow-x-auto snap-x snap-mandatory pr-8 sm:pr-10">
							{hotTakeMovies.map(({ movie, difference }) => {
								const ranking = movie.rankings?.[0];
								const diffLabel = `${difference > 0 ? "+" : ""}${difference.toFixed(1)}`;
								return (
									<div key={`hot-take-${movie.id}`} className="flex-shrink-0 w-[140px] sm:w-[160px] snap-start">
										<MoviePosterCard
											movie={movie}
											currentUserId={userId}
											ranking={ranking?.ranking ?? null}
											ratingLabel={diffLabel}
											seenIt={ranking?.seen_it ?? false}
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

			{/* Stats (Control Room only) */}
			{isControlRoom && authChecked && (
				<div className="mt-8">
					<StatsSummary variant="compact" />
				</div>
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
		</div>
	);
}

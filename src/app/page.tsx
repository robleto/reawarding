"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import {
	useMovieDataWithGuest,
	filterUnseenMovies,
	sortForYourConsideration,
} from "@/utils/sharedMovieUtils";
import { getGuestData } from "@/utils/guestMode";
import { getGreeting, getGreetingSubtext } from "@/utils/greeting";
import EditableYearSection from "@/components/award/EditableYearSection";
import MoviePosterCard from "@/components/movie/MoviePosterCard";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import UnifiedBanner from "@/components/auth/UnifiedBanner";
import AuthModalManager from "@/components/auth/AuthModalManager";
import HomeEmptyState from "@/components/home/HomeEmptyState";
import OnboardingProgress from "@/components/home/OnboardingProgress";
import { Film, Lock } from "lucide-react";
import { useOnboardingProgress, getOnboardingMessage } from "@/hooks/useOnboardingProgress";

import type { Movie as BaseMovie } from "@/types/types";
import { AuthChecker } from "@/components/auth/AuthChecker";
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

	// Calculate onboarding progress at top level (hooks must be called unconditionally)
	const onboardingProgress = useOnboardingProgress(allMovies);
	const onboardingMessage = getOnboardingMessage(onboardingProgress);
	const shouldShowOnboarding = onboardingProgress.totalRanked < 25;
	const router = useRouter();
	const supabase = useSupabaseClient();

	// Fetch user profile for first_name, last_name, username and last_login
	useEffect(() => {
		async function fetchProfile() {
			if (!user?.id) return;
			
			const { data, error } = await supabase
				.from("profiles")
				.select("first_name, last_name, username, preferred_name, last_login")
				.eq("id", user.id)
				.single();
			
			if (data) {
				setUserProfile(data);
			}
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
			
			// Handle email confirmation or recovery
			if (access_token || token_hash) {
				console.log('🔐 Processing auth params:', { 
					hasCode: !!code, 
					hasTokenHash: !!token_hash, 
					hasAccessToken: !!access_token,
					type,
					codePreview: code ? code.substring(0, 8) + '...' : null,
					url: window.location.href
				});
				
				try {
					let result;
					
					if (access_token && refresh_token) {
						// Handle hash-based auth (typical for email confirmation)
						console.log('🔐 Setting session from tokens');
						result = await supabase.auth.setSession({
							access_token,
							refresh_token
						});
					} else if (token_hash && type) {
						// Handle email confirmation via token hash
						console.log('🔐 Using verifyOtp for token hash');
						result = await supabase.auth.verifyOtp({
							token_hash,
							type: type as any
						});
					}
					
					if (result?.error) {
						console.error('❌ Auth verification error:', result.error);
						console.log('🔄 Trying to get existing session...');
						
						// If the first method failed, try getting a fresh session
						const { data: session } = await supabase.auth.getSession();
						if (session?.session) {
							console.log('✅ Found existing session:', session.session.user.email);
							window.history.replaceState({}, '', window.location.pathname);
							window.location.reload();
							return;
						}
					} else {
						console.log('✅ Auth processed successfully:', result?.data?.user?.email);
						// Clear the params from URL and refresh auth state
						window.history.replaceState({}, '', window.location.pathname);
						window.location.reload();
					}
				} catch (err) {
					console.error('❌ Auth processing error:', err);
				}
			} else if (code) {
				// Just log that we found a code but skip processing for now
				console.log('🔐 Found auth code but skipping processing (likely expired):', code.substring(0, 8) + '...');
				console.log('💡 Please sign up again to get a fresh confirmation link');
			}
		};

		handleAuthCode();
	}, [supabase]);

	const handleAuthSuccess = () => {
		setShowAuthModal(false);
		// Data migration is handled automatically by the auth migration hook
	};

	const handleSignupClick = () => {
		setAuthMode("signup");
		setShowAuthModal(true);
	};

	const handleLoginClick = () => {
		setAuthMode("login");
		setShowAuthModal(true);
	};

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

	const unseen = sortForYourConsideration(filterUnseenMovies(allMovies));
	const currentYear = new Date().getFullYear();
	const awardsUnlockThreshold = 5;
	const awardsPreviewYears = [currentYear, currentYear - 1];
	const allTimersLimit = 30;
	const hotTakeThreshold = 3;

	const getYearFromMovie = (movie: BaseMovie) => {
		if (typeof movie.release_year === "number") return movie.release_year;
		if (!movie.release_year) return null;
		const parsedYear = new Date(String(movie.release_year)).getFullYear();
		return Number.isFinite(parsedYear) ? parsedYear : null;
	};

	const getAwardsDataForYear = (year: number) => {
		const rankedMoviesForYear = allMovies.filter((movie) => {
			const releaseYear = getYearFromMovie(movie);
			const ranking = movie.rankings?.[0]?.ranking;
			return releaseYear === year && typeof ranking === "number" && ranking > 0;
		});

		const sortedMovies = [...rankedMoviesForYear].sort(
			(a, b) => (b.rankings?.[0]?.ranking ?? 0) - (a.rankings?.[0]?.ranking ?? 0)
		);
		const nominees = sortedMovies.filter((movie) => (movie.rankings?.[0]?.ranking ?? 0) >= 7).slice(0, 10);
		const winner = nominees[0] ?? sortedMovies[0] ?? null;

		return {
			rankedCount: rankedMoviesForYear.length,
			unlocked: rankedMoviesForYear.length >= awardsUnlockThreshold,
			sortedMovies,
			nominees,
			winner,
		};
	};

	const getConsensusRating = (movie: BaseMovie): number | null => {
		if (typeof movie.tmdb_rating === "number" && movie.tmdb_rating > 0) return movie.tmdb_rating;
		if (typeof movie.imdb_rating === "number" && movie.imdb_rating > 0) return movie.imdb_rating;
		if (typeof movie.metacritic_score === "number" && movie.metacritic_score > 0) return movie.metacritic_score / 10;
		return null;
	};

	const ratedMoviesWithScores = allMovies
		.map((movie) => {
			const myRating = movie.rankings?.[0]?.ranking;
			return {
				movie,
				myRating: typeof myRating === "number" ? myRating : null,
				consensusRating: getConsensusRating(movie),
			};
		})
		.filter((entry) => entry.myRating !== null);

	const allTimerMovies = ratedMoviesWithScores
		.filter((entry) => entry.myRating === 10)
		.sort((a, b) => (b.consensusRating ?? 0) - (a.consensusRating ?? 0))
		.slice(0, allTimersLimit);

	const hotTakePositive = ratedMoviesWithScores
		.map((entry) => ({
			...entry,
			difference: (entry.myRating ?? 0) - (entry.consensusRating ?? 0),
		}))
		.filter((entry) => entry.consensusRating !== null && entry.difference >= hotTakeThreshold)
		.sort((a, b) => b.difference - a.difference);

	const hotTakeNegative = ratedMoviesWithScores
		.map((entry) => ({
			...entry,
			difference: (entry.myRating ?? 0) - (entry.consensusRating ?? 0),
		}))
		.filter((entry) => entry.consensusRating !== null && entry.difference <= -hotTakeThreshold)
		.sort((a, b) => b.difference - a.difference);

	const hotTakeMovies = [...hotTakePositive, ...hotTakeNegative];

	// Check if user has rated any movies
	const ratedMovies = allMovies.filter(
		(movie) => movie.rankings && movie.rankings.length > 0 && movie.rankings[0].ranking !== null
	);
	const hasRatedMovies = ratedMovies.length > 0;

	// Check guest interaction status
	const guestData = getGuestData();
	const hasGuestInteracted = guestData.hasInteracted || guestData.totalInteractions > 0;

	// Show empty state for brand new users (authenticated users with no ratings OR guests with no interactions)
	const shouldShowEmptyState = (!isGuest && !hasRatedMovies) || (isGuest && !hasGuestInteracted);
	
	// Compute greeting for authenticated users
	// Priority: preferred_name > first_name > username > email handle
	let displayName = "there";
	if (userProfile?.preferred_name) {
		displayName = userProfile.preferred_name;
	} else if (userProfile?.first_name) {
		displayName = userProfile.first_name;
	} else if (userProfile?.username) {
		displayName = userProfile.username;
	} else if (user?.email) {
		displayName = user.email.split('@')[0];
	}
	
	const lastLogin = userProfile?.last_login;
	const daysSinceLastLogin = lastLogin 
		? Math.floor((new Date().getTime() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24))
		: undefined;
	const greeting = getGreeting(lastLogin, displayName);
	const subtext = getGreetingSubtext(daysSinceLastLogin);
	
	if (shouldShowEmptyState) { 
		return ( 
			<div>
				<HomeEmptyState progress={onboardingProgress} /> 
				
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
											// Priority-load the first row's first few posters
											// Note: MoviePosterCard doesn't accept priority; handled internally by Next for top-of-viewport
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
			</div>
		);
	}

	return (
		<div className="py-4">
			{/* Unified Banner System for Guests */}
			{isGuest && (
				<UnifiedBanner 
					onSignupClick={handleSignupClick} 
					onLoginClick={handleLoginClick} 
				/>
			)}
			

			{/* Authenticated User Welcome - Compact */}
			{!isGuest && hasRatedMovies && (
				<div className="text-center mb-6">
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
						{greeting}
					</h2>
					<p className="text-sm text-gray-600 dark:text-gray-300">
						{subtext}
					</p>
				</div>
			)}

			{/* Onboarding */}
			{authChecked && shouldShowOnboarding ? (
				<OnboardingProgress
					progress={onboardingProgress}
					onboardingMessage={onboardingMessage}
				/>
			) : null}

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

		{/* Current Best Picture (reuse the Awards layout for visual parity) */}
		<section className="py-4 md:py-8">
			<h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Your Awards</h2>

			<div className="relative">
				{awardsPreviewYears.map((year) => {
					const data = getAwardsDataForYear(year);
					if (data.unlocked) {
						return (
							<EditableYearSection
								key={`awards-${year}`}
								year={String(year)}
								movies={data.nominees}
								winner={data.winner || undefined}
								allMoviesForYear={data.sortedMovies}
								category="best-picture"
							/>
						);
					}

					const remainingToUnlock = Math.max(awardsUnlockThreshold - data.rankedCount, 0);
					return (
						<section
							key={`awards-${year}`}
							className="w-full max-w-screen-xl px-0 py-0 mx-auto my-0 font-sans md:px-6"
						>
							<div className="relative flex flex-col gap-6 md:flex-row md:gap-8">
								<h2 className="md:absolute block top-0 md:top-[125px] left-0 text-3xl font-bold text-[#A0A0A0] mt-2 md:rotate-[-90deg] origin-left font-['Unbounded'] tracking-widest">
									{year}
								</h2>
								<div className="top-0 bottom-0 flex-col items-center hidden md:absolute md:flex left-4">
									<div className="w-5 h-5 mt-2 bg-gray-400 border-2 border-gray-100 rounded-full dark:bg-gray-700 dark:border-gray-900" />
									<div className="w-[2px] flex-1 bg-gray-300 dark:bg-gray-700" />
								</div>
								<div className="hidden md:inline-block w-0 md:w-[20px] shrink-0" />
								<div className="award-editable-section flex flex-col w-full rounded-xl shadow-md light-glass dark:dark-glass p-4 md:p-6 mb-24">
									<div className="inline-flex items-center gap-2 text-yellow-400 mb-2">
										<Lock className="w-4 h-4" />
										<span className="text-sm font-semibold">{year} Awards locked</span>
									</div>
									<p className="text-sm text-gray-700 dark:text-gray-300">
										Rate {remainingToUnlock} more {year} {remainingToUnlock === 1 ? "film" : "films"} to unlock nominees and winner.
									</p>
									<p className="mt-2 text-xs font-medium text-yellow-300">
										{data.rankedCount}/{awardsUnlockThreshold}
									</p>
								</div>
							</div>
						</section>
					);
				})}

				{/* See More CTA - positioned to align with timeline end on desktop */}
				<div className="mt-6 md:absolute md:bottom-0 md:right-0 md:mt-0 text-center md:text-right">
					<button
						onClick={() => router.push('/awards')}
						className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30 rounded-lg font-medium transition-colors"
					>
						See All Years & Awards
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
						</svg>
					</button>
				</div>
			</div>
		</section>
		
		{/* Your All-Timers */}
		<section className="mt-6">
			<h2 className="text-xl font-bold text-gray-900 dark:text-white">Your All-Timers</h2>
			<p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
				Your 10/10 films, in one quick row.
			</p>
			{allTimerMovies.length > 0 ? (
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
			) : (
				<div className="text-center py-8 text-gray-500 dark:text-gray-400">
					<p>No all-timers yet. Start dropping 10s and this row will fill in.</p>
				</div>
			)}
		</section>

		{/* Hot Takes */}
		<section className="mt-2 mb-6">
			<h2 className="text-xl font-bold text-gray-900 dark:text-white">Hot Takes</h2>
			<p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
				From your strongest positive gaps (3.0+) straight to your strongest negative gaps (-3.0 and below).
			</p>
			{hotTakeMovies.length > 0 ? (
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
			) : (
				<div className="text-center py-8 text-gray-500 dark:text-gray-400">
					<p>No hot takes yet. Rate more films and we&apos;ll surface your biggest swings.</p>
				</div>
			)}
		</section>

		{/* Stats bar (moved to bottom of homepage flow) */}
		{authChecked && !shouldShowOnboarding && (
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
		{/* Movie Detail Modal for mobile/desktop */}
		{selectedMovie && (
			<MovieDetailModal
				movie={selectedMovie as any}
				isOpen={!!selectedMovie}
				onClose={() => setSelectedMovie(null)}
				onUpdate={(movieId, newRanking, newSeenIt) => {
					updateMovieRanking(movieId, { ranking: newRanking, seen_it: newSeenIt });
				}}
				initialRanking={
					(selectedMovie.rankings && selectedMovie.rankings[0]?.ranking) ?? null
				}
				initialSeenIt={
					(selectedMovie.rankings && selectedMovie.rankings[0]?.seen_it) ?? false
				}
			/>
		)}
		</div>
	);
}

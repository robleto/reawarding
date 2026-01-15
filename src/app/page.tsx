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
import FeaturedCollectionsSection from "@/components/home/FeaturedCollectionsSection";
import OnboardingProgress from "@/components/home/OnboardingProgress";
import PublicListsHomeSection from "@/components/list/PublicListsHomeSection";
import { Film, Lock } from "lucide-react";
import { AwardsTabs, AwardsTabKey } from "@/components/award/AwardsTabs";
import Banner from "@/components/ui/Banner";
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
	const [previewCategory, setPreviewCategory] = useState<AwardsTabKey>("best-picture");
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
	const currentYearRankedCount = allMovies.filter((movie) => {
		const releaseYear = movie.release_year ?? (movie.release_year && new Date(movie.release_year).getFullYear());
		const ranking = movie.rankings?.[0]?.ranking;
		return releaseYear === currentYear && typeof ranking === "number" && ranking > 0;
	}).length;
	const awardsUnlockThreshold = 5;
	const awardsYear = currentYearRankedCount >= awardsUnlockThreshold ? currentYear : currentYear - 1;

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
					<p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
						New releases and acclaimed films curated for easy discovery.
					</p>
					{unseen.length > 0 ? (
						<div className="-mx-10 sm:-mx-6 px-10 sm:px-6">
							<div className="flex gap-4 pb-4 overflow-x-auto snap-x snap-mandatory pr-8 sm:pr-10">
							{unseen.map((movie, idx) => {
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
				{/* Featured Collections Section */}
				<FeaturedCollectionsSection 
					movies={allMovies}
					userId={userId}
					updateMovieRanking={updateMovieRanking}
					setSelectedMovie={setSelectedMovie}
				/>

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

			{/* Onboarding or Stats Line */}
			{!authChecked ? (
				<div className="mb-6">
					<div className="light-glass dark:dark-glass rounded-xl border border-gray-300/40 dark:border-gray-600/50 px-3 sm:px-4 py-2.5 sm:py-3 animate-pulse">
						<div className="flex items-center gap-3">
							<div className="hidden sm:block h-3 w-16 rounded bg-gray-300/40 dark:bg-gray-700/40" />
							<div className="flex-1 flex items-center gap-3 sm:gap-4">
								<div className="h-6 w-24 rounded bg-gray-300/40 dark:bg-gray-700/40" />
								<div className="h-6 w-24 rounded bg-gray-300/40 dark:bg-gray-700/40" />
								<div className="h-6 w-24 rounded bg-gray-300/40 dark:bg-gray-700/40" />
								<div className="h-6 w-24 rounded bg-gray-300/40 dark:bg-gray-700/40" />
								<div className="h-6 w-24 rounded bg-gray-300/40 dark:bg-gray-700/40" />
							</div>
						</div>
					</div>
				</div>
			) : shouldShowOnboarding ? (
				<OnboardingProgress
					progress={onboardingProgress}
					onboardingMessage={onboardingMessage}
				/>
			) : (
				<div className="mb-6">
					<StatsSummary variant="compact" />
				</div>
			)}

			{/* For Your Consideration */}
			<section className="mt-6">
				<h2 className="text-xl font-bold text-gray-900 dark:text-white">For Your Consideration</h2>
				<p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
					New releases and acclaimed films curated for easy discovery.
				</p>
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
			{awardsYear !== currentYear && (
				<div className="mb-4">
					<Banner
						variant="gold"
						icon={Lock}
						title={`${currentYear} Awards locked`}
						message={
							<>
								Rate {awardsUnlockThreshold - currentYearRankedCount} more {currentYear} {awardsUnlockThreshold - currentYearRankedCount === 1 ? 'film' : 'films'} to unlock.
								<span className="ml-2 text-xs font-medium text-yellow-300">
									{currentYearRankedCount}/{awardsUnlockThreshold}
								</span>
							</>
						}
					/>
				</div>
			)}
			
			<h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Your {awardsYear} Awards</h2>
			
			<AwardsTabs value={previewCategory} onChange={setPreviewCategory} />
				{(() => {
					const currentYearMovies = allMovies.filter((m) => {
						const y = m.release_year || (m.release_year && new Date(m.release_year).getFullYear());
						return y === awardsYear;
					});
					
					// Apply category filtering (same logic as awards page)
					const hasGenre = (m: BaseMovie, needle: string) =>
						Array.isArray(m.genres) && m.genres.some((g) => String(g ?? '').toLowerCase().includes(needle));
					
					const isActionBlockbuster = (m: BaseMovie) => 
						hasGenre(m, "action") || 
						hasGenre(m, "adventure") || 
						hasGenre(m, "superhero") || 
						hasGenre(m, "sci-fi") || 
						hasGenre(m, "science fiction") || 
						hasGenre(m, "fantasy");
					
					let filteredMovies = currentYearMovies;
					
					switch (previewCategory) {
						case "best-animated":
							filteredMovies = currentYearMovies.filter((m) => hasGenre(m, "animation") || hasGenre(m, "animated"));
							break;
						case "best-comedy":
							filteredMovies = currentYearMovies.filter((m) => 
								hasGenre(m, "comedy") && 
								!hasGenre(m, "animation") && 
								!hasGenre(m, "animated")
							);
							break;
						case "best-blockbuster":
							filteredMovies = currentYearMovies.filter((m) => 
								isActionBlockbuster(m) && 
								!hasGenre(m, "animation") && 
								!hasGenre(m, "animated") &&
								!hasGenre(m, "comedy")
							);
							break;
						case "best-picture":
						default:
							// No genre filtering for Best Picture
							break;
					}
					
					const sorted = [...filteredMovies].sort(
						(a, b) => (b.rankings?.[0]?.ranking ?? 0) - (a.rankings?.[0]?.ranking ?? 0)
					);
					
					// Apply ranking threshold: 7+ for best-picture, 5+ for others
					const rankingThreshold = previewCategory === "best-picture" ? 7 : 5;
					const defaultNominees = sorted.filter(m => (m.rankings?.[0]?.ranking ?? 0) >= rankingThreshold).slice(0, 10);
					const defaultWinner = defaultNominees.length > 0 ? defaultNominees[0] : sorted[0] ?? null;

				return (
					<div className="relative">
						<EditableYearSection
							year={String(awardsYear)}
							movies={defaultNominees}
							winner={defaultWinner || undefined}
							allMoviesForYear={sorted}
							category={previewCategory}
						/>
						
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
				);
			})()}
		</section>
		
		{/* Public Lists Horizontal Table */}
		<PublicListsHomeSection />

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

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
import PublicListsHomeSection from "@/components/list/PublicListsHomeSection";
import { Film } from "lucide-react";
import { AwardsTabs, AwardsTabKey } from "@/components/award/AwardsTabs";

import type { Movie as BaseMovie } from "@/types/types";
import { AuthChecker } from "@/components/auth/AuthChecker";
import StatsSummary from "@/components/stats/StatsSummary";

export default function HomePage() {
	const { movies, loading, user, userId, updateMovieRanking, isGuest } = useMovieDataWithGuest();
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

	const unseen = sortForYourConsideration(filterUnseenMovies(movies));
	const currentYear = new Date().getFullYear();

	// Check if user has rated any movies
	const ratedMovies = movies.filter(
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
				<HomeEmptyState /> 
				
				{/* Include the movies section below for when they scroll */}
				<section id="movies-section" className="mt-16">
					<h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">For Your Consideration</h2>
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

				{/* Stats Summary at bottom */}
				<div className="mt-12 px-4">
					<StatsSummary />
				</div>

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
		<div className="py-8">
			{/* Unified Banner System for Guests */}
			{isGuest && (
				<UnifiedBanner 
					onSignupClick={handleSignupClick} 
					onLoginClick={handleLoginClick} 
				/>
			)}
			

			{/* Authenticated User Welcome */}
			{!isGuest && hasRatedMovies && (
				<div className="text-center mb-8">
					<h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
						{greeting}
					</h2>
					<p className="text-gray-600 dark:text-gray-300">
						{subtext}
					</p>
				</div>
			)}

			{/* Start Watching Section */}
			<section id="movies-section">
				<h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">For Your Consideration</h2>
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
			<h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Your {currentYear} Awards</h2>
			<AwardsTabs value={previewCategory} onChange={setPreviewCategory} />
				{(() => {
					const currentYearMovies = movies.filter((m) => {
						const y = m.release_year || (m.release_year && new Date(m.release_year).getFullYear());
						return y === currentYear;
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
						<EditableYearSection
							year={String(currentYear)}
							movies={defaultNominees}
							winner={defaultWinner || undefined}
							allMoviesForYear={sorted}
							category={previewCategory}
						/>
					);
				})()}
			</section>

		   {/* Public Lists Horizontal Table */}
		   <PublicListsHomeSection />

		   {/* Stats Summary at bottom */}
		   <div className="mt-12">
		     <StatsSummary />
		   </div>

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

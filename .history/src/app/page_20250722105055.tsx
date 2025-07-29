"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import {
	useMovieDataWithGuest,
	filterUnseenMovies,
	sortByRecent,
} from "@/utils/sharedMovieUtils";
import { getGuestData } from "@/utils/guestMode";
import YearSection from "@/components/award/YearSection";
import MoviePosterCard from "@/components/movie/MoviePosterCard";
import UnifiedBanner from "@/components/auth/UnifiedBanner";
import AuthModalManager from "@/components/auth/AuthModalManager";
import HomeEmptyState from "@/components/home/HomeEmptyState";
import PublicListsHomeSection from "@/components/list/PublicListsHomeSection";
import { Film } from "lucide-react";

import type { Movie as BaseMovie } from "@/types/types";
import { AuthChecker } from "@/components/auth/AuthChecker";

export default function HomePage() {
	const { movies, loading, user, userId, updateMovieRanking, isGuest } = useMovieDataWithGuest();
	const [showAuthModal, setShowAuthModal] = useState(false);
	const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
	const router = useRouter();
	const supabase = useSupabaseClient();

	// Track movies just marked as seen in this session
	const [justSeen, setJustSeen] = useState<Set<number>>(new Set());

	const unseen = sortByRecent(filterUnseenMovies(movies));
	const unseenWithSession = unseen.filter((movie) => !justSeen.has(movie.id));
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

	// For Your Consideration section logic
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
	
	if (shouldShowEmptyState) { 
		return ( 
			<div> 
				<HomeEmptyState /> 
				{/* Include the movies section below for when they scroll */}
				<section id="movies-section" className="mt-16">
					<h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">For Your Consideration</h2>
					{unseenWithSession.length > 0 ? (
						<div className="flex gap-4 pb-4 overflow-x-auto">
							{unseenWithSession.map((movie) => {
								const r = movie.rankings?.[0];
								return (
									<div key={movie.id} className="flex-shrink-0 w-[160px]">
										<MoviePosterCard
											movie={movie}
											currentUserId={userId}
											ranking={r?.ranking ?? null}
											seenIt={r?.seen_it ?? false}
											onUpdate={(movieId, updates) => {
												if (updates.seen_it === true) {
													setJustSeen((prev) => new Set(prev).add(movieId));
												}
												updateMovieRanking(movieId, updates);
											}}
										/>
									</div>
								);
							})}
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
		<div className="px-4 py-8">
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
						Welcome back, {user?.email?.split('@')[0]}!
					</h2>
					<p className="text-gray-600 dark:text-gray-300">
						Continue rating movies and building your perfect Best Picture collection.
					</p>
				</div>
			)}

			{/* Start Watching Section */}
			<section id="movies-section">
				<h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">For Your Consideration</h2>
				{unseenWithSession.length > 0 ? (
					<div className="flex gap-4 pb-4 overflow-x-auto">
						{unseenWithSession.map((movie) => {
							const r = movie.rankings?.[0];
							return (
								<div key={movie.id} className="flex-shrink-0 w-[160px]">
									<MoviePosterCard
										movie={movie}
										currentUserId={userId}
										ranking={r?.ranking ?? null}
										seenIt={r?.seen_it ?? false}
										onUpdate={(movieId, updates) => {
											if (updates.seen_it === true) {
												setJustSeen((prev) => new Set(prev).add(movieId));
											}
											updateMovieRanking(movieId, updates);
										}}
									/>
								</div>
							);
						})}
					</div>
				) : (
					<div className="text-center py-8 text-gray-500 dark:text-gray-400">
						<Film className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
						<p>You&apos;ve seen all the movies! Check back for new releases.</p>
					</div>
				)}
			</section>

			{/* Current Best Picture */}
			<section className="px-6 py-8">
				<h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
					🏆 Best Picture of {currentYear}
				</h2>
				<YearSection
					year={String(currentYear)}
					movies={movies
						.filter((movie) => {
							const movieYear =
								movie.release_year ||
								(movie.release_year &&
									new Date(movie.release_year).getFullYear());
							return movieYear === currentYear;
						})
						.map((movie) => ({
							id: String(movie.id),
							title: movie.title,
							thumb_url: movie.thumb_url,
							poster_url: movie.poster_url,
							ranking: movie.rankings?.[0]?.ranking ?? 0,
						}))}
			winner={(() => {
				const currentYearMovies = movies.filter(
					(movie: BaseMovie) => {
						const movieYear =
							movie.release_year ||
							(movie.release_year &&
								new Date(
									movie.release_year
								).getFullYear());
						return movieYear === currentYear;
					}
				);

				const topMovie = currentYearMovies.reduce(
					(topMovie, currentMovie) => {
						const currentRanking =
							currentMovie.rankings?.[0]?.ranking ?? 0;
						const topRanking =
							topMovie?.rankings?.[0]?.ranking ?? 0;
						return currentRanking > topRanking
							? currentMovie
							: topMovie;
					},
					null as BaseMovie | null
				);

				return topMovie
					? {
							id: String(topMovie.id),
							title: topMovie.title,
							thumb_url: topMovie.thumb_url,
							poster_url: topMovie.poster_url,
							ranking:
								topMovie.rankings?.[0]?.ranking ?? 0,
					  }
					: null;
			})()}
				/>
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
		</div>
	);
}

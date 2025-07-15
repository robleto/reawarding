"use client";
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
import { useState } from "react";
import { Film } from "lucide-react";

import type { Movie as BaseMovie } from "@/types/types";

export default function HomePage() {
	const { movies, loading, user, userId, updateMovieRanking, isGuest } = useMovieDataWithGuest();
	const [showAuthModal, setShowAuthModal] = useState(false);
	const [authMode, setAuthMode] = useState<"login" | "signup">("signup");

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

	const unseen = sortByRecent(filterUnseenMovies(movies));
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
			<div className="px-4 py-8">
				<HomeEmptyState />
				
				{/* Include the movies section below for when they scroll */}
				<section id="movies-section" className="mt-16">
					<h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">For Your Consideration</h2>
					{unseen.length > 0 ? (
						<div className="flex gap-4 pb-4 overflow-x-auto">
							{unseen.map((movie) => {
								const r = movie.rankings?.[0];
								return (
									<div key={movie.id} className="flex-shrink-0 w-[160px]">
										<MoviePosterCard
											movie={movie}
											currentUserId={userId}
											ranking={r?.ranking ?? null}
											seenIt={r?.seen_it ?? false}
											onUpdate={updateMovieRanking}
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
				{unseen.length > 0 ? (
					<div className="flex gap-4 pb-4 overflow-x-auto">
						{unseen.map((movie) => {
							const r = movie.rankings?.[0];
							return (
								<div key={movie.id} className="flex-shrink-0 w-[160px]">
									<MoviePosterCard
										movie={movie}
										currentUserId={userId}
										ranking={r?.ranking ?? null}
										seenIt={r?.seen_it ?? false}
										onUpdate={updateMovieRanking}
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

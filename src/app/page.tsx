"use client";
import {
	useMovieDataWithGuest,
	filterUnseenMovies,
	sortByRecent,
} from "@/utils/sharedMovieUtils";
import YearReview from "@/components/award/YearSection";
import MoviePosterCard from "@/components/movie/MoviePosterCard";
import GuestDataBanner from "@/components/auth/GuestDataBanner";
import SignupPrompt from "@/components/auth/SignupPrompt";
import SavePromptBanner from "@/components/auth/SavePromptBanner";
import AuthModalManager from "@/components/auth/AuthModalManager";
import { useState } from "react";
import { useSavePromptBanner } from "@/hooks/useSavePromptBanner";
import { Star, Trophy, Film } from "lucide-react";

import type { Movie as BaseMovie } from "@/types/types";

export default function HomePage() {
	const { movies, loading, user, userId, updateMovieRanking, isGuest } = useMovieDataWithGuest();
	const [showAuthModal, setShowAuthModal] = useState(false);
	const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
	const savePromptBanner = useSavePromptBanner();

	const handleAuthSuccess = () => {
		setShowAuthModal(false);
		// Data migration is handled automatically by the auth migration hook
	};

	const handleSignupClick = () => {
		setAuthMode("signup");
		setShowAuthModal(true);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading amazing movies...</p>
				</div>
			</div>
		);
	}

	const unseen = sortByRecent(filterUnseenMovies(movies));
	const currentYear = new Date().getFullYear();

	return (
		<div className="px-4 py-8">
			{/* Guest Welcome Section */}
			{isGuest && (
				<div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-8">
					<div className="text-center max-w-2xl mx-auto">
						<div className="flex justify-center gap-2 mb-4">
							<Trophy className="w-8 h-8 text-yellow-500" />
							<Star className="w-8 h-8 text-blue-500" />
							<Film className="w-8 h-8 text-purple-500" />
						</div>
						<h2 className="text-2xl font-bold text-gray-900 mb-2">
							Welcome to OscarWorthy!
						</h2>
						<p className="text-gray-600 mb-4">
							Discover and rate the best movies of the year. Start by exploring our collection 
							and rating your favorites - no sign-up required to get started!
						</p>
						<div className="flex flex-col sm:flex-row gap-3 justify-center">
							<button
								onClick={() => {
									document.getElementById('movies-section')?.scrollIntoView({ 
										behavior: 'smooth' 
									});
								}}
								className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
							>
								Start Rating Movies
							</button>
							<button
								onClick={handleSignupClick}
								className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
							>
								Sign Up to Save Progress
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Save Prompt Banner for Guests */}
			{isGuest && (
				<SavePromptBanner
					visible={savePromptBanner.visible}
					onDismiss={savePromptBanner.onDismiss}
					onSignUp={handleSignupClick}
				/>
			)}

			{/* Authenticated User Welcome */}
			{!isGuest && (
				<div className="text-center mb-8">
					<h2 className="text-2xl font-bold text-gray-900 mb-2">
						Welcome back, {user?.email?.split('@')[0]}!
					</h2>
					<p className="text-gray-600">
						Continue rating movies and building your perfect Best Picture collection.
					</p>
				</div>
			)}

			{/* Guest Data Warning Banner */}
			{isGuest && <GuestDataBanner onSignupClick={handleSignupClick} />}

			{/* Start Watching Section */}
			<section id="movies-section">
				<h2 className="mb-4 text-xl font-bold">For Your Consideration</h2>
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
					<div className="text-center py-8 text-gray-500">
						<Film className="w-12 h-12 mx-auto mb-2 text-gray-400" />
						<p>You&apos;ve seen all the movies! Check back for new releases.</p>
					</div>
				)}
			</section>

			{/* Current Best Picture */}
			<section className="px-6 py-8">
				<h2 className="mb-4 text-xl font-bold">
					🏆 Best Picture of {currentYear}
				</h2>
				<YearReview
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

			{/* Signup Prompt for Guests */}
			{isGuest && (
				<SignupPrompt
					onSignupClick={handleSignupClick}
					onDismiss={() => {}}
				/>
			)}

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

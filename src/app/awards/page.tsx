"use client";

import { useState, useEffect } from "react";
import EditableYearSection from "@/components/award/EditableYearSection";
import { AwardsTabs, AwardsTabKey } from "@/components/award/AwardsTabs";
import AwardsEmptyState from "@/components/award/AwardsEmptyState";
import UnifiedBanner from "@/components/auth/UnifiedBanner";
import AuthModalManager from "@/components/auth/AuthModalManager";
import { useMovieDataWithGuest } from "@/utils/sharedMovieUtils";
import type { Movie } from "@/types/types";

interface YearData {
	year: string;
	winner: Movie | undefined;
	nominees: Movie[];
	allMovies: Movie[]; // All movies for the year
}

export default function AwardsPage() {
	const { movies, loading, isGuest } = useMovieDataWithGuest();
	const [formattedYears, setFormattedYears] = useState<YearData[]>([]);
	const [tab, setTab] = useState<AwardsTabKey>("best-picture");
	const [showAuthModal, setShowAuthModal] = useState(false);
	const [authMode, setAuthMode] = useState<"login" | "signup">("signup");

	const handleSignupClick = () => {
		setAuthMode("signup");
		setShowAuthModal(true);
	};

	const handleLoginClick = () => {
		setAuthMode("login");
		setShowAuthModal(true);
	};

	useEffect(() => {
		if (movies.length === 0) return;

		// Base: require a ranking
		let moviesWithRankings = movies.filter(
			(movie) => movie.rankings && movie.rankings.length > 0 && movie.rankings[0].ranking !== null
		);

		// Filter by selected tab/category
		const hasGenre = (m: Movie, genre: string) =>
			Array.isArray(m.genres) && m.genres.some((g) => g?.toLowerCase() === genre);
		switch (tab) {
			case "best-animated":
				moviesWithRankings = moviesWithRankings.filter((m) => hasGenre(m, "animation") || hasGenre(m, "animated"));
				break;
			case "best-comedy":
				moviesWithRankings = moviesWithRankings.filter((m) => hasGenre(m, "comedy"));
				break;
			case "best-drama":
				moviesWithRankings = moviesWithRankings.filter((m) => hasGenre(m, "drama"));
				break;
			case "best-picture":
			default:
				// no extra filtering
				break;
		}

		const groupedByYear = moviesWithRankings.reduce<Record<string, Movie[]>>(
			(acc, movie) => {
				const year = String(movie.release_year);
				if (!acc[year]) acc[year] = [];
				acc[year].push(movie);
				return acc;
			},
			{}
		);

		const years: YearData[] = Object.entries(groupedByYear)
			.map(([year, moviesInYear]) => {
				// Sort by ranking DESC
				const sorted = [...moviesInYear].sort(
					(a, b) => (b.rankings[0]?.ranking ?? 0) - (a.rankings[0]?.ranking ?? 0)
				);

				// Default nominees: top 10 movies ranked 7 or above
				const defaultNominees = sorted
					.filter((movie) => (movie.rankings[0]?.ranking ?? 0) >= 7)
					.slice(0, 10);

				// Default winner: highest ranked among nominees (or highest overall if no 7+ movies)
				const defaultWinner =
					defaultNominees.length > 0 ? defaultNominees[0] : sorted[0];

				return {
					year,
					winner: defaultWinner,
					nominees: defaultNominees,
					allMovies: sorted, // All movies for this year
				};
			})
			.filter(yearData => yearData.allMovies.length >= 1) // Only show years with 1+ rated movies
			.sort((a, b) => Number(b.year) - Number(a.year)); // Year DESC

		setFormattedYears(years);
	}, [movies, tab]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="w-12 h-12 mx-auto mb-4 border-b-2 border-blue-600 rounded-full animate-spin dark:border-blue-400"></div>
					<p className="text-gray-600 dark:text-gray-300">Loading your awards...</p>
				</div>
			</div>
		);
	}

	// Count total rated movies for empty state
	const totalRatedMovies = movies.filter(
		(movie) => movie.rankings && movie.rankings.length > 0 && movie.rankings[0].ranking !== null
	).length;

	// Show empty state if no years have enough movies
	if (formattedYears.length === 0) {
		return (
			<AwardsEmptyState ratedMoviesCount={totalRatedMovies} />
		);
	}

	return (
		<>
			{/* Unified Banner System for Guests */}
			{isGuest && (
				<UnifiedBanner 
					onSignupClick={handleSignupClick} 
					onLoginClick={handleLoginClick} 
				/>
			)}

			{/* Awards section tabs */}
			<div className="max-w-screen-xl mx-auto px-2 sm:px-4">
				<AwardsTabs value={tab} onChange={setTab} />
			</div>

			<div className="max-w-screen-xl mx-auto">
				{/* Best Picture tab content */}
				{tab === "best-picture" && formattedYears.map((yearData) => (
						<EditableYearSection
							key={yearData.year}
							year={yearData.year}
							winner={yearData.winner}
							movies={yearData.nominees}
							allMoviesForYear={yearData.allMovies}
						/>
				))}
				{tab !== "best-picture" && formattedYears.map((yearData) => (
						<EditableYearSection
							key={yearData.year}
							year={yearData.year}
							winner={yearData.winner}
							movies={yearData.nominees}
							allMoviesForYear={yearData.allMovies}
						/>
					))}
			</div>

			{/* Auth Modal */}
			<AuthModalManager
				isOpen={showAuthModal}
				onClose={() => setShowAuthModal(false)}
				initialMode={authMode}
			/>
		</>
	);
}

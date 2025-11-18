"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
	const { movies, loading, isGuest, hasMounted } = useMovieDataWithGuest();
	const [tab, setTab] = useState<AwardsTabKey>("best-picture");
	const [visibleYears, setVisibleYears] = useState<Set<string>>(new Set());
	const observerRef = useRef<IntersectionObserver | null>(null);
	// Derived year data instead of storing in state to avoid stale tab/category mismatches
	const formattedYears = useMemo<YearData[]>(() => {
		if (!hasMounted || movies.length === 0) return [];

		// Base: require a ranking
		let moviesWithRankings = movies.filter(
			(movie) => movie.rankings && movie.rankings.length > 0 && movie.rankings[0].ranking !== null
		);

		// Filter by selected tab/category
		const hasGenre = (m: Movie, needle: string) =>
			Array.isArray(m.genres) && m.genres.some((g) => String(g ?? '').toLowerCase().includes(needle));
		
		// Helper to identify action/blockbuster films (Golden Globes Cinematic Achievement style)
		const isActionBlockbuster = (m: Movie) => 
			hasGenre(m, "action") || 
			hasGenre(m, "adventure") || 
			hasGenre(m, "superhero") || 
			hasGenre(m, "sci-fi") || 
			hasGenre(m, "science fiction") || 
			hasGenre(m, "fantasy");
		
		switch (tab) {
			case "best-animated":
				moviesWithRankings = moviesWithRankings.filter((m) => hasGenre(m, "animation") || hasGenre(m, "animated"));
				break;
			case "best-comedy":
				moviesWithRankings = moviesWithRankings.filter((m) => hasGenre(m, "comedy"));
				break;
		case "best-blockbuster":
			moviesWithRankings = moviesWithRankings.filter((m) => 
				isActionBlockbuster(m) && 
				!hasGenre(m, "animation") && 
				!hasGenre(m, "animated")
			);
			break;
			case "best-drama":
				// Drama = everything that's NOT animated, comedy, or action/blockbuster
				moviesWithRankings = moviesWithRankings.filter((m) => 
					!hasGenre(m, "animation") && 
					!hasGenre(m, "animated") && 
					!hasGenre(m, "comedy") && 
					!isActionBlockbuster(m)
				);
				break;
			case "best-picture":
			default:
				// Best Picture: NO genre filtering. Return full ranked movie set.
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

				// Default nominees logic
				const rankingThreshold = tab === "best-picture" ? 7 : 5;
				const highRanked = sorted.filter((m) => (m.rankings[0]?.ranking ?? 0) >= rankingThreshold).slice(0, 10);
				let defaultNominees: Movie[] = highRanked;
				// Only fill to 10 nominees for non-Best-Picture categories
				if (tab !== "best-picture" && defaultNominees.length < 10) {
					const remaining = sorted
						.filter((m) => !defaultNominees.includes(m))
						.slice(0, 10 - defaultNominees.length);
					defaultNominees = [...defaultNominees, ...remaining];
				}

				const defaultWinner =
					tab === "best-picture"
						? (defaultNominees.length > 0 ? defaultNominees[0] : sorted[0])
						: (defaultNominees.length > 0 ? defaultNominees[0] : sorted[0]);

				return {
					year,
					winner: defaultWinner,
					nominees: defaultNominees,
					allMovies: sorted,
				};
			})
			.filter((yearData) => yearData.allMovies.length >= 1)
			.sort((a, b) => Number(b.year) - Number(a.year));

		return years;
	}, [movies, tab, hasMounted]);

	// Debug: aggregate total movies after category filter
	const totalFiltered = useMemo(() => {
		return formattedYears.reduce((acc, y) => acc + y.allMovies.length, 0);
	}, [formattedYears]);

// Debug metric removed for simplicity after revert

	// Debug: console sample of filtered data
	useEffect(() => {
		if (process.env.NODE_ENV === 'development') {
			const sample = formattedYears
				.flatMap((y) => y.allMovies)
				.slice(0, 5)
				.map((m) => ({ title: m.title, genres: m.genres }));
			// eslint-disable-next-line no-console
			console.log('Awards Debug', {
				tab,
				years: formattedYears.map((y) => y.year),
				totalFiltered,
				sample,
			});
		}
	}, [tab, formattedYears, totalFiltered]);
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

	// Initialize intersection observer for lazy loading year sections
	useEffect(() => {
		if (typeof window === 'undefined') return;

		observerRef.current = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					const year = entry.target.getAttribute('data-year');
					if (year) {
						if (entry.isIntersecting) {
							setVisibleYears((prev) => new Set(prev).add(year));
						}
					}
				});
			},
			{
				rootMargin: '400px', // Load sections 400px before they enter viewport
				threshold: 0,
			}
		);

		return () => {
			if (observerRef.current) {
				observerRef.current.disconnect();
			}
		};
	}, []);

	// Observe year container refs
	const yearContainerRef = useCallback((element: HTMLDivElement | null, year: string) => {
		if (!element || !observerRef.current) return;
		observerRef.current.observe(element);
	}, []);


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
				{formattedYears.map((yearData) => {
					const isVisible = visibleYears.has(yearData.year);
					return (
						<div
							key={`${yearData.year}-${tab}`}
							data-year={yearData.year}
							ref={(el) => yearContainerRef(el, yearData.year)}
							style={{ minHeight: isVisible ? 'auto' : '600px' }}
						>
							{isVisible ? (
								<EditableYearSection
									year={yearData.year}
									winner={yearData.winner}
									movies={yearData.nominees}
									allMoviesForYear={yearData.allMovies}
									category={tab}
								/>
							) : (
								<div className="flex items-center justify-center" style={{ minHeight: '600px' }}>
									<div className="text-gray-400 text-sm">Loading {yearData.year}...</div>
								</div>
							)}
						</div>
					);
				})}
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

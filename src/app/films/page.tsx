"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import MovieCard from "@/components/award/MovieCard";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import MovieFilters from "@/components/filters/MovieFilters";
import UnifiedBanner from "@/components/auth/UnifiedBanner";
import AuthModalManager from "@/components/auth/AuthModalManager";
import FilmsEmptyState from "@/components/films/FilmsEmptyState";
import AddMovieByTmdbModal from "@/components/movie/AddMovieByTmdbModal";
import type { Movie } from "@/types/types";

import {
	useMovieDataWithGuest,
	type SortKey,
	type GroupKey,
	type SortOrder,
  groupMovies,
} from "@/utils/sharedMovieUtils";

import Loader from "@/components/ui/Loading";

export const dynamic = "force-dynamic";

export default function FilmsPage() {
	return (
		<Suspense fallback={<Loader message="Loading films..." />}>
			<FilmsPageContent />
		</Suspense>
	);
}

function FilmsPageContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const { movies, loading, userId, updateMovieRanking, isGuest } = useMovieDataWithGuest();

	// Guests are first-class on /films per the project's guest-mode mandate.
	// The previous redirect-to-home blocked the natural "rate another from
	// {year}" path out of the onboarding loop. Removed 2026-05-12.
	
	// Films-specific view mode with grid as default for poster-based display
	const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("filmsViewMode") as "grid" | "list" | null;
			return stored || "grid"; // Default to grid for films
		}
		return "grid";
	});
	
	// Save films-specific view mode preference
	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("filmsViewMode", viewMode);
		}
	}, [viewMode]);
	
	const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	
	// Films-specific filter state with custom defaults
	const [sortBy, setSortBy] = useState<SortKey>(() => {
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("filmsSortBy") as SortKey;
			return stored || "title"; // Default to title for films page
		}
		return "title";
	});
	
	const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("filmsSortOrder") as SortOrder;
			return stored || "asc"; // Default to asc for films page
		}
		return "asc";
	});
	
	const [groupBy, setGroupBy] = useState<GroupKey>(() => {
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("filmsGroupBy") as GroupKey;
			return stored || "release_year"; // Default to release_year for films page
		}
		return "release_year";
	});
	
	const [filterType, setFilterType] = useState<"none" | "year" | "rank" | "movie" | "search" | "genre">("none");
	const [filterValue, setFilterValue] = useState<string>("all");

	// Apply preset from nav search (?movie=<id>, ?query=, ?genre=, or ?year=)
	useEffect(() => {
		const movieId = searchParams?.get("movie");
		const q = searchParams?.get("query");
		const genre = searchParams?.get("genre");
		const year = searchParams?.get("year");
		if (movieId) {
			setFilterType("movie");
			setFilterValue(String(movieId));
		} else if (year) {
			setFilterType("year");
			setFilterValue(year);
		} else if (genre) {
			setFilterType("genre");
			setFilterValue(genre);
		} else if (q) {
			// Fallback: filter by title contains (temporary approach)
			// We reuse movie filter by picking first matching id when movies load
			const match = movies.find(m => m.title.toLowerCase().includes(q.toLowerCase()));
			if (match) {
				setFilterType("movie");
				setFilterValue(String(match.id));
			}
		}
	}, [searchParams, movies]);

	// Auth modal state
	const [showAuthModal, setShowAuthModal] = useState(false);
	const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
	const [showAddMovieModal, setShowAddMovieModal] = useState(false);
	
	// Save films-specific filter state
	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("filmsSortBy", sortBy);
			localStorage.setItem("filmsSortOrder", sortOrder);
			localStorage.setItem("filmsGroupBy", groupBy);
		}
	}, [sortBy, sortOrder, groupBy]);
	
	// Filter movies based on current filter settings
	const filteredMovies = movies.filter((movie) => {
		if (filterType === "year") {
			return filterValue === "all" || movie.release_year === Number(filterValue);
		}
		if (filterType === "rank") {
			return filterValue === "all" || movie.rankings?.[0]?.ranking === Number(filterValue);
		}
		if (filterType === "movie") {
			return String(movie.id) === filterValue;
		}
		if (filterType === "search") {
			return movie.title.toLowerCase().includes(filterValue.toLowerCase());
		}
		if (filterType === "genre") {
			return filterValue === "all" || (movie.genres ?? []).includes(filterValue);
		}
		return true;
	});
	
	// Group and sort logic for films: use shared util for consistency (supports Year/Ranking/None)
	const groupedMovies = groupMovies(filteredMovies, groupBy, sortBy, sortOrder);
	
	// Generate unique years and ranks for filter dropdowns
	const uniqueYears = Array.from(new Set(movies.map((m) => m.release_year).filter((y): y is number => typeof y === 'number'))).sort((a, b) => b - a);
	const uniqueRanks = Array.from(
		new Set(
			movies
				.map((m) => m.rankings?.[0]?.ranking)
				.filter((rank): rank is number => typeof rank === "number")
		)
	).sort((a, b) => a - b);
	const uniqueGenres = Array.from(
		new Set(movies.flatMap((m) => m.genres ?? []))
	).sort();

	// Auth handlers
	const handleSignupClick = () => {
		setAuthMode("signup");
		setShowAuthModal(true);
	};

	const handleLoginClick = () => {
		setAuthMode("login");
		setShowAuthModal(true);
	};

	const handleAuthSuccess = async () => {
		setShowAuthModal(false);
		// Migration will be handled automatically by the auth migration hook
		// The page will re-render with the updated data
	};

	const handleOpenModal = (movie: Movie) => {
		setSelectedMovie(movie);
		setIsModalOpen(true);
	};

	const handleCloseModal = () => {
		setSelectedMovie(null);
		setIsModalOpen(false);
	};

	const handleModalUpdate = (movieId: number, newRanking: number | null, newSeenIt: boolean) => {
		updateMovieRanking(movieId, { ranking: newRanking, seen_it: newSeenIt });
	};

	if (loading) {
		return <Loader message="Loading films..." />;
	}

	if (isGuest) {
		return null;
	}

	return (
		<div className="max-w-screen-xl">
			{/* Unified Banner System for Guests */}
			{isGuest && (
				<UnifiedBanner 
					onSignupClick={handleSignupClick} 
					onLoginClick={handleLoginClick} 
					excludeBannerTypes={['welcome']}
				/>
			)}

			{/* Films Empty State for Anonymous Users - Shows at top before films */}
			{isGuest && (
				<FilmsEmptyState
					isGuest={isGuest}
					onSignupClick={handleSignupClick}
				/>
			)}

			<MovieFilters
						viewMode={viewMode}
						setViewMode={setViewMode}
						sortBy={sortBy}
						setSortBy={setSortBy}
						sortOrder={sortOrder}
						setSortOrder={setSortOrder}
						groupBy={groupBy}
						setGroupBy={setGroupBy}
						filterType={filterType}
				setFilterType={setFilterType}
				filterValue={filterValue}
				setFilterValue={setFilterValue}
				uniqueYears={uniqueYears}
				uniqueRanks={uniqueRanks}
				uniqueGenres={uniqueGenres}
				localSearchMode={true}
				availableMovies={movies}
				searchContext="films"
				defaults={{
					viewMode: "grid",
					sortBy: "title",
					sortOrder: "asc",
					groupBy: "release_year",
					filterType: "none",
					filterValue: "all"
				}}
			/>
			{filteredMovies.length === 0 && (filterType === "search" || filterType === "movie") ? (
				<div className="mt-8 rounded-xl border border-gray-700 bg-gray-900 p-8 text-center">
					<h3 className="text-xl font-semibold text-white mb-2">No films found</h3>
					<p className="text-sm text-gray-300 mb-2">
						We couldn&apos;t find a film matching your search.
					</p>
					<p className="text-sm text-gray-300 mb-6">
						Use the <span className="font-medium">+</span> next to your profile image to add a movie by TMDB ID.
					</p>
					<button
						onClick={() => setShowAddMovieModal(true)}
						className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
					>
						<Plus className="w-4 h-4" />
						Add movie by TMDB ID
					</button>
				</div>
			) : (
				groupedMovies.map(({ key, movies }: { key: string; movies: import("@/types/types").Movie[] }) => (
					<div key={key} className="mb-10">
						{groupBy !== "none" && (
							<h2
								className="mb-6 text-4xl font-unbounded font-regular text-gray-100 tracking-wider"
							>
								{key}
							</h2>
						)}
						{viewMode === "grid" ? (
							<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
								{movies.map((movie) => {
									const r = movie.rankings?.[0];
									return (
										<MovieCard
											key={movie.id}
											movie={movie}
											variant="large"
											ranking={r?.ranking ?? null}
											seenIt={r?.seen_it ?? false}
											onUpdate={updateMovieRanking}
											onClick={() => handleOpenModal(movie)}
										/>
									);
								})}
							</div>
						) : (
							<div className="flex flex-col">
								{movies.map((movie, index) => {
									const r = movie.rankings?.[0];
									return (
										<MovieCard
											key={movie.id}
											movie={movie}
											variant="compact"
											rank={index + 1}
											ranking={r?.ranking ?? null}
											seenIt={r?.seen_it ?? false}
											showYear
											onUpdate={updateMovieRanking}
											onClick={() => handleOpenModal(movie)}
										/>
									);
								})}
							</div>
						)}
					</div>
				))
			)}

			{/* Movie Detail Modal */}
			{selectedMovie && isModalOpen && (
				<MovieDetailModal
					movie={selectedMovie}
					isOpen={isModalOpen}
					onClose={handleCloseModal}
					onUpdate={handleModalUpdate}
					initialRanking={selectedMovie.rankings?.[0]?.ranking ?? null}
					initialSeenIt={selectedMovie.rankings?.[0]?.seen_it ?? false}
				/>
			)}

			{/* Auth Modal */}
			{showAuthModal && (
				<AuthModalManager
					isOpen={showAuthModal}
					onClose={() => setShowAuthModal(false)}
					initialMode={authMode}
					onAuthSuccess={handleAuthSuccess}
				/>
			)}
			<AddMovieByTmdbModal
				isOpen={showAddMovieModal}
				onClose={() => setShowAddMovieModal(false)}
				onImported={() => {
					setShowAddMovieModal(false);
					router.refresh();
				}}
			/>
		</div>
	);
}

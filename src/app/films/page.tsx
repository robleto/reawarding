"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import MoviePosterCard from "@/components/movie/MoviePosterCard";
import MovieRowCard from "@/components/movie/MovieRowCard";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import MovieFilters from "@/components/filters/MovieFilters";
import UnifiedBanner from "@/components/auth/UnifiedBanner";
import AuthModalManager from "@/components/auth/AuthModalManager";
import FilmsEmptyState from "@/components/films/FilmsEmptyState";
import CollectionCard from "@/components/films/CollectionCard";
import { getFeaturedCollections } from "@/data/filmCollections";
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
	const searchParams = useSearchParams();
	const router = useRouter();
	const { movies, loading, userId, updateMovieRanking, isGuest } = useMovieDataWithGuest();
	
	// Films view toggle: "all" or "collections"
	const [filmsView, setFilmsView] = useState<"all" | "collections">(() => {
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("filmsView") as "all" | "collections" | null;
			return stored || "all";
		}
		return "all";
	});
	
	// Films-specific view mode with grid as default for poster-based display
	const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("filmsViewMode") as "grid" | "list" | null;
			return stored || "grid"; // Default to grid for films
		}
		return "grid";
	});
	
	// Save films view preference
	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("filmsView", filmsView);
		}
	}, [filmsView]);
	
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
	
	const [filterType, setFilterType] = useState<"none" | "year" | "rank" | "movie" | "search">("none");
	const [filterValue, setFilterValue] = useState<string>("all");

	// Apply preset from nav search (?movie=<id> or ?query=)
	useEffect(() => {
		const movieId = searchParams.get("movie");
		const q = searchParams.get("query");
		if (movieId) {
			setFilterType("movie");
			setFilterValue(String(movieId));
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

			{/* View Toggle: All Films vs Collections */}
			<div className="mb-6">
				<div className="inline-flex rounded-lg bg-gray-900/60 border border-gray-700/40 p-1">
					<button
						onClick={() => setFilmsView("all")}
						className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
							filmsView === "all"
								? "bg-gold text-charcoal-900 shadow-lg"
								: "text-gray-300 hover:text-white"
						}`}
					>
						All Films
					</button>
					<button
						onClick={() => setFilmsView("collections")}
						className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
							filmsView === "collections"
								? "bg-gold text-charcoal-900 shadow-lg"
								: "text-gray-300 hover:text-white"
						}`}
					>
						Collections
					</button>
				</div>
			</div>

			{/* Conditionally render based on view */}
			{filmsView === "collections" ? (
				<div>
					<div className="mb-6">
						<h2 className="text-3xl font-bold text-white mb-2 font-unbounded">
							Featured Collections
						</h2>
						<p className="text-gray-400">
							Popular and frequently used film collections
						</p>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
						{getFeaturedCollections().map((collection) => (
							<CollectionCard
								key={collection.slug}
								collection={collection}
								movieCount={collection.tmdbIds.length}
							/>
						))}
					</div>
					<div className="text-center">
						<Link 
							href="/films/collections"
							className="inline-flex items-center gap-2 px-6 py-3 bg-gold/10 hover:bg-gold/20 border border-gold/30 hover:border-gold/50 rounded-lg text-gold font-medium transition-all"
						>
							View All Collections
							<span className="text-sm">→</span>
						</Link>
					</div>
				</div>
			) : (
				<>
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

				{groupedMovies.map(({ key, movies }: { key: string; movies: import("@/types/types").Movie[] }) => (
					<div key={key} className="mb-10">
						{groupBy !== "none" && (
							<h2
								className="mb-6 text-4xl font-unbounded font-regular text-gray-800 dark:text-gray-100 tracking-wider"
							>
								{key}
							</h2>
						)}
						{viewMode === "grid" ? (
							<div className="grid grid-cols-2 gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
								{movies.map((movie) => {
									const r = movie.rankings?.[0];
									return (
										<MoviePosterCard
											key={movie.id}
											movie={movie}
											currentUserId={userId ?? ""}
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
										<MovieRowCard
											key={movie.id}
											movie={movie}
											currentUserId={userId ?? ""}
											ranking={r?.ranking ?? null}
											seenIt={r?.seen_it ?? false}
											isLast={index === movies.length - 1}
											onUpdate={updateMovieRanking}
											onClick={() => handleOpenModal(movie)}
											index={index}
										/>
									);
								})}
							</div>
						)}
					</div>
				))}
				</>
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
		</div>
	);
}

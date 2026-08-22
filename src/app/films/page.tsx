"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import MovieCard from "@/components/award/MovieCard";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import MovieFilters from "@/components/filters/MovieFilters";
import UnifiedBanner from "@/components/auth/UnifiedBanner";
import AuthModalManager from "@/components/auth/AuthModalManager";
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

// Progressive rendering — the catalog exceeds 1,000 cards, which locks up
// mobile browsers if mounted all at once (same fix as the rankings page).
const INITIAL_VISIBLE_ROWS = 60;
const VISIBLE_ROWS_BATCH = 120;

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
	const { movies, loading, updateMovieRanking, isGuest } = useMovieDataWithGuest();

	const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("filmsViewMode") as "grid" | "list" | null;
			return stored || "grid"; // Default to grid for films
		}
		return "grid";
	});

	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("filmsViewMode", viewMode);
		}
	}, [viewMode]);

	const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);

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

	// My Films / All Films toggle — lives outside the filter box. Defaults to
	// "mine" (seen_it films only); "all" shows the entire catalog.
	const [showMine, setShowMine] = useState<boolean>(() => {
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("filmsShowMine");
			return stored === null ? true : stored === "true";
		}
		return true;
	});

	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("filmsShowMine", String(showMine));
		}
	}, [showMine]);

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
			// Show every title match (not just the first), and let the empty
			// state's add-film CTA handle a miss.
			setFilterType("search");
			setFilterValue(q);
		}
	}, [searchParams, movies]);

	// Auth modal state
	const [showAuthModal, setShowAuthModal] = useState(false);
	const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
	const [showAddMovieModal, setShowAddMovieModal] = useState(false);

	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("filmsSortBy", sortBy);
			localStorage.setItem("filmsSortOrder", sortOrder);
			localStorage.setItem("filmsGroupBy", groupBy);
		}
	}, [sortBy, sortOrder, groupBy]);

	const myFilmsCount = movies.filter((m) => m.rankings?.[0]?.seen_it).length;

	// Filter movies based on current filter settings
	const filteredMovies = movies.filter((movie) => {
		// A search or direct movie link is explicit intent — don't hide the
		// result behind the My Films toggle.
		if (showMine && filterType !== "search" && filterType !== "movie" && !movie.rankings?.[0]?.seen_it) {
			return false;
		}
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

	// ── Progressive rendering window (mirrors the rankings page) ──
	const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ROWS);
	const sentinelRef = useRef<HTMLDivElement | null>(null);
	const hasMoreRows = filteredMovies.length > visibleCount;

	useEffect(() => {
		setVisibleCount(INITIAL_VISIBLE_ROWS);
	}, [filterType, filterValue, sortBy, sortOrder, groupBy, showMine]);

	useEffect(() => {
		const node = sentinelRef.current;
		if (!node || !hasMoreRows) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					setVisibleCount((count) => count + VISIBLE_ROWS_BATCH);
				}
			},
			{ rootMargin: "1600px 0px" }
		);
		observer.observe(node);
		return () => observer.disconnect();
	}, [hasMoreRows, visibleCount]);

	// Cap rendered cards at visibleCount across groups, preserving group order.
	let rowsLeft = visibleCount;
	const visibleGroupedMovies: { key: string; movies: Movie[] }[] = [];
	for (const group of groupedMovies) {
		if (rowsLeft <= 0) break;
		const slice = group.movies.slice(0, rowsLeft);
		visibleGroupedMovies.push({ key: group.key, movies: slice });
		rowsLeft -= slice.length;
	}

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

	const handleModalUpdate = (movieId: string, newRanking: number | null, newSeenIt: boolean) => {
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

			<div className="flex items-center justify-between gap-4 mb-2">
				<h1 className="text-2xl font-bold text-white font-unbounded">
					{showMine ? "My films" : "All films"}
				</h1>
			</div>

			<div className="mb-4 inline-flex self-start rounded-full border border-white/10 bg-white/5 p-0.5">
				{([true, false] as const).map((mine) => (
					<button
						key={String(mine)}
						type="button"
						onClick={() => setShowMine(mine)}
						className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
							showMine === mine
								? "bg-gold-500 text-black"
								: "text-gray-400 hover:text-gray-300"
						}`}
					>
						{mine ? "My Films" : "All Films"}
						<span className={`ml-1 font-mono ${showMine === mine ? "text-black/60" : "text-gray-500"}`}>
							({mine ? myFilmsCount : movies.length})
						</span>
					</button>
				))}
			</div>

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
			) : filteredMovies.length === 0 && showMine ? (
				<div className="mt-8 rounded-xl border border-gray-700 bg-gray-900 p-8 text-center">
					<h3 className="text-xl font-semibold text-white mb-2">No films watched yet</h3>
					<p className="text-sm text-gray-300 mb-6">
						Mark films as seen to see them here, or switch to All Films to browse the catalog.
					</p>
					<button
						onClick={() => setShowMine(false)}
						className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
					>
						Show All Films
					</button>
				</div>
			) : (
				<>
				{visibleGroupedMovies.map(({ key, movies }: { key: string; movies: Movie[] }) => (
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
				))}

				{/* Sentinel — extends the render window before the user reaches
				    the bottom. Renders only while rows remain. */}
				{hasMoreRows && <div ref={sentinelRef} aria-hidden="true" className="h-12" />}
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

"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Library, Plus } from "lucide-react";
import MovieCard from "@/components/award/MovieCard";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import MovieFilters from "@/components/filters/MovieFilters";
import MuseumYearTimeline from "@/components/home/MuseumYearTimeline";
import FeaturedCollectionsSection from "@/components/home/FeaturedCollectionsSection";
import RecognitionFeed from "@/components/home/RecognitionFeed";
import WatchlistMovieRow from "@/components/home/WatchlistMovieRow";
import { useRecognitionFeed } from "@/hooks/useRecognitionFeed";
import UnifiedBanner from "@/components/auth/UnifiedBanner";
import AuthModalManager from "@/components/auth/AuthModalManager";
import AddMovieByTmdbModal from "@/components/movie/AddMovieByTmdbModal";
import { useAuthState } from "@/hooks/useAuthState";
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
	const { movies, loading, userId, updateMovieRanking, isGuest } = useMovieDataWithGuest();
	const { user } = useAuthState();

	// Discovery rows (ported from Home — explore/awards-as-home moved
	// discovery off Home now that Home is the awards archive).
	const userMovieIds = useMemo(
		() => new Set(movies.filter((m) => m.rankings.length > 0).map((m) => m.id)),
		[movies]
	);
	const { rows: feedRows, loading: feedLoading } = useRecognitionFeed(userMovieIds);

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

	// Search-first surface: the full catalog is opt-in. Until the user searches,
	// filters, or asks to browse everything, show curated shelves instead.
	const isFiltering =
		filterType === "movie" || filterType === "search"
			? true
			: filterType !== "none" && filterValue !== "all";
	const [browseAll, setBrowseAll] = useState(false);
	const showCatalog = isFiltering || browseAll;

	const recentlyAdded = [...movies]
		.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
		.slice(0, 12);

	// ── Progressive rendering window (mirrors the rankings page) ──
	const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ROWS);
	const sentinelRef = useRef<HTMLDivElement | null>(null);
	const hasMoreRows = showCatalog && filteredMovies.length > visibleCount;

	useEffect(() => {
		setVisibleCount(INITIAL_VISIBLE_ROWS);
	}, [browseAll, filterType, filterValue, sortBy, sortOrder, groupBy]);

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

	// Year-jump timeline (reuses the Awards page's MuseumYearTimeline) — lets
	// the user jump straight to a year's films instead of scrolling past every
	// other year to find it. Counts are total films in the catalog per year,
	// not nominee counts, so the "/10" nominee suffix is suppressed.
	const yearTimelineEntries = useMemo(() => {
		const counts = new Map<number, number>();
		for (const m of movies) {
			if (typeof m.release_year === "number") {
				counts.set(m.release_year, (counts.get(m.release_year) ?? 0) + 1);
			}
		}
		return uniqueYears.map((year) => ({ year, nomineeCount: counts.get(year) ?? 0 }));
	}, [movies, uniqueYears]);
	const activeTimelineYear =
		filterType === "year" && filterValue !== "all" ? Number(filterValue) : NaN;
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

			{groupBy === "release_year" && yearTimelineEntries.length > 1 && (
				<div className="mt-4 mb-2">
					<div className="flex items-center justify-between mb-1 px-2">
						<span className="text-xs uppercase tracking-wider text-gray-500">Jump to a year</span>
						{filterType === "year" && filterValue !== "all" && (
							<button
								onClick={() => {
									setFilterType("none");
									setFilterValue("all");
									setBrowseAll(true);
								}}
								className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
							>
								Show all years
							</button>
						)}
					</div>
					<MuseumYearTimeline
						years={yearTimelineEntries}
						activeYear={activeTimelineYear}
						subLabelSuffix=""
						onSelectYear={(year) => {
							if (filterType === "year" && Number(filterValue) === year) {
								setFilterType("none");
								setFilterValue("all");
							} else {
								setFilterType("year");
								setFilterValue(String(year));
							}
							setBrowseAll(true);
						}}
					/>
				</div>
			)}

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
			) : !showCatalog ? (
				<>
					{/* Overview — search above is the primary finder; these shelves are
					    for wandering. The full catalog is one tap below. */}
					<section className="mb-10">
						<div className="flex items-center justify-between mb-4 px-2">
							<div>
								<h2 className="text-xl font-bold text-white">Recently added</h2>
								<p className="text-sm text-gray-400">The newest films in the library</p>
							</div>
						</div>
						<div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
							{recentlyAdded.map((movie) => {
								const r = movie.rankings?.[0];
								return (
									<div key={movie.id} className="flex-shrink-0 w-[140px] sm:w-[160px] snap-start">
										<MovieCard
											movie={movie}
											variant="grid"
											ranking={r?.ranking ?? null}
											seenIt={r?.seen_it ?? false}
											onUpdate={updateMovieRanking}
											onClick={() => handleOpenModal(movie)}
										/>
									</div>
								);
							})}
						</div>
					</section>

					<FeaturedCollectionsSection
						movies={movies}
						userId={userId}
						updateMovieRanking={updateMovieRanking}
						setSelectedMovie={handleOpenModal}
					/>

					<WatchlistMovieRow userId={userId} username={user?.user_metadata?.username ?? null} />

					{(feedLoading || feedRows.length > 0) && (
						<section className="mb-10">
							<RecognitionFeed
								rows={feedRows}
								loading={feedLoading}
								onSelectMovie={handleOpenModal}
								onUpdate={updateMovieRanking}
								currentUserId={userId}
							/>
						</section>
					)}

					<div className="mt-10 border-t border-gray-700/60 pt-6">
						<button
							onClick={() => setBrowseAll(true)}
							className="w-full flex items-center justify-between rounded-xl border border-gray-700 bg-gray-900/40 px-5 py-4 hover:bg-gray-800/50 transition-colors"
						>
							<span className="flex items-center gap-2.5 font-medium text-gray-200">
								<Library className="w-4 h-4 text-gray-400" />
								Browse the full library
							</span>
							<span className="flex items-center gap-1.5 font-mono text-xs text-gray-500">
								{movies.length} films
								<ChevronRight className="w-4 h-4" />
							</span>
						</button>
						<Link
							href="/films/collections"
							className="mt-3 block text-center text-sm text-gold-500 hover:text-yellow-400 transition-colors"
						>
							All collections
						</Link>
					</div>
				</>
			) : (
				<>
				{browseAll && !isFiltering && (
					<button
						onClick={() => setBrowseAll(false)}
						className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
					>
						<ChevronLeft className="w-4 h-4" />
						Back to overview
					</button>
				)}
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

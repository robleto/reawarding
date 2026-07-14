"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Film, Trophy, Flame, TrendingUp, TrendingDown, Star, Bookmark } from "lucide-react";
import { shimmer, toBase64 } from "@/utils/imagePlaceholders";
import { getRatingStyle } from "@/utils/getRatingStyle";
import type { Movie } from "@/types/types";
import { normalizeImageUrl } from "@/utils/imageUrl";
import RatingModal from "@/components/movie/RatingModal";
import SeenItButton from "@/components/movie/SeenItButton";
import RankingDropdown from "@/components/movie/RankingDropdown";
import { useWatchlistContext } from "@/contexts/WatchlistContext";

/**
 * Unified MovieCard for the entire app.
 *
 * Variants:
 *  - "featured"  → Large poster hero card (winner display)
 *  - "grid"      → Poster card with rank/rating overlays (nominees, rankings, films)
 *  - "compact"   → Horizontal row with thumb, title, rating (mobile, lists)
 *
 * Interactive mode:
 *  When `onUpdate` is provided, the card shows interactive controls
 *  (SeenIt button, Rating modal/dropdown) on hover (grid) or inline (compact).
 */

export type MovieCardVariant = "featured" | "grid" | "compact" | "large";

export interface MovieCardProps {
	movie: Movie;
	variant?: MovieCardVariant;
	/** 1-based rank number shown on grid & compact variants */
	rank?: number;
	/** Highlight as winner (trophy badge + accent border) */
	isWinner?: boolean;
	onClick?: () => void;

	/* ── Interactive features (all optional) ── */

	/** When provided, enables interactive controls (SeenIt, Rating) */
	onUpdate?: (movieId: string, updates: { seen_it?: boolean; ranking?: number | null }) => void;
	/** Explicit ranking value — overrides movie.rankings[0].ranking */
	ranking?: number | null;
	/** Seen-it state */
	seenIt?: boolean;
	/** Rating sub-label (variance, hot-take text) */
	ratingLabel?: string | null;
	/** Show hot-take indicator instead of SeenIt (compact variant) */
	showHotTake?: boolean;
	/** Grid: hide SeenIt, rating is sole prominent action with title overlay */
	ratingOnly?: boolean;
	/** Optional slot rendered beside rating in grid overlay */
	footerAction?: React.ReactNode;
	/** Show year beneath title in compact variant */
	showYear?: boolean;
	/** Subtle visual treatment for seen-but-unrated items */
	incomplete?: boolean;
	/** Grid: called when the user taps the watchlist bookmark. Only shown when unseen + not winner. */
	onWatchlist?: (movieId: string) => void;
	/** Grid: whether the film is already on the watchlist (fills the bookmark icon) */
	isOnWatchlist?: boolean;
}

/* ── Shared helpers ── */

const resolveImage = (movie: Movie, prefer: "poster" | "thumb") => {
	const poster = normalizeImageUrl(movie.poster_url || movie.thumb_url);
	const thumb = normalizeImageUrl(movie.thumb_url || movie.poster_url);
	const src = prefer === "poster" ? (poster || thumb) : (thumb || poster);
	if (!src || src.trim() === "" || src.includes("placeholder")) return null;
	if (src.startsWith("http://") || src.startsWith("https://") || (src.startsWith("/") && src.length > 1)) return src;
	return null;
};

const RatingBadge = ({ rating, className = "" }: { rating: number; className?: string }) => {
	const { text, background } = getRatingStyle(rating);
	if (rating <= 0) return null;
	return (
		<span
			className={`inline-flex items-center font-mono font-bold tabular-nums rounded-md shadow-sm ${className}`}
			style={{ backgroundColor: background, color: text }}
		>
			{rating}
		</span>
	);
};

const PosterFallback = ({ title }: { title: string }) => (
	<div className="flex items-center justify-center w-full h-full bg-gray-800">
		<div className="text-center px-4 text-gray-500">
			<Film className="w-8 h-8 mx-auto mb-1" />
			<span className="text-xs font-medium leading-tight line-clamp-2">{title}</span>
		</div>
	</div>
);

/* ── Variance pill for rating labels ── */
function VariancePill({ label }: { label: string }) {
	const parsed = Number(label.trim());
	if (!Number.isFinite(parsed) || parsed === 0) {
		return <span className="text-[9px] leading-tight text-gray-300">{label}</span>;
	}
	const positive = parsed > 0;
	return (
		<span
			className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[9px] font-semibold leading-tight ${
				positive
					? "bg-green-500/20 text-green-300 border border-green-500/30"
					: "bg-red-500/20 text-red-300 border border-red-500/30"
			}`}
		>
			{positive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
			<span>{label}</span>
		</span>
	);
}

/* ═══════════════════════════════════════════════════════
   FEATURED VARIANT — Large poster hero (winner display)
   ═══════════════════════════════════════════════════════ */

function FeaturedCard({ movie, rating, posterSrc, onClick }: { movie: Movie; rating: number; posterSrc: string | null; onClick?: () => void }) {
	return (
		<article
			className={`text-left ${onClick ? "cursor-pointer" : ""}`}
			onClick={onClick}
		>
			<div className="relative w-full aspect-[2/3] mx-auto rounded-xl overflow-hidden shadow-lg bg-gray-800">
				{posterSrc ? (
					<Image
						src={posterSrc}
						alt={movie.title}
						fill
						className="object-cover"
						sizes="(max-width: 768px) 100vw, 280px"
						priority
						onError={(e) => {
							const container = e.currentTarget.parentElement;
							if (container) {
								container.style.display = "none";
								const fallback = container.nextElementSibling as HTMLElement;
								if (fallback) fallback.style.display = "block";
							}
						}}
					/>
				) : (
					<PosterFallback title={movie.title} />
				)}
				<RatingBadge rating={rating} className="absolute bottom-2.5 right-2.5 text-sm px-2 py-1" />
				<div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-always-black/60 to-transparent pointer-events-none" />
			</div>
			<h4 className="mt-3 text-xl font-semibold text-white">
				{movie.title}
			</h4>
		</article>
	);
}

/* ═══════════════════════════════════════════════════════
   GRID VARIANT — Poster card (nominees, rankings, films)
   ═══════════════════════════════════════════════════════ */

interface GridCardProps {
	movie: Movie;
	rating: number;
	posterSrc: string | null;
	rank?: number;
	isWinner?: boolean;
	onClick?: () => void;
	// interactive
	interactive: boolean;
	onUpdate?: (movieId: string, updates: { seen_it?: boolean; ranking?: number | null }) => void;
	seenIt?: boolean;
	ratingLabel?: string | null;
	ratingOnly?: boolean;
	footerAction?: React.ReactNode;
	onWatchlist?: (movieId: string) => void;
	isOnWatchlist?: boolean;
}

function GridCard({ movie, rating, posterSrc, rank, isWinner, onClick, interactive, onUpdate, seenIt, ratingLabel, ratingOnly, footerAction, onWatchlist, isOnWatchlist }: GridCardProps) {
	const [showRatingModal, setShowRatingModal] = useState(false);
	const style = getRatingStyle(rating);
	const { removeIfWatched } = useWatchlistContext();

	const handleClick = (e: React.MouseEvent) => {
		if (interactive && e.target instanceof HTMLElement) {
			const isOverlay = e.target.closest(".movie-card-overlay");
			if (isOverlay) return;
		}
		onClick?.();
	};

	return (
		<>
			<div
				className={`group relative text-left rounded-lg border transition-colors overflow-hidden w-full flex flex-col ${
					isWinner
						? "border-gold-500/40 bg-gold-500/5 hover:bg-gold-500/10"
						: "border-gray-700/30 bg-charcoal-900/30 hover:bg-gray-800/60"
				} ${onClick || interactive ? "cursor-pointer" : ""}`}
				onClick={handleClick}
			>
				<div className="relative w-full aspect-[2/3] overflow-hidden bg-gray-800">
					{posterSrc ? (
						<Image
							src={posterSrc}
							alt={movie.title}
							width={210}
							height={325}
							className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
							sizes="(max-width: 640px) 160px, 210px"
							placeholder="blur"
							blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(210, 325))}`}
						/>
					) : (
						<PosterFallback title={movie.title} />
					)}
					{/* Rank badge — top-left */}
					{rank != null && (
						<span className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center rounded-full bg-always-black/65 backdrop-blur-sm text-[10px] font-mono font-bold text-always-white tabular-nums leading-none">
							{rank}
						</span>
					)}
					{/* Winner badge — top-right */}
					{isWinner && (
						<span className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full bg-always-black/65 backdrop-blur-sm">
							<Trophy className="w-3.5 h-3.5 text-gold-400" />
						</span>
					)}

					{/* ── Interactive overlay: always visible on mobile, hover-only on sm+ ── */}
					{interactive ? (
						<div
							className="movie-card-overlay absolute rounded-b-lg left-0 right-0 bottom-0 flex flex-col justify-end w-full z-20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200"
							style={{ minHeight: ratingOnly ? "38%" : "25%", background: "linear-gradient(to top, rgba(24,24,27,0.92) 80%, rgba(24,24,27,0.0) 100%)" }}
							onClick={(e) => e.stopPropagation()}
						>
							{ratingOnly ? (
								<div className="flex flex-col gap-1 px-2 py-2 w-full">
									<div className="flex items-center gap-1.5">
										<button
											type="button"
											onClick={() => setShowRatingModal(true)}
											className={`font-bold px-1.5 py-2 rounded-md border transition-colors active:scale-95 ${
												rating
													? "text-xs min-w-[28px] border-gray-700/60"
													: "text-xs min-w-[40px] border-gray-600/40 hover:border-gray-500/60 hover:brightness-125"
											}`}
											style={rating
												? { backgroundColor: style.background, color: style.text }
												: { backgroundColor: "rgba(55,55,60,0.7)", color: "#9ca3af" }
											}
										>
											{rating || "Rate"}
										</button>
										{ratingLabel && <VariancePill label={ratingLabel} />}
										{footerAction}
									</div>
									<p className="text-xs font-semibold text-always-white leading-tight line-clamp-2">
										{movie.title}
									</p>
								</div>
							) : (
								<div className="flex items-center rounded-b-lg w-full px-3 py-2 gap-2 justify-between">
									<SeenItButton
										seenIt={seenIt ?? false}
										onClick={() => {
											const newSeenIt = !(seenIt ?? false);
											onUpdate?.(movie.id, { seen_it: newSeenIt });
											if (newSeenIt) removeIfWatched(movie.id).catch(() => {});
										}}
									/>
									<div className="flex flex-col items-center">
										<button
											type="button"
											onClick={() => setShowRatingModal(true)}
											className={`font-bold px-2 py-1 min-h-[44px] rounded-lg border transition-colors active:scale-95 ${
												rating
													? "text-sm min-w-[44px] border-gray-700"
													: "text-xs min-w-[48px] border-gray-600/50 hover:border-gray-500/70 hover:brightness-125"
											}`}
											style={rating
												? { backgroundColor: style.background, color: style.text }
												: { backgroundColor: "rgba(55,55,60,0.7)", color: "#9ca3af" }
											}
										>
											{rating || "Rate"}
										</button>
										{ratingLabel && (
											<span className="mt-0.5"><VariancePill label={ratingLabel} /></span>
										)}
									</div>
								</div>
							)}
						</div>
					) : (
						<>
							{/* Display-only rating badge */}
							<RatingBadge rating={rating} className="absolute bottom-2 right-2 text-sm px-2 py-0.5" />
							<div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-always-black/70 to-transparent pointer-events-none" />
						</>
					)}
				</div>
				{/* Title beneath poster (only when NOT in ratingOnly mode, which shows title in overlay) */}
				{!ratingOnly && (
					<div className="px-2.5 py-2">
						<p className="text-xs font-medium text-always-white leading-snug line-clamp-2">
							{movie.title}
						</p>
					</div>
				)}
			</div>

			{/* Rating Modal */}
			{interactive && (
				<RatingModal
					isOpen={showRatingModal}
					movieTitle={movie.title}
					posterUrl={movie.poster_url}
					currentRating={rating || null}
					movieId={movie.id}
					onRate={(value) => onUpdate?.(movie.id, { ranking: value })}
					onClose={() => setShowRatingModal(false)}
				/>
			)}
		</>
	);
}

/* ═══════════════════════════════════════════════════════
   COMPACT VARIANT — Row card (mobile, lists, dense views)
   ═══════════════════════════════════════════════════════ */

interface CompactCardProps {
	movie: Movie;
	rating: number;
	thumbSrc: string | null;
	rank?: number;
	isWinner?: boolean;
	onClick?: () => void;
	showYear?: boolean;
	// interactive
	interactive: boolean;
	onUpdate?: (movieId: string, updates: { seen_it?: boolean; ranking?: number | null }) => void;
	seenIt?: boolean;
	ratingLabel?: string | null;
	showHotTake?: boolean;
	incomplete?: boolean;
}

function CompactCard({ movie, rating, thumbSrc, rank, isWinner, onClick, showYear, interactive, onUpdate, seenIt, ratingLabel, showHotTake, incomplete }: CompactCardProps) {
	// Hot-take calculation
	const myRating = rating;
	const imdbRating = movie.imdb_rating || 0;
	const metacriticRating = movie.metacritic_score ? movie.metacritic_score / 10 : 0;
	const criticsRating = imdbRating > 0 ? imdbRating : metacriticRating;
	const disparity = myRating - criticsRating;
	const showHotTakeIndicator = showHotTake && criticsRating > 0 && Math.abs(disparity) >= 2;

	const handleClick = (e: React.MouseEvent) => {
		if (interactive && e.target instanceof HTMLElement) {
			const isInteractive = e.target.closest("button, select, input, a");
			if (isInteractive) return;
		}
		onClick?.();
	};

	const { removeIfWatched } = useWatchlistContext();

	const handleRatingSelect = (newRating: number | null) => {
		onUpdate?.(movie.id, { ranking: newRating });
	};

	const toggleSeenIt = () => {
		const newSeenIt = !(seenIt ?? false);
		onUpdate?.(movie.id, { seen_it: newSeenIt });
		if (newSeenIt) removeIfWatched(movie.id).catch(() => {});
	};

	if (!interactive) {
		// Display-only compact card — same row anatomy as the interactive
		// variant (rank slot, fixed thumb box, clamped title, rating chip on
		// the right) so ballot and ranking lists read identically; the only
		// difference is the absence of edit controls. Spacing is left to the
		// parent container.
		return (
			<button
				type="button"
				onClick={onClick}
				className={`w-full px-1 py-1 md:px-2 md:py-2 text-left rounded-xl border transition-colors shadow-sm ${
					isWinner
						? "border-gold-500/40 bg-gold-500/5 hover:bg-gold-500/10"
						: "border-gray-700/50 bg-gray-900/60 hover:bg-gray-800/80"
				}`}
			>
				<div className="flex items-center gap-1 min-h-[72px]">
					{typeof rank === "number" && (
						<div className="w-5 flex items-center justify-end text-xs font-mono font-bold text-gray-400 tabular-nums select-none pr-1">
							{rank}
						</div>
					)}
					<div className="flex-shrink-0">
						{thumbSrc ? (
							<Image
								src={thumbSrc}
								alt=""
								width={48}
								height={72}
								className="w-12 h-[72px] rounded-md shadow-md object-cover"
								sizes="48px"
								placeholder="blur"
								blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(48, 72))}`}
							/>
						) : (
							<div className="flex items-center justify-center bg-gray-800 rounded-md" style={{ width: 48, height: 72 }}>
								<Film className="w-4 h-4 text-gray-600" />
							</div>
						)}
					</div>
					<div className="flex-1 min-w-0 flex items-center justify-between">
						<div className="flex-1 min-w-0 px-2">
							<h3 className="text-sm font-semibold text-white leading-tight line-clamp-2 break-words">{movie.title}</h3>
							{showYear && <p className="text-xs text-gray-400">{movie.release_year}</p>}
						</div>
						<div className="flex items-center gap-2 ml-2 pr-1">
							{isWinner && <Trophy className="w-3.5 h-3.5 text-gold-400 flex-shrink-0" />}
							<div className="flex flex-col items-center">
								{/* Same 44px scale as the interactive rows' RankingDropdown chip */}
							<RatingBadge rating={rating} className="min-w-[44px] min-h-[44px] justify-center text-base" />
								{ratingLabel && (
									<span className="mt-0.5 text-xs leading-tight text-gray-400">{ratingLabel}</span>
								)}
							</div>
						</div>
					</div>
				</div>
			</button>
		);
	}

	// Interactive compact card — matches MovieRowCard behavior
	return (
		<div
			className={`px-1 py-1 md:px-2 md:py-2 mb-2 md:mb-2 rounded-xl border transition duration-200 shadow-sm ${
				incomplete
					? "border-gray-600/50 bg-gray-900/45 hover:bg-gray-800/70"
					: "border-gray-700/50 bg-gray-900/60 hover:bg-gray-800/80"
			} ${
				onClick ? "cursor-pointer" : ""
			}`}
			onClick={handleClick}
			style={{ boxShadow: "0 2px 8px 0 rgba(0,0,0,0.10)" }}
		>
			{/* Desktop Layout */}
			<div className="hidden md:flex items-center justify-between gap-2">
				{thumbSrc ? (
					<Image
						src={thumbSrc}
						alt={movie.title}
						width={48}
						height={72}
						className="w-12 h-[72px] rounded-md shadow-md object-cover"
						sizes="48px"
						placeholder="blur"
						blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(48, 72))}`}
					/>
				) : (
					<div className="flex items-center justify-center bg-gray-800 rounded-md" style={{ width: 48, height: 72 }}>
						<Film className="w-4 h-4 text-gray-600" />
					</div>
				)}
				<div className="flex-1 min-w-0">
					<h3 className="text-base font-semibold text-white leading-snug truncate">{movie.title}</h3>
					{showYear && <p className="text-sm text-gray-400">{movie.release_year}</p>}
					{incomplete && <p className="text-xs text-gray-500">Seen, not rated yet</p>}
				</div>
				<div className="flex items-center gap-2">
					{showHotTakeIndicator ? (
						<div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold ${
							disparity > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
						}`}>
							<Flame className="w-3 h-3" />
							{disparity > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
							<span>{disparity > 0 ? "+" : ""}{Math.abs(disparity).toFixed(1)}</span>
						</div>
					) : (
						<>
							<SeenItButton
								seenIt={seenIt ?? false}
								onClick={toggleSeenIt}
								showText={true}
								size="md"
								className="hidden lg:inline-flex px-2 py-1 rounded-lg transition-colors bg-opacity-10 hover:bg-opacity-20"
							/>
							<SeenItButton
								seenIt={seenIt ?? false}
								onClick={toggleSeenIt}
								showText={false}
								size="md"
								variant="compact"
								className="lg:hidden"
							/>
						</>
					)}
					<div className="flex flex-col items-center">
						<RankingDropdown ranking={rating || null} onChange={handleRatingSelect} />
						{ratingLabel && (
							<span className="mt-0.5 text-xs leading-tight text-gray-400">{ratingLabel}</span>
						)}
					</div>
				</div>
			</div>

			{/* Mobile Layout */}
			<div className="md:hidden">
				<div className="flex items-center gap-1 min-h-[72px]">
					{typeof rank === "number" && (
						<div className="w-5 flex items-center justify-end text-xs font-bold text-gray-400 select-none pr-1">
							{rank}
						</div>
					)}
					<div className="flex-shrink-0">
						{thumbSrc ? (
							<Image
								src={thumbSrc}
								alt={movie.title}
								width={48}
								height={72}
								className="w-12 h-[72px] rounded-md shadow-md object-cover"
								sizes="48px"
								placeholder="blur"
								blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(48, 72))}`}
							/>
						) : (
							<div className="flex items-center justify-center bg-gray-800 rounded-md" style={{ width: 48, height: 72 }}>
								<Film className="w-4 h-4 text-gray-600" />
							</div>
						)}
					</div>
					<div className="flex-1 min-w-0 flex items-center justify-between">
						<div className="flex-1 min-w-0">
							<h3 className="text-sm font-semibold text-white leading-tight line-clamp-2 break-words">{movie.title}</h3>
							{showYear && <p className="text-xs text-gray-400">{movie.release_year}</p>}
							{incomplete && <p className="text-xs text-gray-500">Seen, not rated yet</p>}
						</div>
						<div className="flex items-center gap-2 ml-2">
							<SeenItButton
								seenIt={seenIt ?? false}
								onClick={toggleSeenIt}
								showText={false}
								size="sm"
								variant="compact"
							/>
							<div className="flex flex-col items-center">
								<RankingDropdown ranking={rating || null} onChange={handleRatingSelect} />
								{ratingLabel && (
									<span className="mt-0.5 text-xs leading-tight text-gray-400">{ratingLabel}</span>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

/* ═══════════════════════════════════════════════════════
   LARGE VARIANT — Full-size poster card (lists, discovery)
   Larger than grid; title + year below poster; bookmark
   upper-right; seen/rate overlay lower-left/right.
   ═══════════════════════════════════════════════════════ */

interface LargeCardProps {
	movie: Movie;
	rating: number;
	posterSrc: string | null;
	rank?: number;
	isWinner?: boolean;
	onClick?: () => void;
	// interactive
	interactive: boolean;
	onUpdate?: (movieId: string, updates: { seen_it?: boolean; ranking?: number | null }) => void;
	seenIt?: boolean;
}

function LargeCard({ movie, rating, posterSrc, rank, isWinner, onClick, interactive, onUpdate, seenIt }: LargeCardProps) {
	const [showRatingModal, setShowRatingModal] = useState(false);
	const style = getRatingStyle(rating);
	const { watchlistMovieIds, toggle: toggleWatchlist, removeIfWatched } = useWatchlistContext();
	const isOnWatchlist = watchlistMovieIds.has(movie.id);

	const handleClick = (e: React.MouseEvent) => {
		if (interactive && e.target instanceof HTMLElement) {
			const isOverlay = e.target.closest(".movie-card-overlay");
			if (isOverlay) return;
		}
		onClick?.();
	};

	return (
		<>
			<div
				className={`group relative text-left rounded-xl border transition-colors overflow-hidden w-full flex flex-col ${
					isWinner
						? "border-gold-500/40 bg-gold-500/5 hover:bg-gold-500/10"
						: "border-gray-700/50 bg-charcoal-900/40 hover:bg-gray-800/60"
				} ${onClick || interactive ? "cursor-pointer" : ""}`}
				onClick={handleClick}
			>
				{/* ── Poster ── */}
				<div className="relative w-full aspect-[2/3] overflow-hidden bg-gray-800">
					{posterSrc ? (
						<Image
							src={posterSrc}
							alt={movie.title}
							fill
							className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
							sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
							placeholder="blur"
							blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(300, 450))}`}
						/>
					) : (
						<PosterFallback title={movie.title} />
					)}

					{/* Rank badge — top-left */}
					{rank != null && (
						<span className="absolute top-2 left-2 min-w-[26px] h-[26px] flex items-center justify-center rounded-md bg-always-black/70 backdrop-blur-sm text-xs font-mono font-bold text-always-white tabular-nums leading-none px-1.5">
							{rank}
						</span>
					)}

					{/* Winner badge — top-left (if no rank) */}
					{isWinner && rank == null && (
						<span className="absolute top-2 left-2 flex items-center justify-center w-7 h-7 rounded-md bg-always-black/70 backdrop-blur-sm">
							<Trophy className="w-4 h-4 text-gold-400" />
						</span>
					)}

					{/* Bookmark — top-right, icon-only, hover-only (always present via context) */}
					<button
						type="button"
						onClick={(e) => { e.stopPropagation(); toggleWatchlist(movie.id); }}
						className={`movie-card-overlay absolute top-2 right-2 flex items-center justify-center w-8 h-8 rounded-md bg-always-black/70 backdrop-blur-sm transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-always-black/85 ${
							isOnWatchlist ? "text-amber-400" : "text-always-white/80 hover:text-amber-300"
						}`}
						title={isOnWatchlist ? "Remove from watchlist" : "Add to watchlist"}
					>
						<Bookmark className={`w-4 h-4 ${isOnWatchlist ? "fill-current" : ""}`} />
					</button>

					{/* Rating badge (display-only mode) */}
					{!interactive && (
						<>
							<RatingBadge rating={rating} className="absolute bottom-2 right-2 text-sm px-2 py-0.5" />
							<div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-always-black/70 to-transparent pointer-events-none" />
						</>
					)}

					{/* ── Interactive overlay: always visible on mobile, hover-only on sm+ ── */}
					{interactive && (
						<div
							className="movie-card-overlay absolute left-0 right-0 bottom-0 flex items-end justify-between px-2.5 py-2 z-20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200"
							style={{ background: "linear-gradient(to top, rgba(18,18,20,0.70) 55%, rgba(18,18,20,0.0) 100%)", minHeight: "30%" }}
							onClick={(e) => e.stopPropagation()}
						>
							{/* Left: Seen / Unseen (3-state when watchlist is wired) */}
							<SeenItButton
								seenIt={seenIt ?? false}
								onClick={() => {
									const newSeenIt = !(seenIt ?? false);
									onUpdate?.(movie.id, { seen_it: newSeenIt });
									if (newSeenIt) removeIfWatched(movie.id).catch(() => {});
								}}
								showText={true}
								size="sm"
								className="h-9 px-2.5 rounded-lg border border-always-white/20 bg-always-black/40 hover:bg-always-black/60 text-xs font-semibold gap-1"
							/>

							{/* Right: Rate
							    When the film is seen-but-unrated, the badge takes on an
							    invitational yellow tint to cue the next action. Once rated,
							    it switches to the rating color block. Unseen/unrated stays
							    neutral so we don't shout at films the user hasn't watched. */}
							<button
								type="button"
								onClick={() => setShowRatingModal(true)}
								className={`flex items-center gap-1 h-9 px-2.5 rounded-lg border font-semibold transition-colors active:scale-95 ${
									rating
										? "text-sm border-gray-700/60"
										: seenIt
										? "text-xs border-gold-400/50 hover:border-gold-300/70"
										: "text-xs border-gray-600/40 hover:border-gray-500/60"
								}`}
								style={rating
									? { backgroundColor: style.background, color: style.text }
									: seenIt
									? { backgroundColor: "rgba(234,179,8,0.08)", color: "#fde68a" }
									: { backgroundColor: "rgba(30,30,34,0.75)", color: "#9ca3af" }
								}
							>
								<Star className={`w-3.5 h-3.5 ${rating ? "fill-current" : ""}`} />
								<span>{rating || "Rate"}</span>
							</button>
						</div>
					)}
				</div>

				{/* ── Title below poster ── */}
				<div className="px-3 py-2.5">
					<p className="text-sm font-semibold text-white leading-snug line-clamp-2">
						{movie.title}
					</p>
					{movie.release_year && (
						<p className="text-xs text-gray-500 mt-0.5">{movie.release_year}</p>
					)}
				</div>
			</div>

			{/* Rating Modal */}
			{interactive && (
				<RatingModal
					isOpen={showRatingModal}
					movieTitle={movie.title}
					posterUrl={movie.poster_url}
					currentRating={rating || null}
					movieId={movie.id}
					onRate={(value) => onUpdate?.(movie.id, { ranking: value })}
					onClose={() => setShowRatingModal(false)}
				/>
			)}
		</>
	);
}

/* ═══════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════ */

export default function MovieCard({
	movie,
	variant = "grid",
	rank,
	isWinner = false,
	onClick,
	onUpdate,
	ranking,
	seenIt,
	ratingLabel,
	showHotTake,
	ratingOnly,
	footerAction,
	showYear,
	incomplete,
	onWatchlist,
	isOnWatchlist,
}: MovieCardProps) {
	// Use explicit ranking if provided, otherwise pull from movie data
	const resolvedRating = ranking !== undefined ? Math.round(ranking ?? 0) : Math.round(movie.rankings?.[0]?.ranking ?? 0);
	const posterSrc = resolveImage(movie, "poster");
	const thumbSrc = resolveImage(movie, "thumb");
	const interactive = !!onUpdate;

	switch (variant) {
		case "featured":
			return <FeaturedCard movie={movie} rating={resolvedRating} posterSrc={posterSrc} onClick={onClick} />;
		case "compact":
			return (
				<CompactCard
					movie={movie}
					rating={resolvedRating}
					// Posters, not backdrops: every film has one, and the fixed
					// 2:3 crop keeps list rows uniform regardless of what the
					// thumb mirror wrote (see 2026-07 thumbs/poster mixup).
					thumbSrc={posterSrc}
					rank={rank}
					isWinner={isWinner}
					onClick={onClick}
					showYear={showYear}
					interactive={interactive}
					onUpdate={onUpdate}
					seenIt={seenIt}
					ratingLabel={ratingLabel}
					showHotTake={showHotTake}
					incomplete={incomplete}
				/>
			);
		case "large":
			return (
				<LargeCard
					movie={movie}
					rating={resolvedRating}
					posterSrc={posterSrc}
					rank={rank}
					isWinner={isWinner}
					onClick={onClick}
					interactive={interactive}
					onUpdate={onUpdate}
					seenIt={seenIt}
				/>
			);
		case "grid":
		default:
			return (
				<GridCard
					movie={movie}
					rating={resolvedRating}
					posterSrc={posterSrc}
					rank={rank}
					isWinner={isWinner}
					onClick={onClick}
					interactive={interactive}
					onUpdate={onUpdate}
					seenIt={seenIt}
					ratingLabel={ratingLabel}
					ratingOnly={ratingOnly}
					footerAction={footerAction}
					onWatchlist={onWatchlist}
					isOnWatchlist={isOnWatchlist}
				/>
			);
	}
}

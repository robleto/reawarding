"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Film, Trophy, Flame, TrendingUp, TrendingDown, Star, Bookmark, RefreshCcw, EyeOff, Check } from "lucide-react";
import { shimmer, toBase64 } from "@/utils/imagePlaceholders";
import { getRatingStyle } from "@/utils/getRatingStyle";
import type { Movie } from "@/types/types";
import { normalizeImageUrl } from "@/utils/imageUrl";
import type { AcademyStatusResult } from "@/data/officialAwardWinners";
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
	/** May resolve `false` on a failed write — RatingModal awaits this via its
	 *  onRate prop so it can show an error instead of a fabricated "Done"
	 *  confirmation (see docs/audits/2026-08-21-launch-readiness.md LOOP-1).
	 *  Implementations that don't report success/failure (void, or a Promise
	 *  resolving to undefined) are treated as always-succeeding. */
	onUpdate?: (movieId: string, updates: { seen_it?: boolean; ranking?: number | null }) => void | Promise<boolean | void>;
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
	/** Featured: Upheld/Reawarded/Unscreened badge vs. the real Academy winner */
	academyStatus?: AcademyStatusResult | null;
	/** Featured/grid: hide the rating number overlay (e.g. when an Academy stamp sits near it, or the score has already done its job of ordering the ballot) */
	hideRating?: boolean;
	/** Grid, non-interactive: move the winner badge to bottom-left instead of top-right, so it doesn't compete with a rank badge up top and leaves bottom-right free for the rating */
	winnerLabel?: boolean;
	/** Compact variant only: native-feeling glass row (rounded-2xl, translucent
	 * surface, more padding, mono numerals). This is the app's one row design
	 * now — defaults to true. Pass `native={false}` to opt a surface out. */
	native?: boolean;
	/** Suppress the bookmark/watchlist toggle — for surfaces where being on the
	 * watchlist is already the point (the Watchlist screen itself), so the icon
	 * isn't redundant. */
	hideBookmark?: boolean;
	/** Compact, display-only rows only: desaturate/dim unseen films and add
	 * a small check badge for seen ones — a checklist treatment for a
	 * canonical membership list (e.g. a collection), not the default. */
	dimUnseen?: boolean;
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

export const RatingBadge = ({ rating, className = "", pill = false }: { rating: number; className?: string; pill?: boolean }) => {
	const { text, background } = getRatingStyle(rating);
	if (rating <= 0) return null;
	return (
		<span
			className={`inline-flex items-center font-mono font-bold tabular-nums shadow-sm ${pill ? "rounded-full" : "rounded-md"} ${className}`}
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

const ACADEMY_STATUS_STYLES: Record<
	AcademyStatusResult["status"],
	{ label: string; icon: typeof Trophy; classes: string }
> = {
	upheld: { label: "Upheld", icon: Trophy, classes: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" },
	reawarded: { label: "Reawarded", icon: RefreshCcw, classes: "bg-amber-500/15 border-amber-500/40 text-amber-300" },
	unscreened: { label: "Unscreened", icon: EyeOff, classes: "bg-gray-500/15 border-gray-600/40 text-gray-400" },
};

function AcademyStatusBadge({ academyStatus }: { academyStatus: AcademyStatusResult }) {
	const style = ACADEMY_STATUS_STYLES[academyStatus.status];
	const Icon = style.icon;
	return (
		<div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1">
			<span
				role="status"
				aria-label={`${style.label}${academyStatus.status !== "upheld" ? `: ${academyStatus.officialTitle}` : ""}`}
				className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] shadow-lg backdrop-blur-sm ${style.classes}`}
			>
				<Icon className="w-2.5 h-2.5" aria-hidden="true" />
				{style.label}
			</span>
			{academyStatus.status !== "upheld" && (
				<span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-gray-300 max-w-[140px] truncate">
					{academyStatus.officialTitle}
				</span>
			)}
		</div>
	);
}

function FeaturedCard({ movie, rating, posterSrc, onClick, academyStatus, hideRating }: { movie: Movie; rating: number; posterSrc: string | null; onClick?: () => void; academyStatus?: AcademyStatusResult | null; hideRating?: boolean }) {
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
				{academyStatus && <AcademyStatusBadge academyStatus={academyStatus} />}
				{!hideRating && <RatingBadge rating={rating} className="absolute bottom-2.5 right-2.5 text-sm px-2 py-1" />}
				<div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-always-black/60 to-transparent pointer-events-none" />
			</div>
			<h4 className="mt-3 text-xl font-semibold text-white pr-[100px]">
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
	/** May resolve `false` on a failed write — RatingModal awaits this via its
	 *  onRate prop so it can show an error instead of a fabricated "Done"
	 *  confirmation (see docs/audits/2026-08-21-launch-readiness.md LOOP-1).
	 *  Implementations that don't report success/failure (void, or a Promise
	 *  resolving to undefined) are treated as always-succeeding. */
	onUpdate?: (movieId: string, updates: { seen_it?: boolean; ranking?: number | null }) => void | Promise<boolean | void>;
	seenIt?: boolean;
	ratingLabel?: string | null;
	ratingOnly?: boolean;
	footerAction?: React.ReactNode;
	hideRating?: boolean;
	winnerLabel?: boolean;
	hideBookmark?: boolean;
}

function GridCard({ movie, rating, posterSrc, rank, isWinner, onClick, interactive, onUpdate, seenIt, ratingLabel, ratingOnly, footerAction, hideRating, winnerLabel, hideBookmark }: GridCardProps) {
	const [showRatingModal, setShowRatingModal] = useState(false);
	const style = getRatingStyle(rating);
	const { watchlistMovieIds, toggle: toggleWatchlist, removeIfWatched } = useWatchlistContext();
	const isOnWatchlist = watchlistMovieIds.has(movie.id);
	const showBookmark = !isWinner && !seenIt && !hideBookmark;

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
					{/* Winner badge — top-right icon by default; bottom-left when
					    winnerLabel is set (nomination-card surfaces), leaving the
					    bottom-right corner free for the rating badge. */}
					{isWinner && !winnerLabel && (
						<span className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full bg-always-black/65 backdrop-blur-sm">
							<Trophy className="w-3.5 h-3.5 text-gold-400" />
						</span>
					)}
					{isWinner && winnerLabel && (
						<span className="absolute bottom-2 left-2 flex items-center justify-center w-6 h-6 rounded-full bg-always-black/65 backdrop-blur-sm">
							<Trophy className="w-3.5 h-3.5 text-gold-400" />
						</span>
					)}

					{/* Bookmark — top-right, icon-only. Hidden for winners (trophy owns
					    that corner) and once seen (watchlist is for what's still ahead).
					    Visual chip stays 28px (w-7 h-7) to preserve the grid's density;
					    the before:-inset-2 pseudo-element pads the actual tappable area
					    out to 44x44 on touch without enlarging the visible circle. */}
					{showBookmark && (
						<button
							type="button"
							onClick={(e) => { e.stopPropagation(); toggleWatchlist(movie.id); }}
							className={`movie-card-overlay absolute top-2 right-2 z-30 flex items-center justify-center w-7 h-7 rounded-full bg-always-black/65 backdrop-blur-sm transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-always-black/85 before:content-[''] before:absolute before:-inset-2 ${
								isOnWatchlist ? "text-amber-400" : "text-always-white/80 hover:text-amber-300"
							}`}
							title={isOnWatchlist ? "Remove from watchlist" : "Add to watchlist"}
						>
							<Bookmark className={`w-3.5 h-3.5 ${isOnWatchlist ? "fill-current" : ""}`} />
						</button>
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
											// Symmetric before:-inset-2 (8px/side), restored here after round 2's
											// asymmetric before:left-0/-right-4 split measured WORSE (effective
											// width dropped to ~34-36px) without actually removing the overlap onto
											// footerAction — it just deferred to footerAction's z-index. This
											// symmetric form is round 1's baseline and its best measured result:
											// 44px effective width when rated (min-w-[28px], no neighbor) / ~57px
											// unrated (min-w-[40px]). In THIS row, footerAction sits gap-1.5 (6px)
											// away — narrower than this inset's 8px reach — so on the right side
											// the expansion is clipped ~2px short of its full 8px once it meets
											// footerAction's own hit area, landing at 42px effective width in that
											// specific configuration. VariancePill (if present) also renders inline
											// in this row but is a non-interactive <span> with no hit area of its
											// own, so it doesn't compete for or block any tap target — the only
											// real neighbor for reach purposes is footerAction. That 42px-vs-44px
											// shortfall is physical: at a 375px viewport this 3-up grid card is
											// only ~109px wide, leaving no room to also grow the pill's visible
											// size (already ruled out, see the width comment on the interactive
											// overlay above) to reach a true 44px in every configuration.
											// footerAction itself carries its own `relative z-10` (see
											// YearExplorer.tsx) so it is never silently overridden by this pill's
											// pseudo-element regardless of the residual overlap. NOTE: `ratingOnly`
											// is declared/threaded throughout this file but no current caller
											// passes it — these figures are derived from the resolved box model,
											// not a live-rendered measurement of this exact branch.
											className={`relative font-bold px-1.5 py-2 rounded-md border transition-colors active:scale-95 before:content-[''] before:absolute before:-inset-2 ${
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
								<div className="flex items-center rounded-b-lg w-full px-2 py-2 gap-1.5 justify-between">
									{/* Icon-only: at 3-up mobile grid width, "Unseen" + a Rate
									    pill side by side overflow the card and get clipped by
									    the card's overflow-hidden. Same icon-only treatment as
									    CompactCard's mobile row. */}
									<SeenItButton
										seenIt={seenIt ?? false}
										showText={false}
										size="sm"
										variant="compact"
										// z-10 so this button's own hit area is never silently overridden
										// by the rate pill's before:-inset-2 pseudo-element reaching in
										// from the right (see the comment on that pill below).
										className="relative z-10 shrink-0"
										onClick={() => {
											const newSeenIt = !(seenIt ?? false);
											onUpdate?.(movie.id, { seen_it: newSeenIt });
											if (newSeenIt) removeIfWatched(movie.id).catch(() => {});
										}}
									/>
									<div className="flex flex-col items-center min-w-0 shrink-0">
										{/* Visual chip stays min-h/w-32px — the cramped 3-up mobile
										    grid needs that density. Symmetric before:-inset-2 (8px/side),
										    restored here after round 2's asymmetric before:left-0/-right-4
										    split measured WORSE (effective width dropped to ~34-36px)
										    without actually removing the overlaps it was meant to fix —
										    it just deferred to neighbors' z-index. This branch's visible
										    chip (px-1 py-0.5, min-w-[28px]/[32px]) is smaller than the
										    ratingOnly branch's (px-1.5 py-2, min-w-[28px]/[40px]), but the
										    resolved hit area is the same 44px (rated) / ~53px (unrated)
										    when there's no interactive neighbor to the right — VariancePill
										    (if present) renders BELOW this pill in this branch (mt-0.5,
										    not inline), so it is never a horizontal neighbor here at all,
										    and being a non-interactive <span> it wouldn't compete for a
										    tap target even if it were. footerAction (when rendered) sits
										    gap-1.5 (6px) to the right — narrower than this inset's 8px
										    reach — so that side is clipped ~2px short of its full 8px once
										    it meets footerAction's own hit area, landing at 42px effective
										    width in that specific configuration. That 42px-vs-44px
										    shortfall is physical (interactive controls sharing a
										    ~109px-wide 3-up-grid card at 375px), not a bug, and not
										    fixable with more inset math without regressing the no-neighbor
										    case again (see round 2's history above). SeenIt (to the left)
										    now carries its own `relative z-10` and footerAction (to the
										    right, when present) carries its own `relative z-10` in
										    YearExplorer.tsx, so neither neighbor is ever silently
										    overridden by this pill's pseudo-element. */}
										<button
											type="button"
											onClick={() => setShowRatingModal(true)}
											className={`relative font-bold px-1 py-0.5 min-h-[32px] rounded-lg border transition-colors active:scale-95 before:content-[''] before:absolute before:-inset-2 ${
												rating
													? "text-sm min-w-[28px] border-gray-700"
													: "text-xs min-w-[32px] border-gray-600/50 hover:border-gray-500/70 hover:brightness-125"
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
									{footerAction && <div className="shrink-0">{footerAction}</div>}
								</div>
							)}
						</div>
					) : (
						<>
							{/* Display-only rating badge — omitted when hideRating: the
							    score already did its job selecting/ordering this ballot,
							    so a nomination-card surface doesn't need to keep showing it. */}
							{!hideRating && (
								<RatingBadge rating={rating} className="absolute bottom-2 right-2 text-sm px-2 py-0.5" />
							)}
							<div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-always-black/70 to-transparent pointer-events-none" />
						</>
					)}
				</div>
				{/* Title beneath poster (only when NOT in ratingOnly mode, which shows title in overlay) */}
				{!ratingOnly && (
					<div className="px-2.5 py-2">
						{/* min-h reserves space for a full 2-line title (line-clamp-2's
						    cap) even when this particular title is one line — otherwise
						    a short title on the carousel's measured sample card understates
						    the caption height, and a longer, wrapped title on another page
						    gets its second line clipped by the carousel's shared frame
						    height (see NomineeCardCarousel). Also keeps grid rows level
						    when title lengths vary. */}
						<p className="text-xs font-medium text-white leading-snug line-clamp-2 min-h-[33px]">
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
					movieYear={movie.release_year ?? undefined}
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
	/** May resolve `false` on a failed write — RatingModal awaits this via its
	 *  onRate prop so it can show an error instead of a fabricated "Done"
	 *  confirmation (see docs/audits/2026-08-21-launch-readiness.md LOOP-1).
	 *  Implementations that don't report success/failure (void, or a Promise
	 *  resolving to undefined) are treated as always-succeeding. */
	onUpdate?: (movieId: string, updates: { seen_it?: boolean; ranking?: number | null }) => void | Promise<boolean | void>;
	seenIt?: boolean;
	ratingLabel?: string | null;
	showHotTake?: boolean;
	incomplete?: boolean;
	native?: boolean;
	hideBookmark?: boolean;
	/** Opt-in checklist treatment — desaturates/dims the poster when
	    `seenIt` is false and adds a small check badge when true. Off by
	    default so it doesn't change how every other existing display-only
	    compact row looks; collection membership lists (a real checklist
	    against a canonical film list) are the intended caller. */
	dimUnseen?: boolean;
}

function CompactCard({ movie, rating, thumbSrc, rank, isWinner, onClick, showYear, interactive, onUpdate, seenIt, ratingLabel, showHotTake, incomplete, native = true, hideBookmark, dimUnseen }: CompactCardProps) {
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

	const { watchlistMovieIds, toggle: toggleWatchlist, removeIfWatched } = useWatchlistContext();
	const isOnWatchlist = watchlistMovieIds.has(movie.id);
	const showBookmark = !isWinner && !seenIt && !hideBookmark;
	// Native rows (mobile layout only) run a bigger poster so it stays
	// legible at this row height, with tighter card padding around it so the
	// extra size doesn't just inflate the row.
	const thumbW = native ? 60 : 48;
	const thumbH = native ? 90 : 72;

	// Returns onUpdate's result (rather than discarding it) so
	// RankingDropdown's commitRating can await success/failure and show its
	// Undo/error toasts — LOOP-2, docs/audits/2026-08-21-launch-readiness-round3.md.
	const handleRatingSelect = (newRating: number | null) => {
		return onUpdate?.(movie.id, { ranking: newRating });
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
		// difference is the absence of edit controls. mb-2 md:mb-2 mirrors the
		// interactive branch below so rows space out the same way regardless
		// of which branch renders.
		return (
			<button
				type="button"
				onClick={onClick}
				className={`w-full text-left border transition-colors shadow-sm mb-2 md:mb-2 ${
					native
						? "px-2.5 py-2 rounded-2xl backdrop-blur-sm border-white/10 bg-white/5 hover:bg-white/[0.08]"
						: `px-1 py-1 md:px-2 md:py-2 rounded-xl ${
								isWinner
									? "border-gold-500/40 bg-gold-500/5 hover:bg-gold-500/10"
									: "border-gray-700/50 bg-gray-900/60 hover:bg-gray-800/80"
							}`
				}`}
			>
				<div className={`flex items-center ${native ? "gap-3" : "gap-1"}`} style={{ minHeight: thumbH }}>
					{typeof rank === "number" && (
						<div className="w-5 flex items-center justify-end text-xs font-mono font-bold text-gray-400 tabular-nums select-none pr-1">
							{rank}
						</div>
					)}
					<div className="relative flex-shrink-0">
						{thumbSrc ? (
							<Image
								src={thumbSrc}
								alt=""
								width={thumbW}
								height={thumbH}
								className={`shadow-md object-cover transition-all ${native ? "rounded-lg" : "rounded-md"} ${
									dimUnseen && !seenIt ? "grayscale opacity-40" : ""
								}`}
								style={{ width: thumbW, height: thumbH }}
								sizes={`${thumbW}px`}
								placeholder="blur"
								blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(thumbW, thumbH))}`}
							/>
						) : (
							<div
								className={`flex items-center justify-center bg-gray-800 ${native ? "rounded-lg" : "rounded-md"} ${
									dimUnseen && !seenIt ? "opacity-40" : ""
								}`}
								style={{ width: thumbW, height: thumbH }}
							>
								<Film className="w-4 h-4 text-gray-600" />
							</div>
						)}
						{dimUnseen && seenIt && (
							<span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-black ring-2 ring-gray-900 shadow-md">
								<Check className="w-3 h-3" strokeWidth={3} />
							</span>
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
							<RatingBadge rating={rating} className="min-w-[44px] min-h-[44px] justify-center text-base" pill={native} />
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
			className={`mb-2 md:mb-2 border transition duration-200 shadow-sm ${
				native
					? "px-2.5 py-2 rounded-2xl backdrop-blur-sm border-white/10 bg-white/5 hover:bg-white/[0.08]"
					: `px-1 py-1 md:px-2 md:py-2 rounded-xl ${
							incomplete
								? "border-gray-600/50 bg-gray-900/45 hover:bg-gray-800/70"
								: "border-gray-700/50 bg-gray-900/60 hover:bg-gray-800/80"
						}`
			} ${
				onClick ? "cursor-pointer" : ""
			}`}
			onClick={handleClick}
			style={{ boxShadow: "0 2px 8px 0 rgba(0,0,0,0.10)" }}
		>
			{/* Desktop Layout */}
			<div className="hidden md:flex items-center justify-between gap-2">
				<div className="relative flex-shrink-0">
					{thumbSrc ? (
						<Image
							src={thumbSrc}
							alt={movie.title}
							width={48}
							height={72}
							className={`w-12 h-[72px] rounded-md shadow-md object-cover transition-all ${
								dimUnseen && !seenIt ? "grayscale opacity-35" : ""
							}`}
							sizes="48px"
							placeholder="blur"
							blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(48, 72))}`}
						/>
					) : (
						<div
							className={`flex items-center justify-center bg-gray-800 rounded-md ${
								dimUnseen && !seenIt ? "opacity-35" : ""
							}`}
							style={{ width: 48, height: 72 }}
						>
							<Film className="w-4 h-4 text-gray-600" />
						</div>
					)}
					{dimUnseen && seenIt && (
						<span className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-black ring-2 ring-gray-900 shadow-md">
							<Check className="w-3.5 h-3.5" strokeWidth={3} />
						</span>
					)}
				</div>
				<div className="flex-1 min-w-0">
					<h3 className="text-base font-semibold text-white leading-snug truncate">{movie.title}</h3>
					{showYear && <p className="text-sm text-gray-400">{movie.release_year}</p>}
					{incomplete && <p className="text-xs text-gray-500">Seen, not rated yet</p>}
				</div>
				<div className="flex items-center gap-2">
					{showHotTakeIndicator ? (
						<div className={`flex items-center gap-1.5 px-2 py-1 text-xs font-mono font-semibold ${native ? "rounded-full" : "rounded"} ${
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
					{showBookmark && (
						<button
							type="button"
							onClick={(e) => { e.stopPropagation(); toggleWatchlist(movie.id); }}
							className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
								isOnWatchlist ? "text-amber-400 bg-amber-500/10" : "text-gray-400 hover:text-amber-300 hover:bg-gray-800"
							}`}
							title={isOnWatchlist ? "Remove from watchlist" : "Add to watchlist"}
						>
							<Bookmark className={`w-4 h-4 ${isOnWatchlist ? "fill-current" : ""}`} />
						</button>
					)}
					<div className="flex flex-col items-center">
						<RankingDropdown ranking={rating || null} onChange={handleRatingSelect} native={native} />
						{ratingLabel && (
							<span className="mt-0.5 text-xs leading-tight text-gray-400">{ratingLabel}</span>
						)}
					</div>
				</div>
			</div>

			{/* Mobile Layout */}
			<div className="md:hidden">
				<div className={`flex items-center ${native ? "gap-3" : "gap-1"}`} style={{ minHeight: thumbH }}>
					{typeof rank === "number" && (
						<div className={`w-5 flex items-center justify-end text-gray-400 select-none pr-1 ${native ? "text-xs font-mono tabular-nums" : "text-xs font-bold"}`}>
							{rank}
						</div>
					)}
					<div className="relative flex-shrink-0">
						{thumbSrc ? (
							<Image
								src={thumbSrc}
								alt={movie.title}
								width={thumbW}
								height={thumbH}
								className={`shadow-md object-cover transition-all ${native ? "rounded-lg" : "rounded-md"} ${
									dimUnseen && !seenIt ? "grayscale opacity-35" : ""
								}`}
								style={{ width: thumbW, height: thumbH }}
								sizes={`${thumbW}px`}
								placeholder="blur"
								blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(thumbW, thumbH))}`}
							/>
						) : (
							<div
								className={`flex items-center justify-center bg-gray-800 ${native ? "rounded-lg" : "rounded-md"} ${
									dimUnseen && !seenIt ? "opacity-35" : ""
								}`}
								style={{ width: thumbW, height: thumbH }}
							>
								<Film className="w-4 h-4 text-gray-600" />
							</div>
						)}
						{dimUnseen && seenIt && (
							<span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-black ring-2 ring-gray-900 shadow-md">
								<Check className="w-3 h-3" strokeWidth={3} />
							</span>
						)}
					</div>
					<div className="flex-1 min-w-0 flex items-center justify-between">
						<div className="flex-1 min-w-0">
							<h3 className="text-sm font-semibold text-white leading-tight line-clamp-2 break-words">{movie.title}</h3>
							{showYear && <p className="text-xs text-gray-400">{movie.release_year}</p>}
							{incomplete && <p className="text-xs text-gray-500">Seen, not rated yet</p>}
						</div>
						{/* gap-4 (16px), not gap-2 — SeenIt's compact hit-area (before:-inset-1.5,
						    6px/side) plus this bookmark's before:-inset-2 (8px/side) need 14px of
						    facing clearance to avoid the two invisible hit-boxes overlapping each
						    other; a wider gap here (a full-width list row, not the cramped 3-up
						    grid) is the cheap fix vs. shrinking either below its 44px floor. */}
						<div className="flex items-center gap-4 ml-2">
							{showHotTakeIndicator ? (
								<div className={`flex items-center gap-1 px-2 py-1 text-xs font-mono font-semibold ${native ? "rounded-full" : "rounded"} ${
									disparity > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
								}`}>
									<Flame className="w-3 h-3" />
									{disparity > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
									<span>{disparity > 0 ? "+" : ""}{Math.abs(disparity).toFixed(1)}</span>
								</div>
							) : (
								<SeenItButton
									seenIt={seenIt ?? false}
									onClick={toggleSeenIt}
									showText={false}
									size="sm"
									variant="compact"
								/>
							)}
							{showBookmark && (
								<button
									type="button"
									onClick={(e) => { e.stopPropagation(); toggleWatchlist(movie.id); }}
									className={`relative w-7 h-7 flex items-center justify-center rounded-lg transition-colors before:content-[''] before:absolute before:-inset-2 ${
										isOnWatchlist ? "text-amber-400 bg-amber-500/10" : "text-gray-400 hover:text-amber-300 hover:bg-gray-800"
									}`}
									title={isOnWatchlist ? "Remove from watchlist" : "Add to watchlist"}
								>
									<Bookmark className={`w-3.5 h-3.5 ${isOnWatchlist ? "fill-current" : ""}`} />
								</button>
							)}
							<div className="flex flex-col items-center">
								<RankingDropdown ranking={rating || null} onChange={handleRatingSelect} native={native} />
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
	/** May resolve `false` on a failed write — RatingModal awaits this via its
	 *  onRate prop so it can show an error instead of a fabricated "Done"
	 *  confirmation (see docs/audits/2026-08-21-launch-readiness.md LOOP-1).
	 *  Implementations that don't report success/failure (void, or a Promise
	 *  resolving to undefined) are treated as always-succeeding. */
	onUpdate?: (movieId: string, updates: { seen_it?: boolean; ranking?: number | null }) => void | Promise<boolean | void>;
	seenIt?: boolean;
	hideBookmark?: boolean;
	/** Extra control rendered beside the title/year (e.g. Awards' "Nominate"
	    button) — unlike GridCard's footerAction, this sits below the poster
	    rather than inside the already-busy SeenIt/Rate overlay row, since
	    there's no room to add a third item there. */
	footerAction?: React.ReactNode;
}

function LargeCard({ movie, rating, posterSrc, rank, isWinner, onClick, interactive, onUpdate, seenIt, hideBookmark, footerAction }: LargeCardProps) {
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
					{!hideBookmark && (
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
					)}

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
				<div className="px-3 py-2.5 flex items-start justify-between gap-2">
					<div className="min-w-0">
						<p className="text-sm font-semibold text-white leading-snug line-clamp-2">
							{movie.title}
						</p>
						{movie.release_year && (
							<p className="text-xs text-gray-500 mt-0.5">{movie.release_year}</p>
						)}
					</div>
					{footerAction && <div className="flex-shrink-0 movie-card-overlay">{footerAction}</div>}
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
					movieYear={movie.release_year ?? undefined}
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
	academyStatus,
	hideRating,
	winnerLabel,
	native = true,
	hideBookmark,
	dimUnseen,
}: MovieCardProps) {
	// Use explicit ranking if provided, otherwise pull from movie data
	const resolvedRating = ranking !== undefined ? Math.round(ranking ?? 0) : Math.round(movie.rankings?.[0]?.ranking ?? 0);
	const posterSrc = resolveImage(movie, "poster");
	const thumbSrc = resolveImage(movie, "thumb");
	const interactive = !!onUpdate;

	switch (variant) {
		case "featured":
			return <FeaturedCard movie={movie} rating={resolvedRating} posterSrc={posterSrc} onClick={onClick} academyStatus={academyStatus} hideRating={hideRating} />;
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
					native={native}
					hideBookmark={hideBookmark}
					dimUnseen={dimUnseen}
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
					hideBookmark={hideBookmark}
					footerAction={footerAction}
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
					hideRating={hideRating}
					winnerLabel={winnerLabel}
					hideBookmark={hideBookmark}
				/>
			);
	}
}

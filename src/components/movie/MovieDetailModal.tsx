"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useUser } from "@supabase/auth-helpers-react";
import Image from "next/image";
import { X, Eye, EyeOff, Bookmark, Film, Clock, Users, Clapperboard, ExternalLink, Copy, Play, PenLine, ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/lib/supabaseBrowser";
import RatingModal from "@/components/movie/RatingModal";
import WatchProviders from "@/components/films/WatchProviders";
import type { Movie, TMDBVideo } from "@/types/types";
import { normalizeImageUrl } from "@/utils/imageUrl";
import { useProfile } from "@/contexts/ProfileContext";
import { slugifyTitle } from "@/utils/slug";
import { getRatingStyle } from "@/utils/getRatingStyle";
import { SUGGESTED_QUALITY_TAGS } from "@/utils/qualityTags";
import { useWatchlistContext } from "@/contexts/WatchlistContext";

interface MovieDetailModalProps {
  movie: Movie;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (movieId: string, newRanking: number | null, newSeenIt: boolean) => void;
  initialRanking?: number | null;
  initialSeenIt?: boolean;
}

// Callers pass whatever slim projection their list query fetched, so the modal
// hydrates the full metadata row itself instead of trusting the prop to be complete.
const DETAIL_FIELDS =
  "id, overview, tagline, runtime, genres, director, writer, cast_list, mpaa_rating, tmdb_id, imdb_rating, metacritic_score, videos, watch_providers, backdrop_url";

type Expression = {
  notes: string | null;
  favorite_quote: string | null;
  quality_tags: string[];
  would_recommend: boolean | null;
};

// JSONB columns may arrive double-encoded as strings (see films/[slug]/[id]/page.tsx)
function parseJsonish<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

// Fallback component for missing images
const PosterFallback = ({ 
  title, 
  className = "" 
}: { 
  title: string; 
  className?: string; 
}) => (
  <div className={`flex flex-col items-center justify-center bg-gray-800 text-gray-500 w-full h-full ${className}`}>
    <Film className="w-12 h-12 mb-2 text-gray-600" />
    <div className="px-4 text-sm font-medium text-center">
      {title}
    </div>
  </div>
);

export default function MovieDetailModal({
  movie,
  isOpen,
  onClose,
  onUpdate,
  initialRanking = null,
  initialSeenIt = false,
}: MovieDetailModalProps) {
  const user = useUser();
  const router = useRouter();
  const { isAdmin } = useProfile();
  const { watchlistMovieIds, toggle: toggleWatchlist, removeIfWatched } = useWatchlistContext();
  const isOnWatchlist = watchlistMovieIds.has(movie.id);
  const [seenIt, setSeenIt] = useState(initialSeenIt);
  const [ranking, setRanking] = useState(initialRanking);
  const [isLoading, setIsLoading] = useState(false);
  const [hasValidImage, setHasValidImage] = useState(true);
  const [copiedTmdb, setCopiedTmdb] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [details, setDetails] = useState<Partial<Movie> | null>(null);
  const [expression, setExpression] = useState<{ movieId: string; data: Expression | null } | null>(null);

  // Self-hydrate full metadata; the movie prop may be a slim list projection.
  // details is keyed by movie.id (DETAIL_FIELDS includes id) so a row hydrated
  // for a previous film never bleeds into the next one, and reopening the same
  // film skips the refetch. The error path settles to a bare {id} sentinel so
  // the loading skeleton always resolves.
  useEffect(() => {
    if (!isOpen) return;
    if (details?.id === movie.id) return;
    let cancelled = false;
    supabase
      .from("movies")
      .select(DETAIL_FIELDS)
      .eq("id", movie.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn("Movie detail hydration failed:", error.message);
          setDetails({ id: movie.id });
          return;
        }
        setDetails((data as Partial<Movie>) ?? { id: movie.id });
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, movie.id, details]);

  // Hydrated row wins once it matches this movie; prop fills the gap meanwhile
  const hydrated = details && details.id === movie.id ? details : null;
  const film: Movie = { ...movie, ...(hydrated ?? {}) };

  // The user's expression row, read-only here — editing lives on the film page
  // (YourTake panel) to keep the modal a pure Viewing surface. Keyed by movie
  // id the same way as details so takes never bleed between films.
  useEffect(() => {
    if (!isOpen || !user) return;
    if (expression?.movieId === movie.id) return;
    let cancelled = false;
    supabase
      .from("expressions")
      .select("notes, favorite_quote, quality_tags, would_recommend")
      .eq("movie_id", movie.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn("Expression fetch failed:", error.message);
          setExpression({ movieId: movie.id, data: null });
          return;
        }
        setExpression({ movieId: movie.id, data: data ?? null });
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, user, movie.id, expression]);

  const yourTake = expression?.movieId === movie.id ? expression.data : null;
  // Mirrors `yourTake`, but updated synchronously (not just on re-render) so
  // rapid taps read each other's optimistic result instead of both starting
  // from the same stale snapshot — see handleToggleQualityTag.
  const yourTakeRef = useRef(yourTake);
  useEffect(() => {
    yourTakeRef.current = yourTake;
  }, [yourTake]);
  // Curated tags get their own always-visible quick-toggle row, so they don't
  // count toward whether the "Your Take" summary card (Edit-link, quote,
  // notes, recommend) is worth showing.
  const customQualityTags = (yourTake?.quality_tags ?? []).filter(
    (tag) => !SUGGESTED_QUALITY_TAGS.some((s) => s.toLowerCase() === tag.toLowerCase())
  );
  const hasDeeperTake =
    !!yourTake &&
    !!(
      yourTake.notes ||
      yourTake.favorite_quote ||
      customQualityTags.length ||
      yourTake.would_recommend != null
    );

  const videos = parseJsonish<TMDBVideo[]>(film.videos, []);
  const youtubeVideos = Array.isArray(videos)
    ? videos.filter((v) => v && v.site === "YouTube" && v.key)
    : [];
  const trailer =
    youtubeVideos.find((v) => v.type === "Trailer" && v.official) ||
    youtubeVideos.find((v) => v.type === "Trailer") ||
    youtubeVideos.find((v) => v.type === "Teaser") ||
    null;
  const watchProviders = parseJsonish<Movie["watch_providers"]>(film.watch_providers, undefined);
  const hasProviders =
    !!watchProviders &&
    Object.values(watchProviders).some(
      (region) =>
        region &&
        (region.flatrate?.length || region.rent?.length || region.buy?.length)
    );

  // Reset state when modal opens with new movie
  useEffect(() => {
    if (isOpen) {
      setSeenIt(initialSeenIt);
      setRanking(initialRanking);
      const raw = (movie.poster_url || '').trim();
      const normalized = normalizeImageUrl(raw);
      // Ensure we have a valid absolute URL or proper relative path
      const isValidUrl = normalized && 
        (normalized.startsWith('http://') || 
         normalized.startsWith('https://') || 
         (normalized.startsWith('/') && normalized.length > 1));
      setHasValidImage(Boolean(isValidUrl && !normalized.includes('placeholder')));
    }
  }, [isOpen, movie, initialRanking, initialSeenIt]);

  // Body scroll lock — independent of the escape-key close below (which
  // needs beginClose, defined further down), kept here so it engages the
  // instant the modal opens rather than waiting on that definition.
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Update ranking and refetch latest value from backend. Returns whether
  // the write actually succeeded — RatingModal's onRate awaits this so it
  // only shows a success confirmation once the write is real (see
  // docs/audits/2026-08-21-launch-readiness.md LOOP-1).
  const updateRanking = async (newRanking: number | null, newSeenIt: boolean): Promise<boolean> => {
    if (!user) {
      console.error('No user found when trying to update ranking');
      return false;
    }

    setIsLoading(true);
    try {
      // Upsert and return updated row in one round-trip
      const { data: rankingData, error } = await supabase.from('rankings').upsert({
        user_id: user.id,
        movie_id: movie.id,
        ranking: newRanking,
        seen_it: newSeenIt,
      }, { onConflict: 'user_id,movie_id' }).select('ranking, seen_it').single();

      if (error || !rankingData) {
        console.error('Error updating ranking:', error);
        setRanking(initialRanking);
        setSeenIt(initialSeenIt);
        return false;
      }

      setRanking(rankingData.ranking ?? null);
      setSeenIt(rankingData.seen_it ?? false);
      // On success, call the onUpdate callback
      onUpdate(movie.id, rankingData.ranking ?? null, rankingData.seen_it ?? false);
      return true;
    } catch (error) {
      console.error('Caught exception updating ranking:', error);
      setRanking(initialRanking);
      setSeenIt(initialSeenIt);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Quick, one-tap tag toggle — unlocked once the film is seen + rated (the
  // moment there's actually an opinion worth tagging). Unlike YourTake's
  // manual-save form, this auto-saves per tap, matching SeenItButton/
  // RatingModal's quick-capture rhythm. Always upserts the FULL row so a tag
  // tap never wipes notes/quote/recommend set elsewhere.
  const handleToggleQualityTag = async (tag: string) => {
    if (!user) return;
    const base = yourTakeRef.current;
    const current = base?.quality_tags ?? [];
    const has = current.some((t) => t.toLowerCase() === tag.toLowerCase());
    const nextTags = has
      ? current.filter((t) => t.toLowerCase() !== tag.toLowerCase())
      : [...current, tag];
    const nextData = {
      notes: base?.notes ?? null,
      favorite_quote: base?.favorite_quote ?? null,
      quality_tags: nextTags,
      would_recommend: base?.would_recommend ?? null,
    };
    // Update the ref synchronously (ahead of the await) so a second rapid tap
    // builds on this tap's result instead of the same stale snapshot.
    yourTakeRef.current = nextData;

    const { error } = await supabase.from("expressions").upsert(
      { user_id: user.id, movie_id: movie.id, ...nextData },
      { onConflict: "user_id,movie_id" }
    );
    if (error) {
      console.error("Failed to toggle quality tag:", error.message);
      yourTakeRef.current = base;
      return;
    }
    setExpression({ movieId: movie.id, data: nextData });
  };

  const handleSeenItToggle = () => {
    const newSeenIt = !seenIt;
    setSeenIt(newSeenIt);
    updateRanking(ranking, newSeenIt);
    if (newSeenIt) removeIfWatched(movie.id).catch(() => {});
  };

  const handleRankingChange = (newRanking: number | null): Promise<boolean> => {
    setRanking(newRanking);
    // Auto-mark seen when a positive rating is chosen; preserves manual toggle
    const autoSeenIt = newRanking != null && newRanking >= 1 ? true : seenIt;
    if (autoSeenIt !== seenIt) setSeenIt(autoSeenIt);
    return updateRanking(newRanking, autoSeenIt);
  };

  // Removed unused handleRankingClear function

  const handleCopyTmdb = async () => {
    if (!film.tmdb_id) return;
    try {
      await navigator.clipboard.writeText(String(film.tmdb_id));
      setCopiedTmdb(true);
      setTimeout(() => setCopiedTmdb(false), 1500);
    } catch (e) {
      console.error('Failed to copy TMDB id', e);
    }
  };

  // ── Dismiss: X / backdrop / Escape / flick-down all funnel through here.
  // Callers unmount this component the instant `onClose` fires (see every
  // call site: `{selectedMovie && <MovieDetailModal .../>}`), so the exit
  // animation has to run BEFORE onClose is called, not after — the same
  // deferred-onClose technique RatingModal uses below.
  const CLOSE_MS = 220;
  const DISMISS_PX = 120;
  const [closing, setClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setClosing(false);
      setDragY(0);
      setIsDragging(false);
      draggingRef.current = false;
    }
  }, [isOpen]);

  const beginClose = () => {
    if (closing) return;
    setClosing(true);
    closeTimerRef.current = setTimeout(onClose, CLOSE_MS + 40);
  };

  // Flick-to-dismiss — scoped to the sticky grab bar (not the scrollable
  // content below it) so a drag never fights a scroll gesture, and disabled
  // on the desktop centered dialog (sm:+) where there's no "down" to flick to.
  const handleGrabPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (closing) return;
    if (typeof window !== "undefined" && window.innerWidth >= 640) return;
    draggingRef.current = true;
    startYRef.current = e.clientY;
    setIsDragging(true);
    // Without capture, the pointer leaves this ~56px bar within the first
    // few pixels of a real downward flick and every subsequent move/up
    // event stops arriving here — the drag would silently freeze after a
    // couple pixels instead of tracking the finger.
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handleGrabPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const delta = e.clientY - startYRef.current;
    setDragY(delta > 0 ? delta : delta * 0.25);
  };
  const endGrabDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    if (dragY > DISMISS_PX) {
      setClosing(true);
      setDragY(typeof window !== "undefined" ? window.innerHeight : 1000);
      closeTimerRef.current = setTimeout(onClose, CLOSE_MS);
    } else {
      setDragY(0);
    }
  };

  // Close on Escape — routed through beginClose (not onClose directly) so
  // it plays the same exit animation as the X button / backdrop / flick.
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') beginClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  });

  if (!isOpen) return null;

  // Portaled to document.body: this modal is opened from deep inside pages
  // like /year/[year] where an ancestor further up the tree can end up
  // establishing a CSS containing block for `position: fixed` descendants
  // (a transformed/filtered/sticky element anywhere between here and the
  // viewport is enough), which silently confines "fixed inset-0" to that
  // ancestor's box instead of the real viewport. A portal sidesteps that
  // entirely regardless of where this component is mounted.
  const ratingStyle = ranking != null ? getRatingStyle(ranking) : null;

  const modal = (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm motion-reduce:animate-none ${
        closing ? "animate-out fade-out duration-200" : "animate-in fade-in duration-200"
      }`}
      onClick={closing ? undefined : beginClose}
      role="dialog"
      aria-modal="true"
      aria-label={movie.title}
    >
      <div
        className={`relative bg-charcoal-900 border border-gold-500/20 rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] sm:max-h-[90vh] overflow-y-auto overscroll-contain text-gray-200 pb-[env(safe-area-inset-bottom)] sm:pb-0 motion-reduce:animate-none ${
          isDragging ? "" : "transition-transform duration-200 ease-out"
        } ${
          closing
            ? "animate-out fade-out slide-out-to-bottom-full duration-200 sm:slide-out-to-bottom-0 sm:zoom-out-95"
            : "animate-in fade-in slide-in-from-bottom-full duration-300 sm:slide-in-from-bottom-0 sm:zoom-in-95 sm:duration-200"
        }`}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        onClick={e => e.stopPropagation()}
      >
        {/* Grab bar — the drag/flick-to-dismiss handle on phones, kept off
            the scrollable content below so a swipe here never fights a
            scroll gesture. Close lives on the left, glass-chip circle,
            matching the app-wide close convention (see ListDetailView); a
            single centered pill (not a row of dots — those read as page
            indicators) is the drag affordance. */}
        <div
          className="sticky top-0 z-20 flex h-14 items-center rounded-t-2xl bg-charcoal-900/95 px-3 backdrop-blur-sm touch-none sm:cursor-default"
          onPointerDown={handleGrabPointerDown}
          onPointerMove={handleGrabPointerMove}
          onPointerUp={endGrabDrag}
          onPointerCancel={endGrabDrag}
        >
          <button
            onClick={beginClose}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Close"
            className="relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="pointer-events-none absolute inset-x-0 flex justify-center sm:hidden" aria-hidden="true">
            <div className="h-1 w-9 rounded-full bg-gray-600/80" />
          </div>
        </div>

        {/* Hero — cinematic backdrop band with the poster overlapping its
            lower edge like a lobby standee, the one deliberately bold
            moment in an otherwise quiet sheet. */}
        <div className="relative">
          <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-charcoal-700 to-charcoal-900 sm:h-48">
            {film.backdrop_url ? (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${film.backdrop_url})` }}
                  aria-hidden="true"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900 via-charcoal-900/25 to-black/20" aria-hidden="true" />
              </>
            ) : (
              <Clapperboard className="absolute right-6 top-1/2 h-16 w-16 -translate-y-1/2 text-gray-700/40" aria-hidden="true" />
            )}
          </div>

          <div className="relative flex items-end gap-3 px-4 pb-4 -mt-10 sm:gap-4 sm:px-6 sm:-mt-12">
            <div className="relative w-24 flex-shrink-0 sm:w-28">
              <div className="aspect-[2/3] relative overflow-hidden rounded-lg bg-gray-900 shadow-2xl ring-2 ring-charcoal-900">
                {hasValidImage ? (
                  <Image
                    src={normalizeImageUrl((movie.poster_url || '').trim())}
                    alt={movie.title}
                    fill
                    sizes="(min-width: 640px) 112px, 96px"
                    className="object-cover"
                    onError={() => setHasValidImage(false)}
                  />
                ) : (
                  <PosterFallback title={movie.title} className="rounded-lg" />
                )}
              </div>
              {ratingStyle && (
                <div
                  className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-bold shadow-md ring-2 ring-charcoal-900"
                  style={{ backgroundColor: ratingStyle.background, color: ratingStyle.text }}
                  title={`You rated this ${ranking}`}
                >
                  {ranking}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 pb-1">
              <h2 className="font-unbounded text-xl font-bold leading-tight text-white sm:text-2xl">
                {movie.title}
              </h2>
              <p className="mt-0.5 text-sm text-gray-400">{movie.release_year}</p>
              {film.genres && film.genres.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {film.genres.slice(0, 3).map((genre: string) => (
                    <span
                      key={genre}
                      className="px-2 py-0.5 text-[11px] font-medium bg-gold-900/50 text-gold-300 rounded-full"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions — one segmented bar instead of a form-like list; each
            segment is icon-over-label, tap target first. */}
        <div className="mx-4 mb-1 mt-3 flex items-stretch overflow-hidden rounded-xl border border-gold-500/10 bg-gray-800/40 sm:mx-6">
          {!seenIt && (
            <button
              type="button"
              onClick={() => toggleWatchlist(movie.id)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 border-r border-gold-500/10 py-2.5 text-xs font-medium transition-colors ${
                isOnWatchlist ? "text-amber-300" : "text-gray-300 hover:bg-gray-700/40"
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isOnWatchlist ? "fill-current" : ""}`} />
              {isOnWatchlist ? "On Watchlist" : "Watchlist"}
            </button>
          )}
          <button
            type="button"
            onClick={handleSeenItToggle}
            disabled={isLoading}
            className={`flex flex-1 flex-col items-center justify-center gap-1 border-r border-gold-500/10 py-2.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              seenIt ? "text-green-300" : "text-gray-300 hover:bg-gray-700/40"
            }`}
          >
            {seenIt ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {seenIt ? "Seen" : "Not Seen"}
          </button>
          <button
            type="button"
            onClick={() => setShowRatingModal(true)}
            disabled={isLoading}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              ratingStyle ? "" : "text-gray-300 hover:bg-gray-700/40"
            }`}
            style={ratingStyle ? { backgroundColor: ratingStyle.background, color: ratingStyle.text } : undefined}
          >
            <span className="font-mono text-sm font-bold leading-none">
              {ranking ?? "–"}
            </span>
            Rate
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 px-4 pb-6 pt-3 sm:px-6 sm:pb-8">
          {/* Tagline */}
          {film.tagline && (
            <p className="text-sm italic text-gold-300/80">{film.tagline}</p>
          )}

          {/* Overview */}
          {film.overview && (
            <div>
              <h4 className="mb-2 font-unbounded font-semibold text-gold-400">Overview</h4>
              <p className="text-sm leading-relaxed text-gray-300">
                {film.overview}
              </p>
            </div>
          )}

          {/* Hydration placeholder — keeps the panel from looking empty while details load */}
          {!hydrated && !film.overview && (
            <div className="space-y-2 animate-pulse" aria-hidden="true">
              <div className="h-4 w-24 rounded bg-gray-700" />
              <div className="h-3 w-full rounded bg-gray-700/70" />
              <div className="h-3 w-5/6 rounded bg-gray-700/70" />
              <div className="h-3 w-2/3 rounded bg-gray-700/70" />
            </div>
          )}

          {/* Quick Info — bordered chips, matching the full film page's
              quick-stat pills (same gray-800/60 + gold-500/10 treatment). */}
          <div className="flex flex-wrap gap-2 sm:gap-3 text-sm">
            {film.runtime && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gold-500/10">
                <Clock className="w-4 h-4 text-gold-400" />
                <span className="text-gray-300">{film.runtime} min</span>
              </div>
            )}
            {film.mpaa_rating && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gold-500/10">
                <Users className="w-4 h-4 text-gold-400" />
                <span className="text-gray-300">Rated {film.mpaa_rating}</span>
              </div>
            )}
            {film.director && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gold-500/10 max-w-full">
                <Clapperboard className="w-4 h-4 text-gold-400 flex-shrink-0" />
                <span className="text-gray-300 truncate" title={`Directed by ${film.director}`}>
                  {film.director}
                </span>
              </div>
            )}
            {film.writer && film.writer !== film.director && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gold-500/10 max-w-full">
                <Users className="w-4 h-4 text-gold-400 flex-shrink-0" />
                <span className="text-gray-300 truncate" title={`Written by ${film.writer}`}>
                  {film.writer}
                </span>
              </div>
            )}
            {trailer && (
              <a
                href={`https://www.youtube.com/watch?v=${trailer.key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gold-500/10 text-gold-300 hover:text-gold-200 hover:border-gold-500/30 transition-colors"
              >
                <Play className="w-4 h-4 text-gold-400" />
                <span>Watch Trailer</span>
              </a>
            )}
          </div>

          {/* Your Take — read-only summary for notes/quote/recommend/custom
              tags; editing those stays on the film page. Curated quality
              tags get their own quick-toggle row below, independent of
              this card, so tagging never waits on a "deeper" take existing. */}
          {hasDeeperTake && yourTake && (
            <div className="p-4 border rounded-lg bg-gray-800/50 border-gold-500/10 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-unbounded font-semibold text-gold-400 flex items-center gap-2">
                  <PenLine className="w-4 h-4" />
                  Your Take
                </h4>
                <button
                  onClick={() => router.push(`/films/${slugifyTitle(movie.title)}/${movie.id}`)}
                  className="text-xs font-medium text-gold-300 hover:text-gold-200 transition-colors"
                >
                  Edit
                </button>
              </div>
              {yourTake.favorite_quote && (
                <blockquote className="pl-3 border-l-2 border-gold-500/40 text-sm italic text-gray-300">
                  &ldquo;{yourTake.favorite_quote}&rdquo;
                </blockquote>
              )}
              {yourTake.notes && (
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{yourTake.notes}</p>
              )}
              {customQualityTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {customQualityTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs font-medium bg-gold-900/50 text-gold-300 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {yourTake.would_recommend != null && (
                <div
                  className={`inline-flex items-center gap-1.5 text-sm ${
                    yourTake.would_recommend ? "text-green-300" : "text-red-300"
                  }`}
                >
                  {yourTake.would_recommend ? (
                    <ThumbsUp className="w-3.5 h-3.5" />
                  ) : (
                    <ThumbsDown className="w-3.5 h-3.5" />
                  )}
                  {yourTake.would_recommend ? "Would recommend" : "Wouldn’t recommend"}
                </div>
              )}
            </div>
          )}

          {/* Quick tag toggle — unlocked once seen + rated, the moment
              there's an opinion worth tagging. One-tap, auto-saves per
              toggle (unlike YourTake's manual-save form). */}
          {user && seenIt && ranking != null && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Tag what stood out
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUALITY_TAGS.map((tag) => {
                  const active = (yourTake?.quality_tags ?? []).some(
                    (t) => t.toLowerCase() === tag.toLowerCase()
                  );
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleQualityTag(tag)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                        active
                          ? "bg-gold-500/90 text-gray-900 border-gold-500/90 hover:bg-gold-400"
                          : "bg-transparent text-gray-400 border-gray-700 hover:border-gold-500/40 hover:text-gray-200"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* No deeper take yet — quiet invite to the fuller editor
              (notes, favorite quote, would-recommend) on the film page. */}
          {user && seenIt && expression?.movieId === movie.id && !hasDeeperTake && (
            <button
              onClick={() => router.push(`/films/${slugifyTitle(movie.title)}/${movie.id}`)}
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gold-300 transition-colors"
            >
              <PenLine className="w-3.5 h-3.5" />
              Add your take
            </button>
          )}

          {/* External Links / IDs (Admin only) */}
          {isAdmin && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <span className="font-mono">DB ID: {movie.id}</span>
              </div>
              {film.tmdb_id && (
                <div className="flex items-center gap-3">
                  <a
                    href={`https://www.themoviedb.org/movie/${film.tmdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-gold-300 hover:text-gold-200"
                    title="Open on TMDB"
                  >
                    <ExternalLink className="w-4 h-4" />
                    TMDB: {film.tmdb_id}
                  </a>
                  <button
                    onClick={handleCopyTmdb}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gold-500/10 bg-gray-800/50 hover:bg-gray-700/50 text-xs text-gray-200"
                    title="Copy TMDB ID"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedTmdb ? "Copied" : "Copy"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Cast */}
          {film.cast_list && film.cast_list.length > 0 && (
            <div>
              <h4 className="mb-2 font-unbounded font-semibold text-gold-400">Cast</h4>
              <p className="text-sm text-gray-300">
                {film.cast_list.slice(0, 10).join(", ")}
              </p>
            </div>
          )}

          {/* Where to Watch */}
          {hasProviders && (
            <div>
              <h4 className="mb-2 font-unbounded font-semibold text-gold-400">Where to Watch</h4>
              <WatchProviders providersByRegion={watchProviders} preferredRegion="US" />
            </div>
          )}

          {/* Scores (Admin only) */}
          {isAdmin && (film.imdb_rating || film.metacritic_score) && (
            <div>
              <h4 className="mb-2 font-unbounded font-semibold text-gold-400">Scores</h4>
              <div className="grid grid-cols-2 gap-4">
                {film.imdb_rating && (
                  <div className="p-3 text-center border rounded-lg bg-gray-800/50 border-gold-500/10">
                    <div className="text-xl font-bold text-white">
                      {film.imdb_rating.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-400">IMDb</div>
                  </div>
                )}
                {film.metacritic_score && (
                  <div className="p-3 text-center border rounded-lg bg-gray-800/50 border-gold-500/10">
                    <div className="text-xl font-bold text-white">
                      {film.metacritic_score}
                    </div>
                    <div className="text-xs text-gray-400">Metacritic</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rating modal — opened via Rate button. Rendered inside the
            stopPropagation wrapper (not as a sibling of it): RatingModal
            portals to document.body, but React still bubbles its clicks
            through the REACT tree, not the DOM tree. Nested here, a rating
            tap is stopped by this div's stopPropagation before it can reach
            the outer backdrop's onClose and close the whole modal. */}
        <RatingModal
          isOpen={showRatingModal}
          movieTitle={movie.title}
          posterUrl={normalizeImageUrl((movie.poster_url || '').trim())}
          currentRating={ranking}
          movieYear={movie.release_year ?? undefined}
          movieId={movie.id}
          onRate={(newRanking) => {
            // Don't close here — RatingModal plays its confirmation beat
            // (and the Add-your-take invite) then calls onClose itself.
            // Returning the promise lets RatingModal await the real
            // success/failure instead of assuming it worked.
            return handleRankingChange(newRanking);
          }}
          onClose={() => setShowRatingModal(false)}
        />
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : modal;
}

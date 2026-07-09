"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@supabase/auth-helpers-react";
import Image from "next/image";
import { X, Maximize2, Eye, EyeOff, Film, Clock, Users, Clapperboard, ExternalLink, Copy } from "lucide-react";
import { supabase } from "@/lib/supabaseBrowser";
import RatingModal from "@/components/movie/RatingModal";
import type { Movie } from "@/types/types";
import { normalizeImageUrl } from "@/utils/imageUrl";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { slugifyTitle } from "@/utils/slug";
import { getRatingStyle } from "@/utils/getRatingStyle";

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
  "id, overview, tagline, runtime, genres, director, writer, cast_list, mpaa_rating, tmdb_id, imdb_rating, metacritic_score";

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
  const { isAdmin } = useIsAdmin();
  const [seenIt, setSeenIt] = useState(initialSeenIt);
  const [ranking, setRanking] = useState(initialRanking);
  const [isLoading, setIsLoading] = useState(false);
  const [hasValidImage, setHasValidImage] = useState(true);
  const [copiedTmdb, setCopiedTmdb] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [details, setDetails] = useState<Partial<Movie> | null>(null);

  // Self-hydrate full metadata; the movie prop may be a slim list projection
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setDetails(null);
    supabase
      .from("movies")
      .select(DETAIL_FIELDS)
      .eq("id", movie.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn("Movie detail hydration failed:", error.message);
          return;
        }
        if (data) setDetails(data as Partial<Movie>);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, movie.id]);

  // Hydrated row wins; prop fields fill the gap until the fetch lands
  const film: Movie = { ...movie, ...(details ?? {}) };

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

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Update ranking and refetch latest value from backend
  const updateRanking = async (newRanking: number | null, newSeenIt: boolean) => {
    if (!user) {
      console.error('No user found when trying to update ranking');
      return;
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
        return;
      }

      setRanking(rankingData.ranking ?? null);
      setSeenIt(rankingData.seen_it ?? false);
      // On success, call the onUpdate callback
      onUpdate(movie.id, rankingData.ranking ?? null, rankingData.seen_it ?? false);
    } catch (error) {
      console.error('Caught exception updating ranking:', error);
      setRanking(initialRanking);
      setSeenIt(initialSeenIt);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeenItToggle = () => {
    const newSeenIt = !seenIt;
    setSeenIt(newSeenIt);
    updateRanking(ranking, newSeenIt);
  };

  const handleRankingChange = (newRanking: number | null) => {
    setRanking(newRanking);
    // Auto-mark seen when a positive rating is chosen; preserves manual toggle
    const autoSeenIt = newRanking != null && newRanking >= 1 ? true : seenIt;
    if (autoSeenIt !== seenIt) setSeenIt(autoSeenIt);
    updateRanking(newRanking, autoSeenIt);
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-charcoal-900/80 border border-gold-500/20 rounded-t-2xl sm:rounded-2xl shadow-lg max-w-4xl w-full max-h-[92vh] sm:max-h-[90vh] overflow-y-auto text-gray-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between p-4 border-b sm:p-6 border-gold-500/20 bg-charcoal-900/80 backdrop-blur-sm">
          <div>
            <h2 className="text-2xl font-bold text-gold-400">
              {movie.title}
            </h2>
            <p className="text-gray-400 text-sm">{movie.release_year}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push(`/films/${slugifyTitle(movie.title)}/${movie.id}`)}
              className="p-3 transition-colors rounded-full hover:bg-gray-700/50"
              title="Open full film page"
            >
              <Maximize2 className="w-4 h-4 text-gray-400 hover:text-white" />
            </button>
            <button
              onClick={onClose}
              className="p-2 transition-colors rounded-full hover:bg-gray-700/50"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:gap-6">
            {/* Left Column: Poster & Actions */}
            <div className="md:w-1/3">
              {/* Mobile: poster (2/3) + sidebar (1/3) side by side */}
              {/* Desktop: poster full-width, actions panel below */}
              <div className="flex flex-row gap-3 md:flex-col md:gap-4">

                {/* Poster — 2/3 width on mobile, full on desktop */}
                <div className="w-2/3 flex-shrink-0 md:w-full">
                  <div className="aspect-[2/3] relative bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                    {hasValidImage ? (
                      <Image
                        src={normalizeImageUrl((movie.poster_url || '').trim())}
                        alt={movie.title}
                        fill
                        className="object-cover"
                        onError={() => setHasValidImage(false)}
                      />
                    ) : (
                      <PosterFallback
                        title={movie.title}
                        className="rounded-lg"
                      />
                    )}
                  </div>
                </div>

                {/* Actions panel — 1/3 sidebar on mobile, full-width below poster on desktop */}
                <div className="flex-1 min-w-0">
                  <div className="h-full md:h-auto p-3 md:p-4 border rounded-lg bg-gray-800/50 border-gold-500/10 flex flex-col gap-3 md:gap-4">

                    {/* Seen It Toggle */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 md:gap-0">
                      <span className="text-xs md:text-sm font-medium text-gray-400 md:text-gray-200">Status</span>
                      <button
                        onClick={handleSeenItToggle}
                        disabled={isLoading}
                        className={`
                          flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-medium transition-colors self-start
                          ${seenIt
                            ? 'bg-green-800/50 text-green-300 hover:bg-green-700/50'
                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                          }
                          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        {seenIt ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {seenIt ? "Seen" : "Not Seen"}
                      </button>
                    </div>

                    {/* Rating */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 md:gap-0">
                      <span className="text-xs md:text-sm font-medium text-gray-400 md:text-gray-200">Rating</span>
                      <button
                        type="button"
                        onClick={() => setShowRatingModal(true)}
                        disabled={isLoading}
                        className="font-bold text-base px-3 py-1.5 min-h-[44px] min-w-[44px] rounded-lg border border-gray-700 transition-colors disabled:opacity-50 self-start"
                        style={ranking
                          ? { backgroundColor: getRatingStyle(ranking).background, color: getRatingStyle(ranking).text, borderColor: 'transparent' }
                          : { backgroundColor: 'rgba(55,65,81,0.5)', color: '#9ca3af' }
                        }
                      >
                        {ranking ?? "Rate"}
                      </button>
                    </div>

                    {/* Genres — in sidebar on mobile only */}
                    {film.genres && film.genres.length > 0 && (
                      <div className="md:hidden flex flex-wrap gap-1.5 pt-1">
                        {film.genres.map((genre: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-0.5 text-xs font-medium bg-gold-900/50 text-gold-300 rounded-full"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}

                  </div>
                </div>

              </div>
            </div>

            {/* Right Column: Details */}
            <div className="flex-1 space-y-6">
              {/* Tagline */}
              {film.tagline && (
                <p className="text-sm italic text-gold-300/80">{film.tagline}</p>
              )}

              {/* Overview */}
              {film.overview && (
                <div>
                  <h4 className="mb-2 font-semibold text-gold-400">Overview</h4>
                  <p className="text-sm leading-relaxed text-gray-300">
                    {film.overview}
                  </p>
                </div>
              )}

              {/* Hydration placeholder — keeps the panel from looking empty while details load */}
              {!details && !film.overview && (
                <div className="space-y-2 animate-pulse" aria-hidden="true">
                  <div className="h-4 w-24 rounded bg-gray-800" />
                  <div className="h-3 w-full rounded bg-gray-800/70" />
                  <div className="h-3 w-5/6 rounded bg-gray-800/70" />
                  <div className="h-3 w-2/3 rounded bg-gray-800/70" />
                </div>
              )}

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                {film.runtime && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gold-500/80" />
                    <span className="text-gray-300">{film.runtime} min</span>
                  </div>
                )}
                {film.mpaa_rating && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gold-500/80" />
                    <span className="text-gray-300">Rated {film.mpaa_rating}</span>
                  </div>
                )}
                {film.director && (
                  <div className="flex items-center col-span-2 gap-2 sm:col-span-1">
                    <Clapperboard className="w-4 h-4 text-gold-500/80" />
                    <span className="text-gray-300 truncate" title={`Directed by ${film.director}`}>
                      {film.director}
                    </span>
                  </div>
                )}
                {film.writer && film.writer !== film.director && (
                  <div className="flex items-center col-span-2 gap-2 sm:col-span-1">
                    <Users className="w-4 h-4 text-gold-500/80" />
                    <span className="text-gray-300 truncate" title={`Written by ${film.writer}`}>
                      {film.writer}
                    </span>
                  </div>
                )}
              </div>

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

              {/* Genres — desktop only (mobile shows genres in the sidebar) */}
              {film.genres && film.genres.length > 0 && (
                <div className="hidden md:block">
                  <h4 className="mb-2 font-semibold text-gold-400">Genres</h4>
                  <div className="flex flex-wrap gap-2">
                    {film.genres.map((genre: string, index: number) => (
                      <span
                        key={index}
                        className="px-2.5 py-1 text-xs font-medium bg-gold-900/50 text-gold-300 rounded-full"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Cast */}
              {film.cast_list && film.cast_list.length > 0 && (
                <div>
                  <h4 className="mb-2 font-semibold text-gold-400">Cast</h4>
                  <p className="text-sm text-gray-300">
                    {film.cast_list.slice(0, 10).join(", ")}
                  </p>
                </div>
              )}

              {/* Scores (Admin only) */}
              {isAdmin && (film.imdb_rating || film.metacritic_score) && (
                <div>
                  <h4 className="mb-2 font-semibold text-gold-400">Scores</h4>
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
          </div>
        </div>
      </div>

      {/* Rating modal — opened via Rate button */}
      <RatingModal
        isOpen={showRatingModal}
        movieTitle={movie.title}
        posterUrl={normalizeImageUrl((movie.poster_url || '').trim())}
        currentRating={ranking}
        movieYear={movie.release_year ?? undefined}
        onRate={(newRanking) => {
          handleRankingChange(newRanking);
          setShowRatingModal(false);
        }}
        onClose={() => setShowRatingModal(false)}
      />
    </div>
  );
}

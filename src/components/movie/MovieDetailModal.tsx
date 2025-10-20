"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import Image from "next/image";
import { X, Eye, EyeOff, Film, Clock, Users, Clapperboard, Maximize2 } from "lucide-react";
import Link from "next/link";
import { movieSlug } from "@/utils/slug";
import { supabase } from "@/lib/supabaseBrowser";
import RankingDropdown from "@/components/movie/RankingDropdown";
import type { Movie } from "@/types/types";
import { normalizeImageUrl } from "@/utils/imageUrl";

interface MovieDetailModalProps {
  movie: Movie;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (movieId: number, newRanking: number | null, newSeenIt: boolean) => void;
  initialRanking?: number | null;
  initialSeenIt?: boolean;
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
  const [seenIt, setSeenIt] = useState(initialSeenIt);
  const [ranking, setRanking] = useState(initialRanking);
  const [isLoading, setIsLoading] = useState(false);
  const [hasValidImage, setHasValidImage] = useState(true);

  // Reset state when modal opens with new movie
  useEffect(() => {
    if (isOpen) {
      setSeenIt(initialSeenIt);
      setRanking(initialRanking);
      const raw = (movie.cached_poster_url?.trim() || movie.poster_url || '').trim();
      const normalized = normalizeImageUrl(raw);
      setHasValidImage(Boolean(normalized && !normalized.includes('placeholder')));
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
      // Upsert ranking
      const { error } = await supabase.from('rankings').upsert({
        user_id: user.id,
        movie_id: movie.id,
        ranking: newRanking,
        seen_it: newSeenIt,
      }, { onConflict: 'user_id,movie_id' });

      if (error) {
        console.error('Error updating ranking:', error);
        setRanking(initialRanking);
        setSeenIt(initialSeenIt);
        return;
      }

      // Refetch latest ranking from backend
      const { data: rankingData, error: fetchError } = await supabase
        .from('rankings')
        .select('ranking, seen_it')
        .eq('user_id', user.id)
        .eq('movie_id', movie.id)
        .single();

      if (fetchError || !rankingData) {
        console.error('Error fetching updated ranking:', fetchError);
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
    updateRanking(newRanking, seenIt);
  };

  // Removed unused handleRankingClear function

  if (!isOpen) return null;


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-900/80 border border-yellow-500/20 rounded-2xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto text-gray-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between p-4 border-b sm:p-6 border-yellow-500/20 bg-gray-900/80 backdrop-blur-sm">
          <div>
            <h2 className="text-2xl font-bold text-yellow-400">
              {movie.title}
            </h2>
            <p className="text-gray-400 text-md">{movie.release_year}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/films/${movieSlug(movie.title, movie.id)}`}
              className="p-2 transition-colors rounded-full hover:bg-gray-700/50"
              title="Open full page"
            >
              <Maximize2 className="w-5 h-5 text-gray-300" />
            </Link>
            <button
              onClick={onClose}
              className="p-2 transition-colors rounded-full hover:bg-gray-700/50"
            >
              <X className="w-6 h-6 text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          <div className="flex flex-col gap-6 md:flex-row">
            {/* Left Column: Poster & Actions */}
            <div className="w-full space-y-4 md:w-1/3">
              <div className="aspect-[2/3] relative bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                {hasValidImage ? (
                  <Image
                    src={normalizeImageUrl((movie.cached_poster_url?.trim() || movie.poster_url || '').trim())}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    unoptimized
                    onError={() => setHasValidImage(false)}
                  />
                ) : (
                  <PosterFallback
                    title={movie.title}
                    className="rounded-lg"
                  />
                )}
              </div>
              
              {/* Actions */}
              <div className="p-4 space-y-4 border rounded-lg bg-gray-800/50 border-yellow-500/10">
                {/* Seen It Toggle */}
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-200">Status</span>
                  <button
                    onClick={handleSeenItToggle}
                    disabled={isLoading}
                    className={`
                      flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                      ${seenIt 
                        ? 'bg-green-800/50 text-green-300 hover:bg-green-700/50' 
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                      }
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {seenIt ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    {seenIt ? "Seen" : "Not Seen"}
                  </button>
                </div>

                {/* Rating */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-200">Your Rating</span>
                    <RankingDropdown
                      ranking={ranking}
                      onChange={handleRankingChange}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Details */}
            <div className="flex-1 space-y-6">
              {/* Overview */}
              {movie.overview && (
                <div>
                  <h4 className="mb-2 font-semibold text-yellow-400">Overview</h4>
                  <p className="text-sm leading-relaxed text-gray-300">
                    {movie.overview}
                  </p>
                </div>
              )}

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                {movie.runtime && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-500/80" />
                    <span className="text-gray-300">{movie.runtime} min</span>
                  </div>
                )}
                {movie.mpaa_rating && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-yellow-500/80" />
                    <span className="text-gray-300">Rated {movie.mpaa_rating}</span>
                  </div>
                )}
                {movie.director && (
                  <div className="flex items-center col-span-2 gap-2 sm:col-span-1">
                    <Clapperboard className="w-4 h-4 text-yellow-500/80" />
                    <span className="text-gray-300 truncate" title={movie.director}>
                      {movie.director}
                    </span>
                  </div>
                )}
              </div>

              {/* Genres */}
              {movie.genres && movie.genres.length > 0 && (
                <div>
                  <h4 className="mb-2 font-semibold text-yellow-400">Genres</h4>
                  <div className="flex flex-wrap gap-2">
                    {movie.genres.map((genre: string, index: number) => (
                      <span
                        key={index}
                        className="px-2.5 py-1 text-xs font-medium bg-yellow-900/50 text-yellow-300 rounded-full"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Cast */}
              {movie.cast_list && movie.cast_list.length > 0 && (
                <div>
                  <h4 className="mb-2 font-semibold text-yellow-400">Cast</h4>
                  <p className="text-sm text-gray-300">
                    {movie.cast_list.slice(0, 10).join(", ")}
                  </p>
                </div>
              )}

              {/* Scores */}
              {(movie.imdb_rating || movie.metacritic_score) && (
                <div>
                  <h4 className="mb-2 font-semibold text-yellow-400">Scores</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {movie.imdb_rating && (
                      <div className="p-3 text-center border rounded-lg bg-gray-800/50 border-yellow-500/10">
                        <div className="text-xl font-bold text-white">
                          {movie.imdb_rating.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-400">IMDb</div>
                      </div>
                    )}
                    {movie.metacritic_score && (
                      <div className="p-3 text-center border rounded-lg bg-gray-800/50 border-yellow-500/10">
                        <div className="text-xl font-bold text-white">
                          {movie.metacritic_score}
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
    </div>
  );
}

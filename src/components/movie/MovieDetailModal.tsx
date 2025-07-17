"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import Image from "next/image";
import { X, Eye, EyeOff, Star, Film, Clock, Calendar, Users, Clapperboard } from "lucide-react";
import { supabase } from "@/lib/supabaseBrowser";
import { getRatingStyle } from "@/utils/getRatingStyle";
import RankingDropdown from "@/components/movie/RankingDropdown";
import type { Movie } from "@/types/types";

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
    <div className="text-sm font-medium text-center px-4">
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
      setHasValidImage(Boolean(movie.poster_url && movie.poster_url.trim() !== '' && !movie.poster_url.includes('placeholder')));
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

  const updateRanking = async (newRanking: number | null, newSeenIt: boolean) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from('rankings').upsert({
        user_id: user.id,
        movie_id: movie.id,
        ranking: newRanking,
        seen_it: newSeenIt,
      });

      if (error) {
        console.error('Error updating ranking:', error);
        // Revert state on error
        setRanking(initialRanking);
        setSeenIt(initialSeenIt);
      } else {
        // On success, call the onUpdate callback
        onUpdate(movie.id, newRanking, newSeenIt);
      }
    } catch (error) {
      console.error('Error updating ranking:', error);
      // Revert state on error
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

  const handleRankingClear = () => {
    setRanking(null);
    updateRanking(null, seenIt);
  };

  if (!isOpen) return null;

  const ratingStyle = getRatingStyle(ranking ?? 0);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-900/80 border border-yellow-500/20 rounded-2xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto text-gray-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-yellow-500/20 sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10">
          <div>
            <h2 className="text-2xl font-bold text-yellow-400">
              {movie.title}
            </h2>
            <p className="text-md text-gray-400">{movie.release_year}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left Column: Poster & Actions */}
            <div className="w-full md:w-1/3 space-y-4">
              <div className="aspect-[2/3] relative bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                {hasValidImage ? (
                  <Image
                    src={movie.poster_url}
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
              <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg border border-yellow-500/10">
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
                  <h4 className="font-semibold text-yellow-400 mb-2">Overview</h4>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {movie.overview}
                  </p>
                </div>
              )}

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
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
                  <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
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
                  <h4 className="font-semibold text-yellow-400 mb-2">Genres</h4>
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
                  <h4 className="font-semibold text-yellow-400 mb-2">Cast</h4>
                  <p className="text-sm text-gray-300">
                    {movie.cast_list.slice(0, 10).join(", ")}
                  </p>
                </div>
              )}

              {/* Scores */}
              {(movie.imdb_rating || movie.metacritic_score) && (
                <div>
                  <h4 className="font-semibold text-yellow-400 mb-2">Scores</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {movie.imdb_rating && (
                      <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-yellow-500/10">
                        <div className="text-xl font-bold text-white">
                          {movie.imdb_rating.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-400">IMDb</div>
                      </div>
                    )}
                    {movie.metacritic_score && (
                      <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-yellow-500/10">
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

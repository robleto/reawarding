"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import Image from "next/image";
import { X, Eye, EyeOff, Star, Film, Clock, Calendar, Users } from "lucide-react";
import { supabase } from "@/lib/supabaseBrowser";
import { getRatingStyle } from "@/utils/getRatingStyle";
import type { Movie } from "@/types/types";

interface MovieDetailModalProps {
  movie: Movie;
  isOpen: boolean;
  onClose: () => void;
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
  <div className={`flex flex-col items-center justify-center bg-gray-100 text-gray-400 w-full h-full ${className}`}>
    <Film className="w-12 h-12 mb-2" />
    <div className="text-sm font-medium text-center px-4">
      {title}
    </div>
  </div>
);

export default function MovieDetailModal({
  movie,
  isOpen,
  onClose,
  initialRanking = null,
  initialSeenIt = false,
}: MovieDetailModalProps) {
  const user = useUser();
  const [seenIt, setSeenIt] = useState(initialSeenIt);
  const [ranking, setRanking] = useState(initialRanking);
  const [isLoading, setIsLoading] = useState(false);
  const [hasValidImage, setHasValidImage] = useState(true);
  const [movieDetails, setMovieDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Reset state when modal opens with new movie
  useEffect(() => {
    if (isOpen) {
      setSeenIt(initialSeenIt);
      setRanking(initialRanking);
      setHasValidImage(Boolean(movie.poster_url && movie.poster_url.trim() !== '' && !movie.poster_url.includes('placeholder')));
      
      // Fetch additional movie details
      fetchMovieDetails();
    }
  }, [isOpen, movie, initialRanking, initialSeenIt]);

  // Mock function to simulate TMDB API call
  const fetchMovieDetails = async () => {
    setLoadingDetails(true);
    try {
      // In a real implementation, this would call TMDB API
      // For now, we'll create mock data based on the movie
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      
      const mockDetails = {
        overview: "A gripping tale of drama and emotion that captivates audiences with its compelling storyline and outstanding performances. This film explores themes of love, loss, and redemption in a way that resonates with viewers long after the credits roll.",
        runtime: 135,
        genres: ["Drama", "Romance", "Thriller"],
        director: "Jane Director",
        cast: ["Actor One", "Actor Two", "Actor Three"],
        rating: "PG-13",
        budget: 45000000,
        revenue: 187000000,
        imdb_rating: 7.8,
        metacritic_score: 82
      };
      
      setMovieDetails(mockDetails);
    } catch (error) {
      console.error('Error fetching movie details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

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

  const handleRankingChange = (newRanking: number) => {
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
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Movie Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Poster */}
            <div className="w-full md:w-1/3">
              <div className="aspect-[2/3] relative bg-gray-100 rounded-lg overflow-hidden">
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
            </div>

            {/* Details */}
            <div className="flex-1">
              <div className="space-y-4">
                {/* Title and Year */}
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-1">
                    {movie.title}
                  </h3>
                  <p className="text-lg text-gray-600">
                    {movie.release_year}
                  </p>
                </div>

                {/* Seen It Toggle */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSeenItToggle}
                    disabled={isLoading}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                      ${seenIt 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {seenIt ? (
                      <>
                        <Eye className="w-5 h-5" />
                        Seen It
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-5 h-5" />
                        Haven't Seen
                      </>
                    )}
                  </button>
                  
                  {seenIt && (
                    <span className="text-sm text-gray-500">
                      You've watched this movie
                    </span>
                  )}
                </div>

                {/* Rating */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <span className="font-medium text-gray-900">Your Rating</span>
                    {ranking && (
                      <span
                        className="px-2 py-1 text-sm font-bold rounded"
                        style={{ backgroundColor: ratingStyle.background, color: ratingStyle.text }}
                      >
                        {ranking}
                      </span>
                    )}
                  </div>
                  
                  {/* Rating Select */}
                  <div className="flex items-center gap-3">
                    <select
                      value={ranking ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          handleRankingClear();
                        } else {
                          handleRankingChange(parseInt(value));
                        }
                      }}
                      disabled={isLoading}
                      className={`
                        px-3 py-2 text-sm font-bold rounded-lg border border-gray-300 
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      style={{ 
                        backgroundColor: ranking ? ratingStyle.background : '#f9fafb', 
                        color: ranking ? ratingStyle.text : '#374151'
                      }}
                    >
                      <option value="">Select Rating</option>
                      {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((rating) => {
                        const optStyle = getRatingStyle(rating);
                        return (
                          <option
                            key={rating}
                            value={rating}
                            style={{ backgroundColor: optStyle.background, color: optStyle.text }}
                          >
                            {rating}
                          </option>
                        );
                      })}
                    </select>
                    
                    {ranking && (
                      <button
                        onClick={handleRankingClear}
                        disabled={isLoading}
                        className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  
                  {!ranking && (
                    <p className="text-sm text-gray-500">
                      Rate this movie from 1-10
                    </p>
                  )}
                </div>

                {/* Summary placeholder */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium text-gray-900 mb-3">Movie Information</h4>
                  
                  {loadingDetails ? (
                    <div className="space-y-3">
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  ) : movieDetails ? (
                    <div className="space-y-4">
                      {/* Overview */}
                      <div>
                        <h5 className="font-medium text-gray-800 mb-2">Overview</h5>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {movieDetails.overview ?? "N/A"}
                        </p>
                      </div>
                      {/* Quick Info Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {movieDetails.runtime ?? "N/A"} min
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {movieDetails.release_year ?? "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {movieDetails.mpaa_rating ?? "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm text-gray-600">
                            IMDb: {movieDetails.imdb_rating ?? "N/A"}/10
                          </span>
                        </div>
                      </div>
                      {/* Genres */}
                      <div>
                        <h5 className="font-medium text-gray-800 mb-2">Genres</h5>
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(movieDetails.genres) && movieDetails.genres.length > 0 ? (
                            movieDetails.genres.map((genre: string, index: number) => (
                              <span
                                key={index}
                                className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full"
                              >
                                {genre}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-600">N/A</span>
                          )}
                        </div>
                      </div>
                      {/* Director & Cast */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium text-gray-800 mb-2">Director</h5>
                          <p className="text-sm text-gray-600">{movieDetails.director ?? "N/A"}</p>
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-800 mb-2">Cast</h5>
                          <p className="text-sm text-gray-600">
                            {Array.isArray(movieDetails.cast_list) && movieDetails.cast_list.length > 0 ? movieDetails.cast_list.join(", ") : "N/A"}
                          </p>
                        </div>
                      </div>
                      {/* Scores */}
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-bold text-gray-900">
                            {movieDetails.imdb_rating ?? "N/A"}
                          </div>
                          <div className="text-xs text-gray-500">IMDb Rating</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-bold text-gray-900">
                            {movieDetails.metacritic_score ?? "N/A"}
                          </div>
                          <div className="text-xs text-gray-500">Metacritic Score</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600 text-sm">
                      Unable to load additional movie information.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

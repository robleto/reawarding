"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import type { Database } from "@/types/supabase";
import type { Movie } from "@/types/types";
import { Search, X, Film } from "lucide-react";

// Fallback component for missing images
const ImageFallback = ({ 
  width, 
  height, 
  title, 
  className = "" 
}: { 
  width: number; 
  height: number; 
  title: string; 
  className?: string; 
}) => (
  <div 
    className={`flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 ${className}`}
    style={{ width, height }}
  >
    <div className="text-center">
      <Film className="w-3 h-3 mx-auto mb-1" />
      <div className="text-xs font-medium truncate px-1" style={{ maxWidth: width - 8 }}>
        {title.split(' ').slice(0, 2).join(' ')}
      </div>
    </div>
  </div>
);

interface AddMovieModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMovie: () => void;
  existingMovieIds: string[]; // Changed from number[] to string[]
  listId: string;
}

export default function AddMovieModal({
  isOpen,
  onClose,
  onAddMovie,
  existingMovieIds,
  listId,
}: AddMovieModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedMovies, setSelectedMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  
  const supabase = useSupabaseClient<Database>();

  // Search for movie suggestions
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSuggestions([]);
      return;
    }

    const searchMovies = async () => {
      setLoading(true);
      
      let query = supabase
        .from("movies")
        .select("*")
        .ilike("title", `%${searchTerm}%`)
        .limit(10);

      // Only add the exclusion filter if there are existing movies
      if (existingMovieIds.length > 0) {
        query = query.not("id", "in", `(${existingMovieIds.join(",")})`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error searching movies:", error.message);
        setSuggestions([]);
      } else {
        const moviesWithEmptyRankings = (data || []).map(movie => ({
          ...movie,
          rankings: [],
          thumb_url: movie.thumb_url || "",
        })) as Movie[];
        setSuggestions(moviesWithEmptyRankings);
      }
      setLoading(false);
    };

    const debounceTimer = setTimeout(searchMovies, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, existingMovieIds, supabase]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(!!value);
  };

  const handleSuggestionClick = (movie: Movie) => {
    setSelectedMovies(prev => {
      const isSelected = prev.some(m => m.id === movie.id);
      if (isSelected) {
        return prev.filter(m => m.id !== movie.id);
      } else {
        return [...prev, movie];
      }
    });
    setSearchTerm("");
    setShowSuggestions(false);
  };

  const handleRemoveSelected = (movieId: number) => {
    setSelectedMovies(prev => prev.filter(m => m.id !== movieId));
  };

  const handleAddSelectedMovies = async () => {
    if (selectedMovies.length === 0) return;

    try {
      // Get the current max ranking for proper ordering
      const { data: maxRankingData } = await supabase
        .from("movie_list_items")
        .select("ranking")
        .eq("list_id", listId)
        .order("ranking", { ascending: false })
        .limit(1);

      const maxRanking = maxRankingData?.[0]?.ranking || 0;

      // Add each selected movie to the list
      const itemsToInsert = selectedMovies.map((movie, index) => ({
        list_id: listId,
        movie_id: movie.id,
        ranking: maxRanking + index + 1,
        seen_it: false,
        score: null,
      }));

      const { error } = await supabase
        .from("movie_list_items")
        .insert(itemsToInsert);

      if (error) {
        console.error("Error adding movies to list:", error.message);
        return;
      }

      // Notify parent component about the added movies
      onAddMovie();
      
      // Close modal and reset state
      handleClose();
    } catch (err) {
      console.error("Error adding movies:", err);
    }
  };

  const handleClose = () => {
    setSearchTerm("");
    setSuggestions([]);
    setSelectedMovies([]);
    setShowSuggestions(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Movies to List</h2>
            <Button onClick={handleClose} variant="ghost">
              <X className="w-6 h-6" />
            </Button>
          </div>
          
          {/* Search Input with Autocomplete */}
          <div className="mt-4 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search for movies to add..."
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => setShowSuggestions(!!searchTerm)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                autoFocus
              />
            </div>
            
            {/* Autocomplete Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-30 left-0 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg mt-1 shadow-lg max-h-64 overflow-y-auto">
                {suggestions.map((movie) => {
                  const isSelected = selectedMovies.some(m => m.id === movie.id);
                  const hasValidImage = movie.thumb_url && movie.thumb_url !== "";
                  
                  return (
                    <li
                      key={movie.id}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors ${
                        isSelected 
                          ? "bg-blue-50 dark:bg-blue-900/20" 
                          : "hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                      onMouseDown={() => handleSuggestionClick(movie)}
                    >
                      {/* Movie Thumbnail */}
                      <div className="flex-shrink-0">
                        {hasValidImage ? (
                          <img
                            src={movie.thumb_url}
                            alt={movie.title}
                            className="w-16 h-12 object-contain rounded shadow-sm bg-gray-100 dark:bg-gray-700"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        {!hasValidImage && (
                          <ImageFallback
                            width={64}
                            height={48}
                            title={movie.title}
                            className="rounded shadow-sm"
                          />
                        )}
                      </div>
                      
                      {/* Movie Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 dark:text-white truncate">{movie.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{movie.release_year}</div>
                      </div>
                      
                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="flex-shrink-0">
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
                <li className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  Can't find your movie? <a href="/help/add-movie" className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300">Learn how to add it</a>
                </li>
              </ul>
            )}
            
            {/* No Results Message */}
            {showSuggestions && searchTerm.length >= 2 && suggestions.length === 0 && !loading && (
              <div className="absolute z-30 left-0 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg mt-1 shadow-lg">
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No movies found for "{searchTerm}"</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Can't find your movie? <a href="/help/add-movie" className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300">Learn how to add it</a>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selected Movies */}
        <div className="flex-1 overflow-y-auto">
          {selectedMovies.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600">
                <Search className="w-full h-full" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">
                Search and select movies to add to your list
              </p>
            </div>
          ) : (
            <div className="p-6">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                Selected Movies ({selectedMovies.length})
              </h3>
              <div className="space-y-3">
                {selectedMovies.map((movie) => {
                  const hasValidImage = movie.thumb_url && movie.thumb_url !== "";
                  
                  return (
                    <div
                      key={movie.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      {/* Movie Thumbnail */}
                      <div className="flex-shrink-0">
                        {hasValidImage ? (
                          <img
                            src={movie.thumb_url}
                            alt={movie.title}
                            className="w-16 h-12 object-contain rounded shadow-sm bg-gray-100 dark:bg-gray-700"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        {!hasValidImage && (
                          <ImageFallback
                            width={64}
                            height={48}
                            title={movie.title}
                            className="rounded shadow-sm"
                          />
                        )}
                      </div>
                      
                      {/* Movie Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">{movie.title}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{movie.release_year}</p>
                      </div>
                      
                      {/* Remove Button */}
                      <Button
                        onClick={() => handleRemoveSelected(movie.id)}
                        variant="icon"
                        className="flex-shrink-0"
                        title="Remove from selection"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedMovies.length > 0 
                ? `${selectedMovies.length} movie${selectedMovies.length !== 1 ? "s" : ""} selected`
                : "No movies selected"
              }
            </p>
            <div className="flex gap-3">
              <Button onClick={handleClose} variant="secondary">
                Cancel
              </Button>
              <Button
                onClick={handleAddSelectedMovies}
                disabled={selectedMovies.length === 0}
                variant="primary"
              >
                Add to List
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

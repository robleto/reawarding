"use client";

import { useState, useEffect } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import type { Database } from "@/types/supabase";
import type { Movie } from "@/types/types";

interface AddMovieModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMovie: (movie: Movie) => void;
  existingMovieIds: number[];
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
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMovies, setSelectedMovies] = useState<Movie[]>([]);
  
  const supabase = useSupabaseClient<Database>();

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setMovies([]);
      setSelectedMovies([]);
      return;
    }

    const searchMovies = async () => {
      if (searchTerm.length < 2) {
        setMovies([]);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .ilike("title", `%${searchTerm}%`)
        .not("id", "in", `(${existingMovieIds.join(",") || "0"})`)
        .limit(20);

      if (error) {
        console.error("Error searching movies:", error.message);
        setMovies([]);
      } else {
        const moviesWithEmptyRankings = (data || []).map(movie => ({
          ...movie,
          rankings: [],
          thumb_url: movie.thumb_url || "",
        })) as Movie[];
        setMovies(moviesWithEmptyRankings);
      }
      setLoading(false);
    };

    const debounceTimer = setTimeout(searchMovies, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, isOpen, existingMovieIds, supabase]);

  const handleToggleMovie = (movie: Movie) => {
    setSelectedMovies(prev => {
      const isSelected = prev.some(m => m.id === movie.id);
      if (isSelected) {
        return prev.filter(m => m.id !== movie.id);
      } else {
        return [...prev, movie];
      }
    });
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
      selectedMovies.forEach(movie => onAddMovie(movie));
      
      // Close modal and reset state
      onClose();
    } catch (err) {
      console.error("Error adding movies:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Add Movies to List</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Search Input */}
          <div className="mt-4">
            <input
              type="text"
              placeholder="Search for movies to add..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {searchTerm.length < 2 ? (
            <p className="text-center text-gray-500 py-8">
              Type at least 2 characters to search for movies
            </p>
          ) : loading ? (
            <p className="text-center text-gray-500 py-8">Searching...</p>
          ) : movies.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No movies found for &quot;{searchTerm}&quot;
            </p>
          ) : (
            <div className="space-y-3">
              {movies.map((movie) => {
                const isSelected = selectedMovies.some(m => m.id === movie.id);
                return (
                  <div
                    key={movie.id}
                    onClick={() => handleToggleMovie(movie)}
                    className={`flex items-center gap-4 p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <img
                      src={movie.thumb_url}
                      alt={movie.title}
                      className="w-16 h-24 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder-movie.jpg";
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{movie.title}</h3>
                      <p className="text-sm text-gray-600">{movie.release_year}</p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleMovie(movie)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedMovies.length > 0 && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedMovies.length} movie{selectedMovies.length !== 1 ? "s" : ""} selected
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSelectedMovies}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add to List
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

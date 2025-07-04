"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { Edit3, Save, X, AlertCircle, RotateCcw } from "lucide-react";
import MovieCard from "./MovieCard";
import WinnerCard from "./WinnerCard";
import MovieDetailModal from "../movie/MovieDetailModal";
import type { Movie } from "@/types/types";

interface EditableYearSectionProps {
  year: string;
  movies: Movie[]; // Default nominees (top 10 ranked 7+)
  winner?: Movie | null; // Default winner (highest ranked among nominees)
  allMoviesForYear: Movie[]; // All movies for this year that user has ranked
}

export default function EditableYearSection({
  year,
  movies,
  winner,
  allMoviesForYear,
}: EditableYearSectionProps) {
  const user = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [nominees, setNominees] = useState<Movie[]>([]);
  const [selectedWinner, setSelectedWinner] = useState<Movie | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingNominations, setLoadingNominations] = useState(false);
  const [hasCustomNominations, setHasCustomNominations] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Current display nominees and winner (either custom or default)
  const [currentNominees, setCurrentNominees] = useState<Movie[]>(movies);
  const [currentWinner, setCurrentWinner] = useState<Movie | null>(winner || null);

  const loadExistingNominations = useCallback(async () => {
    setLoadingNominations(true);
    try {
      const response = await fetch(`/api/awards?year=${year}`);
      if (response.ok) {
        const data = await response.json();
        if (data.nominations) {
          // User has custom nominations - use them for display
          const nomineeMovies = data.nominations.nominee_ids
            .map((id: number) => allMoviesForYear.find(m => Number(m.id) === id))
            .filter(Boolean) as Movie[];
          
          const winnerMovie = data.nominations.winner_id 
            ? nomineeMovies.find(m => Number(m.id) === data.nominations.winner_id) || null
            : null;
          
          // Update current display to show custom nominations
          setCurrentNominees(nomineeMovies);
          setCurrentWinner(winnerMovie);
          setHasCustomNominations(true);
          
          // Set edit state (used when entering edit mode)
          setNominees(nomineeMovies);
          setSelectedWinner(winnerMovie);
        } else {
          // No custom nominations - use defaults
          setHasCustomNominations(false);
          setCurrentNominees(movies);
          setCurrentWinner(winner || null);
        }
      } else {
        console.warn('Failed to load nominations:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading nominations:', error);
      setError('Failed to load existing nominations');
    } finally {
      setLoadingNominations(false);
    }
  }, [year, allMoviesForYear, movies, winner]);

  // Load custom nominations on component mount
  useEffect(() => {
    if (user) {
      loadExistingNominations();
    }
  }, [user, loadExistingNominations]);

  // Update current display when props change
  useEffect(() => {
    if (!hasCustomNominations) {
      setCurrentNominees(movies);
      setCurrentWinner(winner || null);
    }
  }, [movies, winner, hasCustomNominations]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/awards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year,
          nominee_ids: nominees.map(m => Number(m.id)),
          winner_id: selectedWinner ? Number(selectedWinner.id) : null,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save nominations';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Save successful:', result);

      // Update current display with saved nominations
      setCurrentNominees(nominees);
      setCurrentWinner(selectedWinner);
      setHasCustomNominations(true);
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving nominations:', error);
      setError(error instanceof Error ? error.message : 'Failed to save nominations');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenModal = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMovie(null);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
    
    // Initialize edit state with current display
    setNominees(currentNominees);
    setSelectedWinner(currentWinner);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setNominees([]);
    setSelectedWinner(null);
  };

  const handleResetToDefault = () => {
    // Reset to default nominees and winner
    setNominees(movies);
    setSelectedWinner(winner || null);
    
    setError(null);
  };

  if (loadingNominations) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
          <span className="ml-2 text-gold">Loading nominations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-charcoal/50 backdrop-blur-sm rounded-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gold">{year} - Best Picture</h2>
        {user && (
          <div className="flex items-center gap-2">
            {!isEditing && hasCustomNominations && (
              <span className="text-sm text-gold bg-gold/20 px-2 py-1 rounded">
                Custom
              </span>
            )}
            {!isEditing && !hasCustomNominations && (
              <span className="text-sm text-gray-400 bg-gray-400/20 px-2 py-1 rounded">
                Default
              </span>
            )}
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 bg-gold text-black rounded-lg hover:bg-gold/90 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-200">{error}</span>
        </div>
      )}

      {/* Winner Display */}
      {currentWinner && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gold mb-3 flex items-center gap-2">
            <span className="text-gold">👑</span>
            Winner
          </h3>
          <WinnerCard 
            title={currentWinner.title}
            poster_url={currentWinner.poster_url}
            rating={currentWinner.rankings?.[0]?.ranking || 0}
            onClick={() => handleOpenModal(currentWinner)} 
          />
        </div>
      )}

      {/* Nominees Display */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gold mb-3">
          Nominees ({currentNominees.length})
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {currentNominees.map((movie) => (
            <MovieCard
              key={movie.id}
              title={movie.title}
              imageUrl={movie.thumb_url}
              rating={movie.rankings?.[0]?.ranking || 0}
              onClick={() => handleOpenModal(movie)}
            />
          ))}
        </div>
      </div>

      {/* Edit Mode - simplified without drag and drop for now */}
      {isEditing && (
        <div className="border-t border-gray-600 pt-6">
          <div className="mb-4">
            <button
              onClick={handleResetToDefault}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Default
            </button>
          </div>
          <div className="text-center text-gray-400">
            Edit mode simplified - Drag and drop functionality temporarily disabled due to import issues
          </div>
        </div>
      )}

      {/* Movie Detail Modal */}
      {selectedMovie && (
        <MovieDetailModal
          movie={selectedMovie}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

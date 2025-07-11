"use client";

import React, { useState, useEffect } from "react";
import { supabase } from '@/lib/supabaseBrowser';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Edit3, Save, X, AlertCircle, RotateCcw } from "lucide-react";
import MovieCard from "./MovieCard";
import WinnerCard from "./WinnerCard";
import DraggableNomineeCard from "./DraggableNomineeCard";
import SelectableMovieItem from "./SelectableMovieItem";
import MovieDetailModal from "../movie/MovieDetailModal";

interface Movie {
  id: string;
  title: string;
  thumb_url: string;
  poster_url: string;
  ranking: number;
  release_year?: number;
  created_at?: string;
  rankings?: any[];
}

interface AwardNomination {
  nominee_ids: number[];
  winner_id: number | null;
}

interface EditableYearSectionProps {
  year: string;
  movies: Movie[]; // Default nominees (top 10 ranked 7+)
  winner?: Movie | null; // Default winner (highest ranked among nominees)
  allMoviesForYear: Movie[]; // All movies for this year that user has ranked
}

import type { User } from '@supabase/supabase-js';

function useSupabaseUser() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        setUser(null);
      } else {
        setUser(data.user);
      }
    };
    getUser();
  }, []);
  return user;
}

export default function EditableYearSection({
  year,
  movies,
  winner,
  allMoviesForYear,
}: EditableYearSectionProps) {
  const user = useSupabaseUser();
  console.log('EditableYearSection user:', user);
  const [isEditing, setIsEditing] = useState(false);
  const [nominees, setNominees] = useState<Movie[]>([]);
  const [selectedWinner, setSelectedWinner] = useState<Movie | null>(null);
  const [availableMovies, setAvailableMovies] = useState<Movie[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingNominations, setLoadingNominations] = useState(false);
  const [hasCustomNominations, setHasCustomNominations] = useState(false);

  // Modal state
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Current display nominees and winner (either custom or default)
  const [currentNominees, setCurrentNominees] = useState<Movie[]>(movies);
  const [currentWinner, setCurrentWinner] = useState<Movie | null>(winner || null);

  // Load custom nominations on component mount
  useEffect(() => {
    if (user) {
      loadExistingNominations();
    }
  }, [user, year]);

  // Remove this effect to prevent overwriting currentNominees/currentWinner after nominations load
  // useEffect(() => {
  //   if (!hasCustomNominations) {
  //     setCurrentNominees(movies);
  //     setCurrentWinner(winner || null);
  //   }
  // }, [movies, winner, hasCustomNominations]);

  const loadExistingNominations = async () => {
    setLoadingNominations(true);
    try {
      const response = await fetch(`/api/awards?year=${year}`);
      if (response.ok) {
        const data = await response.json();
        if (data.nominations && data.nominations.nominee_ids && data.nominations.nominee_ids.length > 0) {
          // User has custom nominations - use them for display
          const nomineeMovies = data.nominations.nominee_ids
            .map((id: string) => allMoviesForYear.find(m => m.id === id))
            .filter(Boolean) as Movie[];
          const winnerMovie = data.nominations.winner_id 
            ? nomineeMovies.find(m => m.id === data.nominations.winner_id) || null
            : null;
          setCurrentNominees(nomineeMovies);
          setCurrentWinner(winnerMovie);
          setHasCustomNominations(true);
          setNominees(nomineeMovies);
          setSelectedWinner(winnerMovie);
          const nomineeIds = nomineeMovies.map(m => m.id);
          setAvailableMovies(allMoviesForYear.filter(m => !nomineeIds.includes(m.id)));
        } else {
          // No custom nominations - use defaults
          setHasCustomNominations(false);
          setCurrentNominees(movies);
          setCurrentWinner(winner || null);
          setNominees(movies);
          setSelectedWinner(winner || null);
          const nomineeIds = movies.map(m => m.id);
          setAvailableMovies(allMoviesForYear.filter(m => !nomineeIds.includes(m.id)));
        }
      } else {
        console.warn('Failed to load nominations:', response.status, response.statusText);
        // For 503 errors (service unavailable), it's likely a database table issue
        if (response.status === 503) {
          console.info('Award nominations feature not yet available');
        }
      }
    } catch (error) {
      console.error('Error loading nominations:', error);
      setError('Failed to load existing nominations');
    } finally {
      setLoadingNominations(false);
    }
  };

  const handleStartEditing = () => {
    // Initialize edit state with current nominees/winner (could be custom or default)
    setNominees(currentNominees);
    setSelectedWinner(currentWinner);
    
    // Set available movies (excluding current nominees)
    const nomineeIds = currentNominees.map(m => m.id);
    setAvailableMovies(allMoviesForYear.filter(m => !nomineeIds.includes(m.id)));
    
    setIsEditing(true);
    setError(null);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setNominees([]);
    setSelectedWinner(null);
    setAvailableMovies([]);
    setError(null);
  };

  const handleAddNominee = (movie: Movie) => {
    if (nominees.length >= 10) {
      setError('Maximum 10 nominees allowed');
      return;
    }
    
    setNominees([...nominees, movie]);
    setAvailableMovies(availableMovies.filter(m => m.id !== movie.id));
    setError(null);
  };

  const handleRemoveNominee = (movieId: string) => {
    const movieToRemove = nominees.find(m => m.id === movieId);
    if (movieToRemove) {
      setNominees(nominees.filter(m => m.id !== movieId));
      setAvailableMovies([...availableMovies, movieToRemove].sort((a, b) => b.ranking - a.ranking));
      
      // If removing the winner, clear winner selection
      if (selectedWinner?.id === movieId) {
        setSelectedWinner(null);
      }
    }
  };

  const handleSetWinner = (movie: Movie) => {
    setSelectedWinner(selectedWinner?.id === movie.id ? null : movie);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setNominees((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

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
          nominee_ids: nominees.map(m => m.id), // UUID strings
          winner_id: selectedWinner ? selectedWinner.id : null, // UUID string or null
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save nominations';
        let errorData = null;
        try {
          errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          errorMessage = response.statusText || errorMessage;
        }
        console.error('API /api/awards error:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        throw new Error(errorMessage);
      }

      // Parse success response
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

  const handleResetToDefault = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/awards?year=${year}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        let errorMessage = 'Failed to reset nominations';
        let errorData = null;
        try {
          errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      // After successful delete, reload nominations (will fall back to default)
      await loadExistingNominations();
      setIsEditing(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to reset nominations');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenModal = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedMovie(null);
    setIsModalOpen(false);
  };

  const handleModalUpdate = (movieId: number, newRanking: number | null, newSeenIt: boolean) => {
    // Find the movie in allMoviesForYear and update its ranking details
    const updatedMovies = allMoviesForYear.map(m => {
      if (m.id === String(movieId)) {
        return {
          ...m,
          ranking: newRanking ?? 0,
          rankings: [{
            ...(m.rankings?.[0] || {}),
            ranking: newRanking,
            seen_it: newSeenIt,
          }],
        };
      }
      return m;
    });
    // Here you might want to trigger a state update if `allMoviesForYear` is a state variable
    // For now, this just prepares the data for re-use
  };

  // Display logic
  const displayNominees = loadingNominations ? [] : (isEditing ? nominees : currentNominees);
  const displayWinner = loadingNominations ? null : (isEditing ? selectedWinner : currentWinner);

  // Get current ranking data for the selected movie
  const getMovieRankingData = (movie: Movie) => {
    if (!user) return { ranking: null, seenIt: false };
    
    // This would typically come from a user's rankings data
    // For now, we'll use the movie's existing ranking
    return {
      ranking: movie.ranking || null,
      seenIt: movie.ranking > 0, // Assume seen if rated
    };
  };

  // Convert Movie to the type expected by MovieDetailModal
  const convertMovieForModal = (movie: Movie): import('@/types/types').Movie => {
    return {
      id: Number(movie.id),
      title: movie.title,
      release_year: movie.release_year || 2024,
      poster_url: movie.poster_url,
      thumb_url: movie.thumb_url,
      created_at: movie.created_at || new Date().toISOString(),
      rankings: movie.rankings || [],
    };
  };

  return (
    <section className="w-full max-w-screen-xl px-0 md:px-6 py-0 mx-auto my-0 font-sans">
      <div className="relative flex flex-col gap-6 md:flex-row md:gap-8">
        {/* Timeline and year label */}
        <h2 className="md:absolute block top-0 md:top-[125px] left-0 text-3xl font-bold text-[#A0A0A0] mt-2 md:rotate-[-90deg] origin-left font-['Unbounded'] tracking-widest">
          {year}
        </h2>
        <div className="top-0 bottom-0 flex-col items-center hidden md:absolute md:flex left-4">
          <div className="w-5 h-5 mt-2 rounded-full bg-gray-400 border-2 border-gray-100 dark:bg-gray-700 dark:border-gray-900" />
          <div className="w-[2px] flex-1 bg-gray-300 dark:bg-gray-700" />
        </div>

        {/* Spacer to account for timeline offset */}
        <div className="hidden md:inline-block w-0 md:w-[20px] shrink-0" />

        {/* Content block */}
        <div className={`award-editable-section flex flex-col w-full bg-white rounded-xl shadow-md dark-glass p-4 md:p-6 mb-24${isEditing ? ' pb-32 md:pb-0 dark:bg-gray-700' : ' dark-glass'}`}>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 text-red-700 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Content */}
          {loadingNominations ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              Loading nominations...
            </div>
          ) : !isEditing ? (
            /* READ MODE LAYOUT */
            <div className="flex flex-col md:flex-row gap-12">
              {/* Winner */}
              <div className="w-full md:w-1/3">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏆</span>
                    <h3 className="text-2xl font-bold text-yellow-500">Winner</h3>
                  </div>
                  {user && !isEditing && (
                    <button
                      onClick={handleStartEditing}
                      className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-blue-600 dark:text-gray-500 dark:border-gray-600 bg-blue-50 dark:bg-gray-800 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>
                {displayWinner ? (
                  <WinnerCard
                    title={displayWinner.title}
                    poster_url={displayWinner.poster_url}
                    rating={displayWinner.ranking}
                    onClick={() => handleOpenModal(displayWinner)}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No Best Picture selected yet.
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px bg-gray-200 dark:bg-gray-700" />

              {/* Nominees */}
              <div className="w-full md:w-2/3">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✉️</span>
                    <h3 className="text-2xl font-bold text-[#7e7e7e]">
                      Nominees
                    </h3>
                  </div>
                  {/* Show custom/default label here if desired */}
                  {!isEditing && hasCustomNominations && (
                    <span className="text-xs text-green-600 dark:bg-gray-950 font-medium px-2 py-1 bg-green-50 rounded">
                      Custom Selection
                    </span>
                  )}
                  {!isEditing && !hasCustomNominations && (
                    <span className="text-xs text-gray-500 dark:bg-gray-950 font-medium px-2 py-1 bg-gray-50 rounded">
                      Default (Top 10 • Ranked 7+)
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {[...displayNominees]
                    .sort((a, b) => a.title.localeCompare(b.title))
                    .map((movie) => (
                      <MovieCard
                        key={movie.id}
                        title={movie.title}
                        imageUrl={movie.thumb_url}
                        rating={movie.ranking}
                        onClick={() => handleOpenModal(movie)}
                      />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* EDIT MODE LAYOUT */
            <div className="space-y-6">
              {/* Two Column Layout for Nominees and Available Movies */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Nominees Section - Left 2/3 */}
                <div className="lg:col-span-2 relative pb-32 md:pb-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xl">✉️</span>
                      <h3 className="text-2xl font-bold text-[#7e7e7e]">
                        Nominees
                      </h3>
                      <span className="text-sm text-gray-500">
                        ({nominees.length}/10)
                      </span>
                      {selectedWinner && (
                        <span className="text-sm text-yellow-600 font-medium">
                          • Winner: {selectedWinner.title}
                        </span>
                      )}
                    </div>
                    {/* Action buttons for md+ */}
                    <div className="hidden md:flex items-center gap-2">
                      <button
                        onClick={handleResetToDefault}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                        title="Reset to default nominees (top 10 ranked 7+)"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                      </button>
                      <button
                        onClick={handleCancelEditing}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                  {loadingNominations ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-gray-500">Loading nominations...</div>
                    </div>
                  ) : nominees.length > 0 ? (
                    <DndContext
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={nominees.map(m => m.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                          {nominees.map((movie) => (
                            <DraggableNomineeCard
                              key={movie.id}
                              movie={movie}
                              isWinner={selectedWinner?.id === movie.id}
                              onSetWinner={handleSetWinner}
                              onRemove={handleRemoveNominee}
                            />
                          ))}
                        </div>
                      </SortableContext>
                      <DragOverlay>
                        {activeId ? (
                          <div className="opacity-50">
                            <DraggableNomineeCard
                              movie={nominees.find(m => m.id === activeId)!}
                              isWinner={false}
                              onSetWinner={() => {}}
                              onRemove={() => {}}
                            />
                          </div>
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  ) : (
                    <div className="flex items-center justify-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-xl">
                      No nominees selected. Add movies from the right panel.
                    </div>
                  )}
                </div>

                {/* Available Movies Section - Right 1/3 */}
                <div className="lg:col-span-1">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">🎬</span>
                    <h3 className="text-xl font-bold text-[#7e7e7e]">
                      Available Movies
                    </h3>
                  </div>
                  <div className="text-sm text-gray-500 mb-3">
                    {year} • {availableMovies.length} movies
                  </div>
                  {availableMovies.length > 0 ? (
                    <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
                      {availableMovies.map((movie) => (
                        <SelectableMovieItem
                          key={movie.id}
                          movie={movie}
                          onSelect={handleAddNominee}
                          disabled={nominees.length >= 10}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
                      All movies for {year} are already nominated.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Movie Detail Modal */}
      {selectedMovie && (
        <MovieDetailModal
          movie={convertMovieForModal(selectedMovie)}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onUpdate={handleModalUpdate}
          initialRanking={getMovieRankingData(selectedMovie).ranking}
          initialSeenIt={getMovieRankingData(selectedMovie).seenIt}
        />
      )}
      {/* Sticky action bar for mobile - absolutely outside content, always at viewport bottom */}
      {isEditing && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-4 py-3 flex gap-2 md:hidden shadow-2xl transition-all">
          <button
            onClick={handleResetToDefault}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
            title="Reset to default nominees (top 10 ranked 7+)"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleCancelEditing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </section>
  );
}

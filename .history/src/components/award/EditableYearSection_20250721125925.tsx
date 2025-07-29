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
import type { Movie } from "@/types/types";
import type { User } from '@supabase/supabase-js';

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
  const [activeId, setActiveId] = useState<number | null>(null);
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

  const loadExistingNominations = React.useCallback(async () => {
    setLoadingNominations(true);
    try {
      const response = await fetch(`/api/awards?year=${year}`);
      if (response.ok) {
        const data: { nominations: AwardNomination | null } = await response.json();
        if (data.nominations?.nominee_ids?.length > 0) {
          // User has custom nominations - use them for display
          const nomineeMovies = data.nominations.nominee_ids
            .map((id: number) => allMoviesForYear.find(m => m.id === id))
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
  }, [year, allMoviesForYear, movies, winner]);

  // Load custom nominations on component mount
  useEffect(() => {
    if (user) {
      loadExistingNominations();
    }
  }, [user, year, loadExistingNominations]);

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

  const handleRemoveNominee = (movieId: number) => {
    const movieToRemove = nominees.find(m => m.id === movieId);
    if (movieToRemove) {
      setNominees(nominees.filter(m => m.id !== movieId));
      setAvailableMovies([...availableMovies, movieToRemove].sort((a, b) => (b.rankings?.[0]?.ranking ?? 0) - (a.rankings?.[0]?.ranking ?? 0)));
      
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
    setActiveId(event.active.id as number);
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
          nominee_ids: nominees.map(m => m.id),
          winner_id: selectedWinner ? selectedWinner.id : null,
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
    const updateMovieState = (movieList: Movie[]) =>
      movieList.map(m => {
        if (m.id === movieId) {
          const updatedRankings = [{
            ...(m.rankings?.[0] || {}),
            ranking: newRanking,
            seen_it: newSeenIt,
            // user_id might be missing, so let's ensure it's there if we have a user
            user_id: m.rankings?.[0]?.user_id || user?.id || '',
          }];
          return { ...m, rankings: updatedRankings };
        }
        return m;
      });

    // Update all relevant state variables
    setNominees(updateMovieState(nominees));
    setAvailableMovies(updateMovieState(availableMovies));
    setCurrentNominees(updateMovieState(currentNominees));

    if (selectedWinner?.id === movieId) {
      setSelectedWinner(prev => prev ? updateMovieState([prev])[0] : null);
    }
    if (currentWinner?.id === movieId) {
      setCurrentWinner(prev => prev ? updateMovieState([prev])[0] : null);
    }
    if (selectedMovie?.id === movieId) {
      setSelectedMovie(prev => prev ? updateMovieState([prev])[0] : null);
    }
  };

  // Display logic
  const displayNominees = loadingNominations ? [] : (isEditing ? nominees : currentNominees);
  const displayWinner = loadingNominations ? null : (isEditing ? selectedWinner : currentWinner);

  return (
    <section className="w-full max-w-screen-xl px-0 py-0 mx-auto my-0 font-sans md:px-6">
      <div className="relative flex flex-col gap-6 md:flex-row md:gap-8">
        {/* Timeline and year label */}
        <h2 className="md:absolute block top-0 md:top-[125px] left-0 text-3xl font-bold text-[#A0A0A0] mt-2 md:rotate-[-90deg] origin-left font-['Unbounded'] tracking-widest">
          {year}
        </h2>
        <div className="top-0 bottom-0 flex-col items-center hidden md:absolute md:flex left-4">
          <div className="w-5 h-5 mt-2 bg-gray-400 border-2 border-gray-100 rounded-full dark:bg-gray-700 dark:border-gray-900" />
          <div className="w-[2px] flex-1 bg-gray-300 dark:bg-gray-700" />
        </div>

        {/* Spacer to account for timeline offset */}
        <div className="hidden md:inline-block w-0 md:w-[20px] shrink-0" />

        {/* Content block */}
        <div className={`award-editable-section flex flex-col w-full bg-white rounded-xl shadow-md dark-glass p-4 md:p-6 mb-24${isEditing ? ' pb-32 md:pb-0 dark:bg-gray-700' : ' dark-glass'}`}>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 text-red-700 border border-red-200 rounded-lg bg-red-50">
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
            <div className="flex flex-col gap-12 md:flex-row">
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
                      className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-blue-600 transition-colors rounded-lg dark:text-gray-500 dark:border-gray-600 bg-blue-50 dark:bg-gray-800 hover:bg-blue-100"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>
                {displayWinner ? (
                  <WinnerCard
                    movie={displayWinner}
                    onClick={() => handleOpenModal(displayWinner)}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No Best Picture selected yet.
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="hidden w-px bg-gray-200 md:block dark:bg-gray-700" />

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
                    <span className="px-2 py-1 text-xs font-medium text-green-600 rounded dark:bg-gray-950 bg-green-50">
                      Custom Selection
                    </span>
                  )}
                  {!isEditing && !hasCustomNominations && (
                    <span className="px-2 py-1 text-xs font-medium text-gray-500 rounded dark:bg-gray-950 bg-gray-50">
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
                        movie={movie}
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
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Nominees Section - Left 2/3 */}
                <div className="relative pb-32 lg:col-span-2 md:pb-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xl">✉️</span>
                      <h3 className="text-2xl font-bold text-[#7e7e7e]">
                        Nominees
                      </h3>
                      <span className="text-sm text-gray-500">
                        ({nominees.length}/10)
                      </span>
                      {selectedWinner && (
                        <span className="text-sm font-medium text-yellow-600">
                          • Winner: {selectedWinner.title}
                        </span>
                      )}
                    </div>
                    {/* Action buttons for md+ */}
                    <div className="items-center hidden gap-2 md:flex">
                      <button
                        onClick={handleResetToDefault}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-orange-600 transition-colors rounded-lg bg-orange-50 hover:bg-orange-100"
                        title="Reset to default nominees (top 10 ranked 7+)"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                      </button>
                      <button
                        onClick={handleCancelEditing}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 transition-colors rounded-lg bg-gray-50 hover:bg-gray-100"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
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
                    <div className="flex items-center justify-center py-8 text-gray-500 border-2 border-gray-300 border-dashed rounded-xl">
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
                  <div className="mb-3 text-sm text-gray-500">
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
                    <div className="flex items-center justify-center py-8 text-sm text-gray-500">
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
          movie={selectedMovie}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onUpdate={handleModalUpdate}
          initialRanking={selectedMovie.rankings?.[0]?.ranking ?? null}
          initialSeenIt={selectedMovie.rankings?.[0]?.seen_it ?? false}
          // Force re-mount on update to always get latest props
          key={selectedMovie.id + '-' + (selectedMovie.rankings?.[0]?.ranking ?? 'null') + '-' + (selectedMovie.rankings?.[0]?.seen_it ?? 'false')}
        />
      )}
    </section>
  );
}

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
import { useGlobalToast } from '@/hooks/useGlobalToast';

interface AwardNomination {
  nominee_ids: number[];
  winner_id: number | null;
}

interface EditableYearSectionProps {
  year: string;
  movies: Movie[]; // Default nominees (top 10)
  winner?: Movie | null; // Default winner (highest ranked)
  allMoviesForYear: Movie[]; // All movies for this year that user has ranked
  category?: 'best-picture' | 'best-animated' | 'best-comedy' | 'best-drama' | 'best-debut';
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
  category = 'best-picture',
}: EditableYearSectionProps) {
  const user = useSupabaseUser();
  const { showToast } = useGlobalToast();
  if (process.env.NODE_ENV === "development") {
    console.log('EditableYearSection user:', user);
  }
  const [isEditing, setIsEditing] = useState(false);
  const [nominees, setNominees] = useState<Movie[]>([]);
  const [selectedWinner, setSelectedWinner] = useState<Movie | null>(null);
  const [availableMovies, setAvailableMovies] = useState<Movie[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<{
    source?: 'api' | 'client-upsert' | 'reset' | 'load';
    status?: number;
    code?: string;
    hint?: string;
    details?: any;
  } | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [loadingNominations, setLoadingNominations] = useState(false);
  const [hasCustomNominations, setHasCustomNominations] = useState(false);

  // Track movies just marked as seen in this session (to keep them visible)
  const [, setJustSeen] = useState<Set<number>>(new Set());

  // Modal state
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Current display nominees and winner (either custom or default)
  const [currentNominees, setCurrentNominees] = useState<Movie[]>(movies);
  const [currentWinner, setCurrentWinner] = useState<Movie | null>(winner || null);

  const loadExistingNominations = React.useCallback(async () => {
    setLoadingNominations(true);
    try {
      const response = await fetch(`/api/awards?year=${year}&category=${category}`);
      if (response.ok) {
        // Clear any previous load errors on success
        setError(null);
        setErrorDetails(null);
        const data: { nominations: AwardNomination | null } = await response.json();
        if ((data.nominations?.nominee_ids ?? []).length > 0) {
          // User has custom nominations - use them for display
          const nomineeMovies = (data.nominations?.nominee_ids ?? [])
            .map((id: number) => allMoviesForYear.find(m => m.id === id))
            .filter(Boolean) as Movie[];
          const winnerMovie = data.nominations && data.nominations.winner_id
            ? nomineeMovies.find(m => data.nominations && m.id === data.nominations.winner_id) || null
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
          setError(null);
          setErrorDetails(null);
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
        // Don't block defaults; show non-fatal notice only once
        setError('Failed to load existing nominations');
        setErrorDetails({ source: 'load', status: response.status, details: response.statusText });
      }
    } catch (error) {
      console.error('Error loading nominations:', error);
      setError('Failed to load existing nominations');
      setErrorDetails({ source: 'load', details: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoadingNominations(false);
    }
  }, [year, allMoviesForYear, movies, winner, category]);

  // Load custom nominations on component mount
  useEffect(() => {
    if (user) {
      loadExistingNominations();
    }
  }, [user, year, category, loadExistingNominations]);

  // Keep display state in sync when defaults change and there are no custom nominations
  useEffect(() => {
    if (!hasCustomNominations) {
      setCurrentNominees(movies);
      setCurrentWinner(winner || null);
    }
  }, [movies, winner, category, hasCustomNominations]);

  const handleStartEditing = () => {
    // Initialize edit state with current nominees/winner (could be custom or default)
    setNominees(currentNominees);
    setSelectedWinner(currentWinner);
    
    // Set available movies (excluding current nominees)
    const nomineeIds = currentNominees.map(m => m.id);
    setAvailableMovies(allMoviesForYear.filter(m => !nomineeIds.includes(m.id)));
    
    setIsEditing(true);
    setError(null);
    setErrorDetails(null);
    setShowErrorDetails(false);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setNominees([]);
    setSelectedWinner(null);
    setAvailableMovies([]);
    setError(null);
    setErrorDetails(null);
    setShowErrorDetails(false);
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
    setErrorDetails(null);
    setShowErrorDetails(false);

    const friendlyFromServer = (status: number, errorData: any, fallbackText: string) => {
      if (status === 401) return 'Please sign in to save your nominations.';
      if (status === 503) return 'Awards feature is currently unavailable. Please try later.';
      const serverMsg = errorData?.error || errorData?.message || '';
      if (/Winner must be among nominees/i.test(serverMsg)) return 'Winner must be among nominees.';
      if (/Maximum 10 nominees/i.test(serverMsg)) return 'Maximum 10 nominees allowed.';
      return fallbackText;
    };

    try {
      // Primary path: use Next.js API route (server validates + ensures profile)
      const response = await fetch('/api/awards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year,
          nominee_ids: nominees.map(m => m.id),
          winner_id: selectedWinner ? selectedWinner.id : null,
          category,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save nominations';
        let errorData = null;
        try {
          errorData = await response.json();
          errorMessage = friendlyFromServer(response.status, errorData, errorMessage);
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        console.error('API /api/awards error:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        const detailsObj = {
          source: 'api',
          status: response.status,
          code: errorData?.details?.code || errorData?.code,
          details: errorData,
        } as const;
        setErrorDetails(detailsObj);
        console.warn('AWARDS_SAVE_ERROR_API', detailsObj);
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
      showToast('Nominations saved', 'success');
    } catch (error) {
      // Network fallback: attempt direct Supabase upsert from the browser
      const isNetwork = error instanceof Error && (
        error.message.includes('NetworkError') ||
        error.message.includes('Failed to fetch')
      );

      if (isNetwork && user) {
        console.warn('API unavailable, falling back to client Supabase upsert');
        try {
          const doUpsert = async () => {
            return await supabase
            .from('awards')
            .upsert({
              user_id: user.id,
              year: Number(year),
              category,
              nominee_ids: nominees.map(m => m.id),
              winner_id: selectedWinner ? selectedWinner.id : null,
              updated_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            }, { onConflict: 'user_id,year,category' })
            .select();
          };

          let { data, error: upsertError } = await doUpsert();

          // If foreign key to profiles fails, create a minimal profile then retry
          if (upsertError && upsertError.code === '23503') {
            console.warn('Missing profile detected, creating a minimal profile and retrying');
            const fallbackUsername = user.email ? user.email.split('@')[0] : user.id.slice(0, 8);
            await supabase.from('profiles').upsert({
              id: user.id,
              username: fallbackUsername,
              full_name: null,
              avatar_url: null,
              bio: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            ({ data, error: upsertError } = await doUpsert());
          }

          if (upsertError) {
            console.error('Client Supabase upsert failed:', upsertError);
            const msg = /row-level security|RLS|permission/i.test(upsertError.message || '')
              ? 'Permission denied by database policies. Please sign in and try again.'
              : (upsertError.message || 'Failed to save nominations');
            setError(msg);
            const detailsObj = { source: 'client-upsert', code: upsertError.code, details: upsertError } as const;
            setErrorDetails(detailsObj);
            console.warn('AWARDS_SAVE_ERROR_CLIENT', detailsObj);
            showToast(msg, 'error');
          } else {
            console.log('Client upsert success:', data);
            setCurrentNominees(nominees);
            setCurrentWinner(selectedWinner);
            setHasCustomNominations(true);
            setIsEditing(false);
            showToast('Nominations saved (offline fallback)', 'success');
          }
        } catch (fallbackErr) {
          console.error('Fallback upsert threw:', fallbackErr);
          const msg = fallbackErr instanceof Error ? fallbackErr.message : 'Failed to save nominations';
          setError(msg);
          const detailsObj = { source: 'client-upsert', details: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr) } as const;
          setErrorDetails(detailsObj);
          console.warn('AWARDS_SAVE_ERROR_CLIENT_THROW', detailsObj);
          showToast(msg, 'error');
        }
      } else {
        console.error('Error saving nominations:', error);
        const msg = error instanceof Error ? error.message : 'Failed to save nominations';
        setError(msg);
        const detailsObj = { source: 'api', details: error instanceof Error ? error.message : String(error) } as const;
        setErrorDetails(detailsObj);
        console.warn('AWARDS_SAVE_ERROR', detailsObj);
        showToast(msg, 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/awards?year=${year}&category=${category}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        let errorMessage = 'Failed to reset nominations';
        let errorData = null;
        try {
          errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      // After successful delete, reload nominations (will fall back to default)
      await loadExistingNominations();
      setIsEditing(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to reset nominations');
      setErrorDetails({ source: 'reset', details: error instanceof Error ? error.message : String(error) });
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
    // Track if movie was just marked as seen
    if (newSeenIt === true) {
      setJustSeen((prev) => new Set(prev).add(movieId));
    }
    
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
  <div className={`award-editable-section flex flex-col w-full rounded-xl shadow-md light-glass dark:dark-glass p-4 md:p-6 mb-24${isEditing ? ' pb-32 md:pb-0' : ''}`}>

          {/* Error Message */}
          {error && (
            <div className="p-3 mb-4 rounded-lg border border-red-200 bg-red-50">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
                {errorDetails && (
                  <button
                    onClick={() => setShowErrorDetails(v => !v)}
                    className="ml-auto text-xs font-medium underline decoration-red-300 hover:decoration-red-500"
                  >
                    {showErrorDetails ? 'Hide details' : 'Why did this fail?'}
                  </button>
                )}
              </div>
              {errorDetails && showErrorDetails && (
                <div className="mt-2 text-xs text-red-800 space-y-1">
                  {errorDetails.status && (<div>Status: {errorDetails.status}</div>)}
                  {errorDetails.code && (<div>Code: {errorDetails.code}</div>)}
                  {errorDetails.source && (<div>Source: {errorDetails.source}</div>)}
                  {errorDetails.hint && (<div>Hint: {errorDetails.hint}</div>)}
                  {errorDetails.details && (
                    <pre className="mt-1 max-h-40 overflow-auto bg-white/60 border border-red-200 rounded p-2 whitespace-pre-wrap break-all">
{typeof errorDetails.details === 'string' ? errorDetails.details : JSON.stringify(errorDetails.details, null, 2)}
                    </pre>
                  )}
                  <div className="pt-1">
                    <button
                      onClick={async () => {
                        const payload = {
                          status: errorDetails.status,
                          code: errorDetails.code,
                          source: errorDetails.source,
                          hint: errorDetails.hint,
                          details: errorDetails.details,
                          year,
                          category,
                        };
                        try {
                          const text = typeof payload.details === 'string'
                            ? JSON.stringify(payload, null, 2)
                            : JSON.stringify(payload, null, 2);
                          if (navigator?.clipboard?.writeText) {
                            await navigator.clipboard.writeText(text);
                            showToast('Error details copied', 'success');
                          } else {
                            showToast('Clipboard unavailable', 'error');
                          }
                        } catch (e) {
                          showToast('Failed to copy details', 'error');
                        }
                      }}
                      className="text-[11px] px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-100"
                    >
                      Copy details
                    </button>
                  </div>
                </div>
              )}
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
                    No winner selected yet.
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
                      {category === 'best-picture' ? 'Default (Top 10 • 7+ first)' : 'Default (Top 10)'}
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
                        title={category === 'best-picture' ? 'Reset to default nominees (7+ first, then fill to 10)' : 'Reset to default nominees (top 10)'}
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

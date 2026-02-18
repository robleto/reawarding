"use client";

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { supabase } from '@/lib/supabaseBrowser';
import { useUser, useSupabaseClient, useSessionContext } from '@supabase/auth-helpers-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Edit3, Save, X, AlertCircle, RotateCcw, Loader2, Film, Crown, GripVertical, Star } from "lucide-react";
import MovieCard from "./MovieCard";
import WinnerCard from "./WinnerCard";
import DraggableNomineeCard from "./DraggableNomineeCard";
import SelectableMovieItem from "./SelectableMovieItem";
import MovieDetailModal from "../movie/MovieDetailModal";
import type { Movie } from "@/types/types";
import { useGlobalToast } from '@/hooks/useGlobalToast';
import { normalizeImageUrl } from "@/utils/imageUrl";
 
const STORAGE_KEY = 'reawarding-awards-cache-v1';
const LAST_USER_KEY = 'reawarding-awards-last-user';
const PREFERENCE_KEY = 'reawarding-awards-preference-v1';

type CachedNominationPayload = {
  nominee_ids: number[];
  winner_id: number | null;
  updated_at: string;
};

type PreferenceValue = 'default' | 'custom';

const buildCacheKey = (userId: string, category: string, year: string) => `${userId}:${category}:${year}`;

const readJson = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn('Failed to parse awards cache JSON', error);
    return fallback;
  }
};

const getCachedEntry = (userId: string | null, category: string, year: string): CachedNominationPayload | null => {
  if (typeof window === 'undefined' || !userId) return null;
  const cache = readJson<Record<string, CachedNominationPayload>>(window.localStorage.getItem(STORAGE_KEY), {});
  const entry = cache[buildCacheKey(userId, category, year)];
  return entry ?? null;
};

const setCachedEntry = (userId: string, category: string, year: string, payload: CachedNominationPayload | null) => {
  if (typeof window === 'undefined') return;
  const cache = readJson<Record<string, CachedNominationPayload>>(window.localStorage.getItem(STORAGE_KEY), {});
  const key = buildCacheKey(userId, category, year);
  if (payload) {
    cache[key] = payload;
  } else if (cache[key]) {
    delete cache[key];
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
};

const getViewPreference = (userId: string | null, category: string, year: string): PreferenceValue | null => {
  if (typeof window === 'undefined' || !userId) return null;
  const prefs = readJson<Record<string, PreferenceValue>>(window.localStorage.getItem(PREFERENCE_KEY), {});
  return prefs[buildCacheKey(userId, category, year)] ?? null;
};

const setViewPreference = (userId: string, category: string, year: string, value: PreferenceValue) => {
  if (typeof window === 'undefined') return;
  const prefs = readJson<Record<string, PreferenceValue>>(window.localStorage.getItem(PREFERENCE_KEY), {});
  prefs[buildCacheKey(userId, category, year)] = value;
  window.localStorage.setItem(PREFERENCE_KEY, JSON.stringify(prefs));
};

interface AwardNomination {
  nominee_ids: number[];
  winner_id: number | null;
}

export interface EditableYearSectionHandle {
  /** Add a movie to the workshop nominees list and persist. */
  addNominee: (movie: Movie) => void;
}

interface EditableYearSectionProps {
  year: string;
  movies: Movie[]; // Default nominees (top 10)
  winner?: Movie | null; // Default winner (highest ranked)
  allMoviesForYear: Movie[]; // All movies for this year that user has ranked
  category?: 'best-picture' | 'best-animated' | 'best-comedy' | 'best-blockbuster';
  mode?: "workshop" | "view";
  nomineeImageMode?: "thumb" | "poster";
  /** When true, suppresses Awards-page timeline chrome (section wrapper, year label, timeline dot, spacer, mb-24). */
  compact?: boolean;
  /** Fires when edit state changes — true on enter edit, false on save/cancel/reset. */
  onEditingChange?: (editing: boolean) => void;
  /** Optional callback for empty nominee slot click in compact/workshop view. */
  onRequestScrollToContenders?: () => void;
}

const EditableYearSection = forwardRef<EditableYearSectionHandle, EditableYearSectionProps>(function EditableYearSection({
  year,
  movies,
  winner,
  allMoviesForYear,
  category,
  mode = "view",
  nomineeImageMode = "thumb",
  compact,
  onEditingChange,
  onRequestScrollToContenders,
}: EditableYearSectionProps, ref) {
  const user = useUser();
  const { isLoading: sessionLoading } = useSessionContext();
  const { showToast } = useGlobalToast();
  const resolvedCategory = category ?? 'best-picture';
  const isWorkshop = mode === "workshop";

  if (process.env.NODE_ENV === "development") {
    console.log('EditableYearSection DEBUG:', { 
      user: user ? { id: user.id, email: user.email } : null, 
      sessionLoading 
    });
  }

  const initialCache = React.useMemo(() => {
    if (isWorkshop) return null;
    if (typeof window === 'undefined') return null;
    const lastUser = window.localStorage.getItem(LAST_USER_KEY);
    if (!lastUser) return null;
    const cached = getCachedEntry(lastUser, resolvedCategory, year);
    if (!cached) return null;

    const nomineeMovies = cached.nominee_ids
      .map((id) => allMoviesForYear.find((m) => m.id === id))
      .filter(Boolean) as Movie[];

    if (nomineeMovies.length === 0) return null;

    const winnerMovie = cached.winner_id
      ? nomineeMovies.find((m) => m.id === cached.winner_id) || allMoviesForYear.find((m) => m.id === cached.winner_id) || null
      : null;

    const viewPref = isWorkshop ? 'custom' : getViewPreference(lastUser, resolvedCategory, year);
    const useCustom = viewPref === 'custom';

    return {
      nomineeMovies,
      winnerMovie,
      useCustom,
      userId: lastUser,
    };
  }, [allMoviesForYear, resolvedCategory, year, isWorkshop]);

  const initialNominees = initialCache?.useCustom ? initialCache.nomineeMovies : movies;
  const initialWinner = initialCache?.useCustom ? (initialCache.winnerMovie || null) : (winner || null);

  if (process.env.NODE_ENV === "development") {
    console.log('EditableYearSection user:', user);
  }

  const [isEditing, setIsEditing] = useState(false);
  const [nominees, setNominees] = useState<Movie[]>([]);
  const [selectedWinner, setSelectedWinner] = useState<Movie | null>(null);
  const [availableMovies, setAvailableMovies] = useState<Movie[]>(() => {
    const nomineeIds = initialNominees.map((m) => m.id);
    return allMoviesForYear.filter((m) => !nomineeIds.includes(m.id));
  });
  const [activeId, setActiveId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<{
    source?: 'api' | 'client-upsert' | 'reset' | 'load' | 'workshop';
    status?: number;
    code?: string;
    hint?: string;
    details?: any;
  } | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [loadingNominations, setLoadingNominations] = useState(false);
  const [hasCustomNominations, setHasCustomNominations] = useState(!!initialCache?.nomineeMovies);
  const [customNominees, setCustomNominees] = useState<Movie[] | null>(initialCache?.nomineeMovies ?? null);
  const [customWinner, setCustomWinner] = useState<Movie | null>(initialCache?.winnerMovie ?? null);
  const [isUsingCustomView, setIsUsingCustomView] = useState(
    isWorkshop ? !!initialCache?.nomineeMovies : (initialCache?.useCustom ?? false)
  );

  const customNomineesRef = useRef<Movie[] | null>(initialCache?.nomineeMovies ?? null);
  const customWinnerRef = useRef<Movie | null>(initialCache?.winnerMovie ?? null);
  const isUsingCustomViewRef = useRef(
    isWorkshop ? !!initialCache?.nomineeMovies : (initialCache?.useCustom ?? false)
  );
  const hasLoadedInitialRef = useRef(false);
  const lastCacheUserRef = useRef<string | null>(initialCache?.userId ?? null);
  // When true, the workshop sync effect skips re-syncing (applyWorkshopState already set state directly)
  const workshopMutationInFlightRef = useRef(false);

  // Track movies just marked as seen in this session (to keep them visible)
  const [, setJustSeen] = useState<Set<number>>(new Set());

  // Modal state
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Current display nominees and winner (either custom or default)
  const [currentNominees, setCurrentNominees] = useState<Movie[]>(() => [...initialNominees]);
  const [currentWinner, setCurrentWinner] = useState<Movie | null>(initialWinner);

  const syncView = React.useCallback(
    (view: 'default' | 'custom', override?: { nominees: Movie[]; winner: Movie | null }) => {
      if (view === 'custom') {
        const nomineesSource = override?.nominees ?? customNomineesRef.current;
        const winnerSource = override?.winner ?? customWinnerRef.current;
        if (!nomineesSource || nomineesSource.length === 0) {
          return;
        }

        setIsUsingCustomView(true);
        isUsingCustomViewRef.current = true;
        setCurrentNominees([...nomineesSource]);
        setCurrentWinner(winnerSource || null);
        setNominees([...nomineesSource]);
        setSelectedWinner(winnerSource || null);
        const nomineeIds = nomineesSource.map((m) => m.id);
        setAvailableMovies(allMoviesForYear.filter((m) => !nomineeIds.includes(m.id)));
      } else {
        if (isWorkshop) {
          setIsUsingCustomView(true);
          isUsingCustomViewRef.current = true;
        } else {
          setIsUsingCustomView(false);
          isUsingCustomViewRef.current = false;
        }
        const nomineesSource = override?.nominees ?? movies;
        const winnerSource = override?.winner ?? (winner || null);
        setCurrentNominees([...nomineesSource]);
        setCurrentWinner(winnerSource);
        setNominees([...nomineesSource]);
        setSelectedWinner(winnerSource);
        const nomineeIds = nomineesSource.map((m) => m.id);
        setAvailableMovies(allMoviesForYear.filter((m) => !nomineeIds.includes(m.id)));
      }
    },
    [allMoviesForYear, movies, winner, isWorkshop]
  );

  const loadExistingNominations = React.useCallback(async () => {
    setLoadingNominations(true);
    try {
      const response = await fetch(`/api/awards?year=${year}&category=${resolvedCategory}`, {
        credentials: 'same-origin',
      });
      if (response.ok) {
        // Clear any previous load errors on success
        setError(null);
        setErrorDetails(null);
        const data: { nominations: AwardNomination | null } = await response.json();
        const savedIds = data.nominations?.nominee_ids ?? [];
        if (savedIds.length > 0) {
          const nomineeMovies = savedIds
            .map((id: number) => allMoviesForYear.find(m => m.id === id))
            .filter(Boolean) as Movie[];
          const winnerMovie = data.nominations && data.nominations.winner_id
            ? nomineeMovies.find(m => data.nominations && m.id === data.nominations.winner_id) || null
            : null;
          setCustomNominees(nomineeMovies);
          setCustomWinner(winnerMovie);
          customNomineesRef.current = nomineeMovies;
          customWinnerRef.current = winnerMovie;
          setHasCustomNominations(true);
          if (user?.id) {
            setCachedEntry(user.id, resolvedCategory, year, {
              nominee_ids: savedIds,
              winner_id: data.nominations?.winner_id ?? null,
              updated_at: new Date().toISOString(),
            });
          }
          const shouldUseCustom = (isWorkshop || isUsingCustomViewRef.current) && nomineeMovies.length > 0;
          if (shouldUseCustom) {
            syncView('custom', {
              nominees: nomineeMovies,
              winner: winnerMovie || null,
            });
            if (user?.id && !isWorkshop) {
              setViewPreference(user.id, resolvedCategory, year, 'custom');
            }
          } else {
            // Stay on defaults; ensure available list matches current default nominees
            const defaultNomineeIds = movies.map((m) => m.id);
            setAvailableMovies(allMoviesForYear.filter((m) => !defaultNomineeIds.includes(m.id)));
          }
        } else {
          // No custom nominations - use defaults
          setError(null);
          setErrorDetails(null);
          setHasCustomNominations(false);
          setCustomNominees(null);
          setCustomWinner(null);
          customNomineesRef.current = null;
          customWinnerRef.current = null;
          if (user?.id) {
            setCachedEntry(user.id, resolvedCategory, year, null);
            if (!isWorkshop) {
              setViewPreference(user.id, resolvedCategory, year, 'default');
            }
          }
          syncView('default');
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
  }, [year, allMoviesForYear, movies, winner, resolvedCategory, syncView, user?.id, isWorkshop]);

  const hasStoredCustom = !isWorkshop && (customNominees?.length ?? 0) > 0;

  const handleViewToggle = React.useCallback(() => {
    if (isUsingCustomView) {
      syncView('default');
      if (user?.id) {
        setViewPreference(user.id, resolvedCategory, year, 'default');
      }
    } else if (hasStoredCustom) {
      syncView('custom');
      if (user?.id) {
        setViewPreference(user.id, resolvedCategory, year, 'custom');
      }
    }
  }, [hasStoredCustom, isUsingCustomView, syncView, user?.id, resolvedCategory, year]);

  useEffect(() => {
    if (!user?.id) {
      lastCacheUserRef.current = null;
      return;
    }

    if (lastCacheUserRef.current && lastCacheUserRef.current !== user.id) {
      setHasCustomNominations(false);
      setCustomNominees(null);
      customNomineesRef.current = null;
      setCustomWinner(null);
      customWinnerRef.current = null;
      if (!isWorkshop) {
        setIsUsingCustomView(false);
        isUsingCustomViewRef.current = false;
      }
      syncView('default');
    }

    lastCacheUserRef.current = user.id;
  }, [user?.id, syncView, isWorkshop]);

  // Load custom nominations on component mount
  useEffect(() => {
    // Don't do anything while session is loading
    if (sessionLoading) {
      console.log('Session loading, waiting to load nominations...');
      return;
    }

    if (typeof window !== 'undefined' && user?.id) {
      window.localStorage.setItem(LAST_USER_KEY, user.id);
    }

    if (user) {
      console.log('User detected, loading nominations:', user.email);
      if (!hasLoadedInitialRef.current) {
        hasLoadedInitialRef.current = true;
        loadExistingNominations();
      }
    } else {
      console.log('No user detected, resetting to defaults');
      hasLoadedInitialRef.current = false;
      setHasCustomNominations(false);
      setCustomNominees(null);
      customNomineesRef.current = null;
      setCustomWinner(null);
      customWinnerRef.current = null;
      if (!isWorkshop) {
        setIsUsingCustomView(false);
        isUsingCustomViewRef.current = false;
      }
      syncView('default');
    }
  }, [user, sessionLoading, loadExistingNominations, syncView, isWorkshop]);

  // Keep display state in sync when defaults change and there are no custom nominations
  useEffect(() => {
    if (!isWorkshop && !isUsingCustomView && !isEditing) {
      syncView('default', { nominees: movies, winner: winner || null });
    }
  }, [movies, winner, resolvedCategory, isUsingCustomView, isEditing, syncView, isWorkshop]);

  const handleStartEditing = () => {
    // Initialize edit state with current nominees/winner (could be custom or default)
    setNominees([...currentNominees]);
    setSelectedWinner(currentWinner);
    
    // Set available movies (excluding current nominees)
    const nomineeIds = currentNominees.map(m => m.id);
    setAvailableMovies(allMoviesForYear.filter(m => !nomineeIds.includes(m.id)));
    
    setIsEditing(true);
    onEditingChange?.(true);
    setError(null);
    setErrorDetails(null);
    setShowErrorDetails(false);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    onEditingChange?.(false);
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
    if (isWorkshop) onEditingChange?.(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (isWorkshop) onEditingChange?.(false);

    if (over && active.id !== over.id) {
      const reordered = arrayMove(
        isWorkshop ? activeWorkshopNominees : nominees,
        (isWorkshop ? activeWorkshopNominees : nominees).findIndex(item => item.id === active.id),
        (isWorkshop ? activeWorkshopNominees : nominees).findIndex(item => item.id === over.id)
      );
      if (isWorkshop) {
        const winnerId = activeWorkshopWinner?.id ?? reordered[0]?.id ?? null;
        const nextWinner = reordered.find((m) => m.id === winnerId) ?? reordered[0] ?? null;
        void applyWorkshopState(reordered, nextWinner);
      } else {
        setNominees(reordered);
      }
    }
  };

  useEffect(() => {
    if (!isWorkshop) return;
    if (nominees.length === 0) return;
    if (selectedWinner && nominees.some((m) => m.id === selectedWinner.id)) return;
    setSelectedWinner(nominees[0]);
  }, [isWorkshop, nominees, selectedWinner]);

  const handleSave = async () => {
    // Wait for session to load before checking user
    if (sessionLoading) {
      console.log('Session still loading, waiting...');
      return;
    }
    
    if (!user) {
      console.log('No user found, showing sign-in prompt');
      showToast('Please sign in to save your nominations.', 'info');
      return;
    }

    console.log('Saving nominations for user:', user.email);
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
        credentials: 'same-origin', // Ensure cookies are sent
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year,
          nominee_ids: nominees.map(m => m.id),
          winner_id: selectedWinner ? selectedWinner.id : null,
          category: resolvedCategory,
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
        console.warn('AWARDS_SAVE_ERROR_API_RESPONSE', {
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
        setError(errorMessage);
        showToast(errorMessage, response.status === 401 ? 'info' : 'error');
        return;
      }

      // Parse success response
      const result = await response.json();
      console.log('Save successful:', result);

      // Update current display with saved nominations
      const savedNominees = [...nominees];
      setCurrentNominees(savedNominees);
      setCurrentWinner(selectedWinner);
      setCustomNominees(savedNominees);
      customNomineesRef.current = savedNominees;
      setCustomWinner(selectedWinner);
      customWinnerRef.current = selectedWinner;
      setIsUsingCustomView(true);
      isUsingCustomViewRef.current = true;
      setHasCustomNominations(true);
      setIsEditing(false);
      onEditingChange?.(false);
      if (user?.id) {
        setCachedEntry(user.id, resolvedCategory, year, {
          nominee_ids: savedNominees.map((m) => m.id),
          winner_id: selectedWinner ? selectedWinner.id : null,
          updated_at: new Date().toISOString(),
        });
        if (!isWorkshop) {
          setViewPreference(user.id, resolvedCategory, year, 'custom');
        }
      }
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
              category: resolvedCategory,
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
            console.warn('Client Supabase upsert failed:', upsertError);
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
            const savedNominees = [...nominees];
            setCurrentNominees(savedNominees);
            setCurrentWinner(selectedWinner);
            setCustomNominees(savedNominees);
            customNomineesRef.current = savedNominees;
            setCustomWinner(selectedWinner);
            customWinnerRef.current = selectedWinner;
            setIsUsingCustomView(true);
            isUsingCustomViewRef.current = true;
            setHasCustomNominations(true);
            setIsEditing(false);
            onEditingChange?.(false);
            if (user?.id) {
              setCachedEntry(user.id, resolvedCategory, year, {
                nominee_ids: savedNominees.map((m) => m.id),
                winner_id: selectedWinner ? selectedWinner.id : null,
                updated_at: new Date().toISOString(),
              });
              if (!isWorkshop) {
                setViewPreference(user.id, resolvedCategory, year, 'custom');
              }
            }
            showToast('Nominations saved (offline fallback)', 'success');
          }
        } catch (fallbackErr) {
          console.warn('Fallback upsert threw:', fallbackErr);
          const msg = fallbackErr instanceof Error ? fallbackErr.message : 'Failed to save nominations';
          setError(msg);
          const detailsObj = { source: 'client-upsert', details: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr) } as const;
          setErrorDetails(detailsObj);
          console.warn('AWARDS_SAVE_ERROR_CLIENT_THROW', detailsObj);
          showToast(msg, 'error');
        }
      } else {
        console.warn('Error saving nominations:', error);
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
      const response = await fetch(`/api/awards?year=${year}&category=${resolvedCategory}`, {
        method: 'DELETE',
        credentials: 'same-origin',
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
      if (user?.id) {
        setCachedEntry(user.id, resolvedCategory, year, null);
        if (!isWorkshop) {
          setViewPreference(user.id, resolvedCategory, year, 'default');
        }
      }
      // After successful delete, reload nominations (will fall back to default)
      await loadExistingNominations();
      setIsEditing(false);
      onEditingChange?.(false);
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
    if (isUsingCustomViewRef.current) {
      setCustomNominees(prev => (prev ? updateMovieState(prev) : prev));
      if (customNomineesRef.current) {
        customNomineesRef.current = updateMovieState(customNomineesRef.current);
      }
      setCustomWinner(prev => (prev ? updateMovieState([prev])[0] : prev));
      if (customWinnerRef.current) {
        customWinnerRef.current = updateMovieState([customWinnerRef.current])[0] ?? null;
      }
    }
  };

  // Display logic (keep current view visible while background refresh runs)
  const displayNominees = isEditing ? nominees : currentNominees;
  const displayWinner = isEditing ? selectedWinner : currentWinner;
  const nomineeCount = displayNominees.length;
  const nomineesNeededForComplete = Math.max(0, 5 - nomineeCount);
  const defaultNomineeIds = movies.map((m) => m.id);
  const defaultWinnerId = winner?.id ?? movies[0]?.id ?? null;
  const activeWorkshopNominees = isWorkshop ? nominees : displayNominees;
  const activeWorkshopWinner = isWorkshop ? selectedWinner : displayWinner;
  const workshopOrderDiffers =
    activeWorkshopNominees.length !== defaultNomineeIds.length ||
    activeWorkshopNominees.some((movie, index) => movie.id !== defaultNomineeIds[index]);
  const workshopWinnerDiffers = (activeWorkshopWinner?.id ?? null) !== defaultWinnerId;
  const showWorkshopReset = isWorkshop && (workshopOrderDiffers || workshopWinnerDiffers);

  const persistWorkshopState = async (nextNominees: Movie[], nextWinner: Movie | null) => {
    if (!user) return;
    try {
      const response = await fetch('/api/awards', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          nominee_ids: nextNominees.map((m) => m.id),
          winner_id: nextWinner ? nextWinner.id : null,
          category: resolvedCategory,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error || 'Failed to save nominations';
        setError(errorMessage);
        setErrorDetails({ source: 'workshop', status: response.status, details: errorData });
        return;
      }

      setCurrentNominees(nextNominees);
      setCurrentWinner(nextWinner);
      setCustomNominees(nextNominees);
      customNomineesRef.current = nextNominees;
      setCustomWinner(nextWinner);
      customWinnerRef.current = nextWinner;
      setHasCustomNominations(true);
      setIsUsingCustomView(true);
      isUsingCustomViewRef.current = true;
      if (user?.id) {
        setCachedEntry(user.id, resolvedCategory, year, {
          nominee_ids: nextNominees.map((m) => m.id),
          winner_id: nextWinner ? nextWinner.id : null,
          updated_at: new Date().toISOString(),
        });
        if (!isWorkshop) {
          setViewPreference(user.id, resolvedCategory, year, 'custom');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save nominations');
      setErrorDetails({ source: 'workshop', details: err instanceof Error ? err.message : String(err) });
    }
  };

  useEffect(() => {
    if (!isWorkshop) return;
    // Skip re-sync when applyWorkshopState already set nominees/selectedWinner directly.
    // This prevents a re-render loop where persistWorkshopState updates currentNominees,
    // which triggers this effect, which re-sets nominees to the same values.
    if (workshopMutationInFlightRef.current) return;
    setNominees([...currentNominees]);
    setSelectedWinner(currentWinner ?? currentNominees[0] ?? null);
    onEditingChange?.(false);
  }, [isWorkshop, currentNominees, currentWinner, onEditingChange]);

  const applyWorkshopState = async (nextNominees: Movie[], nextWinner: Movie | null) => {
    // Mark mutation in-flight so the workshop sync effect doesn't re-sync
    // from currentNominees (which persistWorkshopState will update shortly).
    workshopMutationInFlightRef.current = true;
    setNominees(nextNominees);
    setSelectedWinner(nextWinner);
    const nomineeIds = new Set(nextNominees.map((m) => m.id));
    setAvailableMovies(allMoviesForYear.filter((m) => !nomineeIds.has(m.id)));
    await persistWorkshopState(nextNominees, nextWinner);
    workshopMutationInFlightRef.current = false;
  };

  // Expose imperative API for external nominee additions (e.g. from YearExplorer)
  useImperativeHandle(ref, () => ({
    addNominee: (movie: Movie) => {
      if (!isWorkshop) return;
      if (activeWorkshopNominees.length >= 10) return;
      if (activeWorkshopNominees.some((m) => m.id === movie.id)) return;
      const nextNominees = [...activeWorkshopNominees, movie];
      const nextWinner = activeWorkshopWinner ?? nextNominees[0] ?? null;
      void applyWorkshopState(nextNominees, nextWinner);
    },
  }), [isWorkshop, activeWorkshopNominees, activeWorkshopWinner, applyWorkshopState]);

  const handleWorkshopWinner = async (movie: Movie) => {
    if (!isWorkshop) return;
    await applyWorkshopState([...activeWorkshopNominees], movie);
  };

  const handleWorkshopRemove = async (movieId: number) => {
    if (!isWorkshop) return;
    const nextNominees = activeWorkshopNominees.filter((m) => m.id !== movieId);
    const nextWinner =
      activeWorkshopWinner?.id === movieId ? nextNominees[0] ?? null : activeWorkshopWinner;
    await applyWorkshopState(nextNominees, nextWinner);
  };

  const handleWorkshopReset = async () => {
    if (!isWorkshop) return;
    const resetNominees = [...movies];
    const resetWinner = winner ?? resetNominees[0] ?? null;
    await applyWorkshopState(resetNominees, resetWinner);
  };

  const contentBlock = (
    <>
    <div className={`award-editable-section flex flex-col w-full rounded-xl shadow-md light-glass dark:dark-glass p-4 md:p-6${compact ? '' : ' mb-24'}${isEditing ? ' pb-32 md:pb-0' : ''}`}>

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
                          category: resolvedCategory,
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
          {!isEditing ? (
            /* READ MODE LAYOUT */
            <div className="flex flex-col gap-12 md:flex-row">
              {/* Winner */}
              {!compact && (
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
              )}

              {/* Divider */}
              {!compact && <div className="hidden w-px bg-gray-200 md:block dark:bg-gray-700" />}

              {/* Nominees */}
              <div className={`w-full ${compact ? "" : "md:w-2/3"}`}>
                <div className="flex flex-col items-start justify-between gap-2 mb-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✉️</span>
                    <h3 className="text-2xl font-bold text-[#7e7e7e]">
                      Nominees
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!isWorkshop && compact && user && !isEditing && (
                      <button
                        onClick={handleStartEditing}
                        className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-blue-600 transition-colors rounded-lg dark:text-gray-500 dark:border-gray-600 bg-blue-50 dark:bg-gray-800 hover:bg-blue-100"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                    {loadingNominations && (
                      <span className="flex items-center gap-1 text-xs font-medium text-gray-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Refreshing…
                      </span>
                    )}
                    {!isWorkshop && hasCustomNominations ? (
                      <>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${isUsingCustomView
                            ? 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-gray-900'
                            : 'text-gray-500 bg-gray-50 dark:text-gray-400 dark:bg-gray-900'
                          }`}
                        >
                          {isUsingCustomView
                            ? `Viewing Custom (${customNominees?.length ?? 0})`
                            : `Saved Custom (${customNominees?.length ?? 0})`}
                        </span>
                        <button
                          onClick={handleViewToggle}
                          disabled={!hasStoredCustom}
                          className="text-xs font-medium text-yellow-300 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isUsingCustomView ? 'Show Default' : 'View Custom'}
                        </button>
                      </>
                    ) : !isWorkshop ? (
                      <span className="px-2 py-1 text-xs font-medium text-gray-500 rounded dark:bg-gray-950 bg-gray-50">
                        {resolvedCategory === 'best-picture' ? 'Default (Top 10 • 7+ first)' : 'Default (Top 10)'}
                      </span>
                    ) : null}
                    {showWorkshopReset && (
                      <button
                        onClick={handleWorkshopReset}
                        className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-orange-600 transition-colors rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-gray-800 dark:text-orange-300"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <div className="mb-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {isWorkshop ? activeWorkshopNominees.length : nomineeCount} / 10 nominees
                  </p>
                  {(isWorkshop ? activeWorkshopNominees.length < 5 : nomineeCount < 5) && (
                    <p className="text-xs text-amber-600 dark:text-amber-300/90">
                      Add {nomineesNeededForComplete} more to reach a complete ballot.
                    </p>
                  )}
                </div>
                {isWorkshop ? (
                  <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <SortableContext
                      items={activeWorkshopNominees.map((movie) => movie.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                        {Array.from({ length: 10 }).map((_, index) => {
                          const movie = activeWorkshopNominees[index];
                          if (movie) {
                            return (
                              <WorkshopNomineeCard
                                key={movie.id}
                                movie={movie}
                                isWinner={activeWorkshopWinner?.id === movie.id}
                                onSetWinner={() => handleWorkshopWinner(movie)}
                                onRemove={() => handleWorkshopRemove(movie.id)}
                              />
                            );
                          }

                          return (
                            <button
                              type="button"
                              key={`empty-slot-${index}`}
                              className="aspect-[2/3] rounded-lg border border-dashed border-gray-300/80 dark:border-gray-700/80 bg-gray-50/70 dark:bg-gray-900/35 p-3 flex flex-col items-center justify-center text-center"
                              aria-label="Empty nominee slot"
                              onClick={onRequestScrollToContenders}
                            >
                              <Film className="w-6 h-6 text-gray-500/70 mb-2" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Empty slot - rate more films to fill this
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                    {Array.from({ length: 10 }).map((_, index) => {
                      const movie = displayNominees[index];
                      if (movie) {
                        return (
                          <MovieCard
                            key={movie.id}
                            movie={movie}
                            imageMode={nomineeImageMode}
                            onClick={() => handleOpenModal(movie)}
                          />
                        );
                      }

                      return (
                        <button
                          type="button"
                          key={`empty-slot-${index}`}
                          className="aspect-[2/3] rounded-lg border border-dashed border-gray-300/80 dark:border-gray-700/80 bg-gray-50/70 dark:bg-gray-900/35 p-3 flex items-center justify-center"
                          aria-label="Empty nominee slot"
                          onClick={onRequestScrollToContenders}
                        >
                          <Film className="w-6 h-6 text-gray-500/70" />
                        </button>
                      );
                    })}
                  </div>
                )}
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
                        title={resolvedCategory === 'best-picture' ? 'Reset to default nominees (7+ first, then fill to 10)' : 'Reset to default nominees (top 10)'}
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
    </>
  );

  if (compact) {
    return contentBlock;
  }

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

        {contentBlock}
      </div>
    </section>
  );
});

export default EditableYearSection;

function WorkshopNomineeCard({
  movie,
  isWinner,
  onSetWinner,
  onRemove,
}: {
  movie: Movie;
  isWinner: boolean;
  onSetWinner: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: movie.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const posterSrc = normalizeImageUrl(movie.poster_url || movie.thumb_url);
  const ranking = Math.round(movie.rankings?.[0]?.ranking ?? 0);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative aspect-[2/3] rounded-lg overflow-hidden border ${
        isWinner
          ? "border-yellow-400/70 shadow-[0_0_0_1px_rgba(250,204,21,0.35),0_0_24px_rgba(250,204,21,0.2)]"
          : "border-gray-700/70"
      } bg-gray-900`}
    >
      {posterSrc ? (
        <img src={posterSrc} alt={movie.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <Film className="w-8 h-8 text-gray-500" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

      <button
        type="button"
        onClick={onSetWinner}
        className={`absolute top-2 left-2 z-10 p-1 rounded-full border ${
          isWinner
            ? "bg-yellow-400 text-black border-yellow-300"
            : "bg-black/50 text-gray-300 border-gray-500 hover:text-yellow-300 hover:border-yellow-400/60"
        }`}
        aria-label={isWinner ? "Current winner" : "Set winner"}
      >
        <Crown className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 z-10 p-1 rounded-full bg-black/55 text-gray-200 border border-gray-500 hover:text-red-300 hover:border-red-400/70"
        aria-label="Remove nominee"
      >
        <X className="w-4 h-4" />
      </button>

      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute bottom-2 right-2 z-10 p-1 rounded bg-black/55 text-gray-200 border border-gray-500 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder nominee"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="absolute bottom-2 left-2 right-10 z-10">
        <p className="text-xs font-semibold text-white line-clamp-2">{movie.title}</p>
      </div>
      {ranking > 0 && (
        <div className="absolute bottom-2 left-2 z-10 -translate-y-6 text-[11px] px-1.5 py-0.5 rounded bg-white/90 text-black font-bold">
          {ranking}
        </div>
      )}
    </div>
  );
}

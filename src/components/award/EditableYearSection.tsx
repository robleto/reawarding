"use client";

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { useSupabaseClient, useUser, useSessionContext } from '@supabase/auth-helpers-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Edit3, Save, X, AlertCircle, RotateCcw, Loader2, Film, GripVertical, Star, Check, Trophy, Plus } from "lucide-react";
import MovieCard from "./MovieCard";
import WinnerCard from "./WinnerCard";
import AwardCard from "@/components/home/AwardCard";
import DraggableNomineeCard from "./DraggableNomineeCard";
import SelectableMovieItem from "./SelectableMovieItem";
import MovieDetailModal from "../movie/MovieDetailModal";
import RatingModal from "@/components/movie/RatingModal";
import { getRatingStyle } from "@/utils/getRatingStyle";
import { getRatingDefinition } from "@/lib/ratingScale";
import type { Movie } from "@/types/types";
import { useGlobalToast } from '@/hooks/useGlobalToast';
import { normalizeImageUrl } from "@/utils/imageUrl";
import type { Database } from "@/types/supabase";
 
const STORAGE_KEY = 'reawarding-awards-cache-v1';
const LAST_USER_KEY = 'reawarding-awards-last-user';
const PREFERENCE_KEY = 'reawarding-awards-preference-v1';

type CachedNominationPayload = {
  nominee_ids: string[];
  winner_id: string | null;
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
  nominee_ids: string[];
  winner_id: string | null;
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
  /** Optional direct rank updater for workshop cards (used by YearExplorer). */
  onWorkshopRankUpdate?: (
    movieId: string,
    updates: { seen_it?: boolean; ranking?: number | null }
  ) => void;
  /** Fires when workshop nominees change — provides real-time nominee IDs + winner ID. */
  onWorkshopNomineesChange?: (nomineeIds: string[], winnerId: string | null) => void;
  /** When provided, Edit button calls this instead of toggling inline editing. Used by Awards page to open YearExplorer. */
  onEditRequest?: () => void;
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
  onWorkshopRankUpdate,
  onWorkshopNomineesChange,
  onEditRequest,
}: EditableYearSectionProps, ref) {
  const supabase = useSupabaseClient<Database>();
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
  // Workshop mode: seed selectedWinner from the winner prop so the crown
  // reflects the user's saved choice immediately on open.
  const [selectedWinner, setSelectedWinner] = useState<Movie | null>(
    isWorkshop ? (winner ?? null) : null
  );
  const [availableMovies, setAvailableMovies] = useState<Movie[]>(() => {
    const nomineeIds = initialNominees.map((m) => m.id);
    return allMoviesForYear.filter((m) => !nomineeIds.includes(m.id));
  });
  const [activeId, setActiveId] = useState<string | null>(null);
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
  const [, setJustSeen] = useState<Set<string>>(new Set());

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
            .map((id: string) => allMoviesForYear.find(m => m.id === id))
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
          // Use saved nominations unless the user has explicitly chosen 'default'.
          // When storedPref is null (first visit, no preference yet), default to
          // showing the saved data so the Awards page matches YearExplorer.
          const storedPref = user?.id ? getViewPreference(user.id, resolvedCategory, year) : null;
          const shouldUseCustom = (isWorkshop || storedPref !== 'default') && nomineeMovies.length > 0;
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

  // Tracks whether the guest else-branch below has already initialized the
  // workshop. Without this, the effect re-fires whenever syncView or
  // loadExistingNominations changes identity (which happens on every movies
  // prop change), and unconditionally resets hasCustomNominations + calls
  // syncView('default') — wiping any workshop nominees the user just added.
  const hasInitializedGuestRef = useRef(false);

  // Load custom nominations on component mount
  useEffect(() => {
    // Don't do anything while session is loading
    if (sessionLoading) {
      return;
    }

    if (typeof window !== 'undefined' && user?.id) {
      window.localStorage.setItem(LAST_USER_KEY, user.id);
    }

    if (user) {
      // When a user logs in (auth transition), allow the guest branch to
      // re-initialize on a future logout.
      hasInitializedGuestRef.current = false;
      if (!hasLoadedInitialRef.current) {
        hasLoadedInitialRef.current = true;
        loadExistingNominations();
      }
    } else {
      // Initialize guest state once per guest session. Re-runs of this effect
      // (triggered by syncView/loadExistingNominations identity changes) must
      // not clobber the workshop's local state once it's been touched.
      if (hasInitializedGuestRef.current) return;
      hasInitializedGuestRef.current = true;
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

  const handleRemoveNominee = (movieId: string) => {
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

  // Long-press to drag so touch scrolling isn't hijacked by the sortable
  const dndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
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
    // Prefer the passed winner prop if it's still in nominees; fall back to first.
    const preferred =
      winner && nominees.some((m) => m.id === winner.id) ? winner : nominees[0];
    setSelectedWinner(preferred);
  }, [isWorkshop, nominees, selectedWinner, winner]);

  const handleSave = async () => {
    // Wait for session to load before checking user
    if (sessionLoading) {
      return;
    }
    
    if (!user) {
      showToast('Please sign in to save your nominations.', 'info');
      return;
    }

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

  const handleModalUpdate = (movieId: string, newRanking: number | null, newSeenIt: boolean) => {
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

  const handleWorkshopRankingChange = (movieId: string, nextRanking: number | null) => {
    const inNominees = nominees.find((m) => m.id === movieId);
    const inCurrent = currentNominees.find((m) => m.id === movieId);
    const inAvailable = availableMovies.find((m) => m.id === movieId);
    const movie = inNominees ?? inCurrent ?? inAvailable ?? null;
    const seenIt = movie?.rankings?.[0]?.seen_it ?? true;

    handleModalUpdate(movieId, nextRanking, seenIt);
    onWorkshopRankUpdate?.(movieId, { ranking: nextRanking, seen_it: seenIt });
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

  const upsertAwardsClientSide = React.useCallback(
    async (nextNominees: Movie[], nextWinner: Movie | null) => {
      if (!user) {
        return { ok: false as const, message: 'Please sign in to save your nominations.' };
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      let activeSession = session;
      if (!activeSession && !sessionError) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          return {
            ok: false as const,
            message: 'Your session expired. Please sign in again.',
            error: refreshError,
          };
        }
        activeSession = refreshed.session;
      }

      if (!activeSession) {
        return {
          ok: false as const,
          message: 'Your session expired. Please sign in again.',
          error: sessionError ?? null,
        };
      }

      const doUpsert = async () =>
        supabase
          .from('awards')
          .upsert(
            {
              user_id: user.id,
              year: Number(year),
              category: resolvedCategory,
              nominee_ids: nextNominees.map((m) => m.id),
              winner_id: nextWinner ? nextWinner.id : null,
              updated_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,year,category' }
          )
          .select();

      let { error: upsertError } = await doUpsert();

      if (upsertError && upsertError.code === '23503') {
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
        ({ error: upsertError } = await doUpsert());
      }

      if (upsertError) {
        const message = /row-level security|RLS|permission|AuthSessionMissingError/i.test(upsertError.message || '')
          ? 'Your session expired. Please sign in again.'
          : (upsertError.message || 'Failed to save nominations');
        return { ok: false as const, message, error: upsertError };
      }

      return { ok: true as const };
    },
    [supabase, user, year, resolvedCategory]
  );

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
        if (response.status === 401) {
          const fallback = await upsertAwardsClientSide(nextNominees, nextWinner);
          if (fallback.ok) {
            setError(null);
            setErrorDetails(null);
            return;
          }
          setError(fallback.message);
          setErrorDetails({ source: 'workshop', status: response.status, details: fallback.error ?? errorData });
          return;
        }
        const errorMessage = errorData?.error || 'Failed to save nominations';
        setError(errorMessage);
        setErrorDetails({ source: 'workshop', status: response.status, details: errorData });
        return;
      }
      // State was already updated optimistically in applyWorkshopState.
      // Only set view preference on successful persist.
      if (user?.id && !isWorkshop) {
        setViewPreference(user.id, resolvedCategory, year, 'custom');
      }
    } catch (err) {
      const fallback = await upsertAwardsClientSide(nextNominees, nextWinner);
      if (fallback.ok) {
        setError(null);
        setErrorDetails(null);
        return;
      }
      setError(fallback.message ?? (err instanceof Error ? err.message : 'Failed to save nominations'));
      setErrorDetails({ source: 'workshop', details: fallback.error ?? (err instanceof Error ? err.message : String(err)) });
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

  // Mirror new auto-derived nominees from the parent's `movies` prop into the
  // workshop. Without this, when a user rates another film 7+ while the
  // YearExplorer is open, the parent's defaultNominees grows but the workshop's
  // local `nominees` doesn't always pick it up (the YearExplorer auto-promote
  // path can short-circuit because the film is already in the displayNominees
  // fallback). The bug surface: the Add Nominee button shows a stale "Add up to
  // N more films" count while the cup correctly shows the new total.
  //
  // Only mirrors NEW films (never re-adds removed ones) and only when the user
  // hasn't started customizing the workshop. Once they touch it, their intent
  // wins via the standard applyWorkshopState path.
  useEffect(() => {
    if (!isWorkshop) return;
    if (workshopMutationInFlightRef.current) return;
    if (hasCustomNominations) return;
    setNominees((prev) => {
      const prevIds = new Set(prev.map((m) => m.id));
      const additions = movies.filter((m) => !prevIds.has(m.id));
      if (additions.length === 0) return prev;
      return [...prev, ...additions];
    });
    setCurrentNominees((prev) => {
      const prevIds = new Set(prev.map((m) => m.id));
      const additions = movies.filter((m) => !prevIds.has(m.id));
      if (additions.length === 0) return prev;
      return [...prev, ...additions];
    });
  }, [movies, isWorkshop, hasCustomNominations]);

  const applyWorkshopState = async (nextNominees: Movie[], nextWinner: Movie | null) => {
    // Mark mutation in-flight so the workshop sync effect doesn't re-sync
    workshopMutationInFlightRef.current = true;
    // Optimistic: update ALL state immediately so nothing can roll back
    setNominees(nextNominees);
    setSelectedWinner(nextWinner);
    setCurrentNominees(nextNominees);
    setCurrentWinner(nextWinner);
    setCustomNominees(nextNominees);
    customNomineesRef.current = nextNominees;
    setCustomWinner(nextWinner);
    customWinnerRef.current = nextWinner;
    setHasCustomNominations(true);
    setIsUsingCustomView(true);
    isUsingCustomViewRef.current = true;
    const nomineeIds = new Set(nextNominees.map((m) => m.id));
    setAvailableMovies(allMoviesForYear.filter((m) => !nomineeIds.has(m.id)));
    // Optimistic cache
    if (user?.id) {
      setCachedEntry(user.id, resolvedCategory, year, {
        nominee_ids: nextNominees.map((m) => m.id),
        winner_id: nextWinner ? nextWinner.id : null,
        updated_at: new Date().toISOString(),
      });
    }
    // Notify parent immediately (before API call)
    onWorkshopNomineesChange?.(
      nextNominees.map((m) => m.id),
      nextWinner ? nextWinner.id : null
    );
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

  const handleWorkshopRemove = async (movieId: string) => {
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
    <div className={`award-editable-section flex flex-col w-full rounded-xl shadow-md dark-glass p-4 md:p-8${compact ? '' : ' mb-12 md:mb-24'}${isEditing ? ' pb-32 md:pb-0' : ''}`}>

          {/* Error Message */}
          {error && (
            <div className="p-3 mb-4 rounded-lg border border-red-500/30 bg-red-500/10">
              <div className="flex items-center gap-2 text-red-300">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
                {errorDetails && (
                  <button
                    onClick={() => setShowErrorDetails(v => !v)}
                    className="ml-auto text-xs font-medium underline decoration-red-400/50 hover:decoration-red-300"
                  >
                    {showErrorDetails ? 'Hide details' : 'Why did this fail?'}
                  </button>
                )}
              </div>
              {errorDetails && showErrorDetails && (
                <div className="mt-2 text-xs text-red-200 space-y-1">
                  {errorDetails.status && (<div>Status: {errorDetails.status}</div>)}
                  {errorDetails.code && (<div>Code: {errorDetails.code}</div>)}
                  {errorDetails.source && (<div>Source: {errorDetails.source}</div>)}
                  {errorDetails.hint && (<div>Hint: {errorDetails.hint}</div>)}
                  {errorDetails.details && (
                    <pre className="mt-1 max-h-40 overflow-auto bg-black/40 border border-red-500/30 rounded p-2 whitespace-pre-wrap break-all">
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
                      className="text-[11px] px-2 py-1 rounded border border-red-500/40 text-red-300 hover:bg-red-500/15"
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
            <div className="flex flex-col gap-6 md:flex-row md:gap-8">
              {/* Winner — mobile shows a centered, width-capped exhibit so the
                  nominees stay within the first screenful; desktop keeps the
                  full-column poster beside the grid. */}
              {!compact && (
              <div className="w-full md:w-1/3">
                {/* Eyebrow is desktop-only — on mobile the award artifact
                    carries its own plaque, trophy, and category label. */}
                <div className="hidden md:flex items-center gap-2 mb-4">
                  <Trophy className="w-3.5 h-3.5 text-gold-500/60" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-500/60">Best Picture</p>
                </div>
                {displayWinner ? (
                  <>
                    {/* Mobile: the canonical gilt award artifact */}
                    <div className="flex justify-center md:hidden">
                      <AwardCard
                        year={Number(year)}
                        winnerTitle={displayWinner.title}
                        winnerPoster={displayWinner.poster_url}
                        nomineeCount={nomineeCount}
                        onClick={() => handleOpenModal(displayWinner)}
                      />
                    </div>
                    {/* Desktop: full-column featured poster beside the grid */}
                    <div className="hidden md:block">
                      <WinnerCard
                        movie={displayWinner}
                        onClick={() => handleOpenModal(displayWinner)}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No winner selected yet.
                  </div>
                )}
              </div>
              )}

              {/* Divider */}
              {!compact && <div className="hidden w-px bg-gray-700/40 md:block" />}

              {/* Nominees */}
              <div className={`w-full ${compact ? "" : "md:w-2/3"}`}>
                {/* Section header row — nominees label + edit ballot top-right */}
                <div className="flex flex-wrap items-center justify-between gap-y-2 mb-3">
                  <div className="flex items-baseline gap-3">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-gray-500">Nominees</p>
                    {(() => {
                      const count = isWorkshop ? activeWorkshopNominees.length : nomineeCount;
                      if (count >= 10) return <span className="text-sm font-medium text-emerald-400">Full Ballot</span>;
                      if (count >= 5) return <span className="font-mono text-sm font-medium tabular-nums text-gray-400">{count}</span>;
                      if (count > 0) return <span className="font-mono text-sm font-medium tabular-nums text-gray-500">{count}</span>;
                      return null;
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    {user && !isEditing && !isWorkshop && (
                      <button
                        onClick={onEditRequest ?? handleStartEditing}
                        className="flex items-center gap-1.5 min-h-[44px] px-3.5 text-sm font-medium text-gray-300 border border-gray-700/40 rounded-lg hover:text-white hover:border-gray-600 hover:bg-gray-800/60 transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit ballot
                      </button>
                    )}
                    {loadingNominations && (
                      <span className="flex items-center gap-1 text-xs font-medium text-gray-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                      </span>
                    )}
                    {/* Auto-saved indicator hidden for guests — for them nothing
                        is persisted server-side, and the green checkmark undercuts
                        the "Sign up to save" CTA shown elsewhere on the page. */}
                    {isWorkshop && user && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                        {isSaving ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Saving…
                          </>
                        ) : (
                          <>
                            <Check className="w-3 h-3" />
                            Auto-saved
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                {/* Ballot guidance — secondary info below header, tertiary metadata last */}
                <div className="mb-4 space-y-0.5">
                  {(() => {
                    const count = isWorkshop ? activeWorkshopNominees.length : nomineeCount;
                    if (count >= 10) return null; /* Full ballot — no guidance needed */
                    if (count >= 5) {
                      return (
                        <p className="text-sm text-gray-500">
                          {10 - count} more {10 - count === 1 ? "film" : "films"} to complete a Full Ballot
                        </p>
                      );
                    }
                    if (count > 0 && count < 5) {
                      return (
                        <p className="text-sm text-amber-400/60">
                          Rate {5 - count} more 7+ to fill the 5 nominee slots
                        </p>
                      );
                    }
                    return null;
                  })()}
                  {/* Tertiary — system metadata, visually de-emphasized */}
                  {!isWorkshop && !hasCustomNominations && nomineeCount > 0 && (
                    <p className="text-[9px] text-gray-600 pt-1">
                      Auto-selected · top rated · 7+ first
                    </p>
                  )}
                  {/* View toggle lives here in the metadata whisper, not the
                      header — comparing saved vs auto-derived is a rare,
                      curiosity-driven action. Generous py keeps it tappable
                      without visual weight. */}
                  {!isWorkshop && hasCustomNominations && (
                    <p className={`text-[10px] pt-1 ${isUsingCustomView ? 'text-gold-500/40' : 'text-gray-600'}`}>
                      {isUsingCustomView ? 'Custom selection' : 'Custom saved'}
                      {hasStoredCustom && (
                        <>
                          {' · '}
                          <button
                            onClick={handleViewToggle}
                            className="underline decoration-dotted underline-offset-2 hover:text-gray-400 py-2 -my-2 px-1 -mx-0.5"
                          >
                            {isUsingCustomView ? 'show default' : 'show custom'}
                          </button>
                        </>
                      )}
                    </p>
                  )}
                </div>
                {isWorkshop ? (
                  <DndContext sensors={dndSensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <SortableContext
                      items={activeWorkshopNominees.map((movie) => movie.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1" data-tour-grid="nominees">
                        {activeWorkshopNominees.map((movie, index) => (
                          <WorkshopNomineeRow
                            key={movie.id}
                            movie={movie}
                            rank={index + 1}
                            isWinner={activeWorkshopWinner?.id === movie.id}
                            onSetWinner={() => handleWorkshopWinner(movie)}
                            onRemove={() => handleWorkshopRemove(movie.id)}
                            onRankingChange={(value) => handleWorkshopRankingChange(movie.id, value)}
                          />
                        ))}
                        {activeWorkshopNominees.length < 10 && (() => {
                          const remaining = 10 - activeWorkshopNominees.length;
                          return (
                            <button
                              type="button"
                              onClick={onRequestScrollToContenders}
                              data-tour-empty-slot="true"
                              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-gold-500/30 bg-gold-500/[0.04] text-gold-300/80 hover:border-gold-400/50 hover:bg-gold-500/[0.08] hover:text-gold-200 transition-colors text-sm font-medium"
                            >
                              <Plus className="w-4 h-4" />
                              Add up to {remaining} more {remaining === 1 ? "film" : "films"} for this year
                            </button>
                          );
                        })()}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  /* Responsive nominee grid using unified MovieCard:
                     mobile  → single-column compact rows
                     desktop → 5-column poster grid (2 rows of 5) */
                  <>
                    {/* Desktop: 5-col poster grid */}
                    <div className="hidden md:grid md:grid-cols-5 gap-2">
                      {displayNominees.map((movie, index) => (
                        <MovieCard
                          key={movie.id}
                          movie={movie}
                          variant="grid"
                          isWinner={index === 0}
                          onClick={() => handleOpenModal(movie)}
                        />
                      ))}
                    </div>
                    {/* Mobile: single-column compact rows — same anatomy as
                        the rankings list. Rank numbers are real information
                        here: the ballot is ordered. */}
                    <div className="flex flex-col gap-2 md:hidden">
                      {displayNominees.map((movie, index) => {
                        const rowRating = Math.round(movie.rankings?.[0]?.ranking ?? 0);
                        return (
                          <MovieCard
                            key={movie.id}
                            movie={movie}
                            variant="compact"
                            rank={index + 1}
                            isWinner={index === 0}
                            ratingLabel={rowRating > 0 ? getRatingDefinition(rowRating)?.label ?? null : null}
                            onClick={() => handleOpenModal(movie)}
                          />
                        );
                      })}
                    </div>
                    {displayNominees.length === 0 && (
                      <p className="text-xs text-gray-500 py-3 text-center">No nominees yet.</p>
                    )}
                  </>
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
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Nominees</p>
                      <span className="text-xs text-gray-500 tabular-nums">
                        {nominees.length}/10
                      </span>
                      {selectedWinner && (
                        <span className="flex items-center gap-1 text-xs font-medium text-gold-500/80">
                          <Trophy className="w-3 h-3" />
                          {selectedWinner.title}
                        </span>
                      )}
                    </div>
                    {/* Action buttons for md+ */}
                    <div className="items-center hidden gap-2 md:flex">
                      <button
                        onClick={handleResetToDefault}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-orange-300 transition-colors rounded-lg bg-orange-500/10 hover:bg-orange-500/20"
                        title={resolvedCategory === 'best-picture' ? 'Reset to default nominees (7+ first, then fill to 10)' : 'Reset to default nominees (top 10)'}
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                      </button>
                      <button
                        onClick={handleCancelEditing}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 transition-colors rounded-lg bg-gray-800/60 hover:bg-gray-700"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors bg-emerald-600 rounded-lg hover:bg-emerald-500 disabled:bg-gray-600"
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
                      sensors={dndSensors}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={nominees.map(m => m.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                          {nominees.map((movie, index) => (
                            <DraggableNomineeCard
                              key={movie.id}
                              movie={movie}
                              rank={index + 1}
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
                              rank={nominees.findIndex(m => m.id === activeId) + 1}
                              isWinner={false}
                              onSetWinner={() => {}}
                              onRemove={() => {}}
                            />
                          </div>
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  ) : (
                    <div className="flex items-center justify-center py-8 text-gray-500 border-2 border-gray-700 border-dashed rounded-xl">
                      No nominees selected. Add films from the list.
                    </div>
                  )}
                </div>

                {/* Available Movies Section - Right 1/3 */}
                <div className="lg:col-span-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Film className="w-3.5 h-3.5 text-gray-500" />
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                      Available films
                    </h3>
                  </div>
                  <div className="mb-3 text-sm text-gray-500">
                    {year} · <span className="font-mono tabular-nums">{availableMovies.length}</span> films
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

      {/* Mobile action bar — visible only when editing on small screens */}
      {isEditing && (
        <div className="fixed bottom-0 inset-x-0 z-50 md:hidden flex items-center justify-end gap-2 px-4 py-3 bg-charcoal-900/95 backdrop-blur-sm border-t border-gray-700"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-orange-400 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            type="button"
            onClick={handleCancelEditing}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-300 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-500 transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

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
      <div className="relative flex flex-col gap-3 md:flex-row md:gap-10">
        {/* Year label — bright section header on mobile (it's the only header
            there); reverts to the dim rotated watermark beside the desktop
            timeline where the card carries the visual weight. */}
        <h2 className="md:absolute block top-0 md:top-[120px] left-0 text-2xl md:text-3xl font-bold text-gray-100 md:text-gray-600/60 mt-0 md:mt-2 md:rotate-[-90deg] origin-left font-['Unbounded'] tracking-[0.25em]">
          {year}
        </h2>
        <div className="top-0 bottom-0 flex-col items-center hidden md:absolute md:flex left-4">
          <div className="w-4 h-4 mt-2 bg-gray-600 border-2 border-gray-900 rounded-full" />
          <div className="w-px flex-1 bg-gray-700/50" />
        </div>

        {/* Spacer to account for timeline offset */}
        <div className="hidden md:inline-block w-0 md:w-[20px] shrink-0" />

        {contentBlock}
      </div>
    </section>
  );
});

export default EditableYearSection;

function WorkshopNomineeRow({
  movie,
  rank,
  isWinner,
  onSetWinner,
  onRemove,
  onRankingChange,
}: {
  movie: Movie;
  rank: number;
  isWinner: boolean;
  onSetWinner: () => void;
  onRemove: () => void;
  onRankingChange: (value: number | null) => void;
}) {
  const [showRatingModal, setShowRatingModal] = React.useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: movie.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  // Poster, not backdrop — the thumbs mirror holds mixed aspect ratios
  // (2026-07 mixup); a fixed 2:3 poster crop keeps rows uniform.
  const thumbSrc = normalizeImageUrl(movie.poster_url || movie.thumb_url);
  const ranking = Math.round(movie.rankings?.[0]?.ranking ?? 0);
  const ratingStyle = getRatingStyle(ranking);
  const ratingLabel = ranking > 0 ? getRatingDefinition(ranking)?.label ?? null : null;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-1 px-1 md:px-2 py-1 min-h-[72px] rounded-lg border transition-colors ${
          isWinner
            ? "border-gold-500/40 bg-gold-500/5"
            : "border-gray-700/30 bg-charcoal-900/30 hover:bg-gray-800/50"
        }`}
      >
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center touch-none text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Rank number — the ballot is ordered, same column as the display rows */}
        <div className="w-5 flex items-center justify-end text-xs font-mono font-bold text-gray-400 tabular-nums select-none pr-1">
          {rank}
        </div>

        {/* Thumbnail — matches MovieCard compact variant (fixed 2:3 poster crop) */}
        <div className="relative flex-shrink-0 overflow-hidden bg-gray-800 rounded-md shadow-md" style={{ width: 48, height: 72 }}>
          {thumbSrc ? (
            <img src={thumbSrc} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center w-full h-full"><Film className="w-4 h-4 text-gray-600" /></div>
          )}
        </div>

        {/* Title — matches MovieCard compact variant */}
        <p className="flex-1 min-w-0 px-2 text-sm font-semibold text-white leading-tight line-clamp-2 break-words">{movie.title}</p>

        {/* Rating badge — same 44px labeled chip as the display rows */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <button
            type="button"
            onClick={() => setShowRatingModal(true)}
            data-tour-target="rating-badge"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-base font-mono font-bold tabular-nums rounded-md shadow-sm transition-transform active:scale-95"
            style={ranking > 0 ? { backgroundColor: ratingStyle.background, color: ratingStyle.text } : { backgroundColor: 'rgba(75,85,99,0.4)', color: '#9ca3af' }}
          >
            {ranking > 0 ? ranking : <span className="text-sm font-sans">Rate</span>}
          </button>
          {ratingLabel && (
            <span className="mt-0.5 text-xs leading-tight text-gray-400">{ratingLabel}</span>
          )}
        </div>

        {/* Winner toggle */}
        <button
          type="button"
          onClick={onSetWinner}
          className={`flex-shrink-0 p-2 rounded-full border transition-colors ${
            isWinner
              ? "bg-gold-400 text-black border-gold-300"
              : "text-gray-500 border-gray-600 hover:text-gold-300 hover:border-gold-400/60"
          }`}
          aria-label={isWinner ? "Current winner" : "Set as winner"}
        >
          <Trophy className="w-3 h-3" />
        </button>

        {/* Remove */}
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 p-2 text-gray-500 hover:text-red-400 transition-colors"
          aria-label="Remove nominee"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <RatingModal
        isOpen={showRatingModal}
        movieTitle={movie.title}
        posterUrl={movie.poster_url}
        currentRating={ranking || null}
        movieId={movie.id}
        onRate={(value) => onRankingChange(value)}
        onClose={() => setShowRatingModal(false)}
      />
    </>
  );
}

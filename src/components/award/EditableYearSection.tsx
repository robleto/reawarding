"use client";

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { createPortal } from "react-dom";
import { useSupabaseClient, useUser, useSessionContext } from '@supabase/auth-helpers-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Edit3, Save, X, AlertCircle, RotateCcw, Loader2, Film, GripVertical, Star, Check, Trophy, Plus } from "lucide-react";
import MovieCard from "./MovieCard";
import NomineeCardCarousel from "./NomineeCardCarousel";
import { hapticSuccess } from "@/lib/haptics";
import AwardCard from "@/components/home/AwardCard";
import ShareSheet from "@/components/social/ShareSheet";
import { CATEGORY_LABELS } from "@/components/award/AwardsTabs";
import AcademyStamp from "./AcademyStamp";
import DraggableNomineeCard from "./DraggableNomineeCard";
import SelectableMovieItem from "./SelectableMovieItem";
import BallotEditorOverlay from "./BallotEditorOverlay";
import MovieDetailModal from "../movie/MovieDetailModal";
import RatingModal from "@/components/movie/RatingModal";
import { getRatingStyle } from "@/utils/getRatingStyle";
import { getRatingDefinition } from "@/lib/ratingScale";
import type { Movie } from "@/types/types";
import { useGlobalToast } from '@/hooks/useGlobalToast';
import { normalizeImageUrl } from "@/utils/imageUrl";
import { useOfficialAwardWinners, getAcademyStatus } from "@/data/officialAwardWinners";
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
  /**
   * Whether the person currently looking at this page owns the profile/data
   * being shown (i.e. this is THEIR ballot, not merely someone-is-signed-in).
   * Home and the year workshop route are always the signed-in user's own
   * data. A public profile page (`/[username]/awards`) must compute this as
   * `viewer.id === profile.id` (or equivalent) since it can render ANY
   * user's ballot to ANY signed-in visitor.
   *
   * Gates: the "Edit ballot" button, the mount effect that loads/overlays
   * the viewer's own saved nominations (loadExistingNominations + syncView),
   * and — as defense in depth — the actual write paths (handleSave,
   * handleResetToDefault, applyWorkshopState) refuse to persist when false.
   */
  viewerOwnsBallot: boolean;
  /**
   * PERF-1 (docs/audits/2026-08-21-launch-readiness-round3.md): when the
   * caller already has this year's saved nomination in memory (Home's
   * useUserAwards, or a public profile's usePublicProfile — both fetch
   * every year's awards in one query up front), pass it here so the mount
   * effect applies it directly instead of firing its own
   * `/api/awards?year=...` round trip. Pass `null` (not `undefined`) to
   * mean "caller already checked, there's no saved ballot for this year" —
   * `undefined` (the default, omitted prop) falls back to the original
   * per-instance fetch, for callers that don't have the full list preloaded
   * (e.g. the standalone /year/[year] workshop route).
   */
  preloadedNomination?: { nominee_ids: string[]; winner_id: string | null } | null;
  /** Username of the profile whose ballot this is — used to build the share
      link/OG card for a set year's AwardCard. Home passes the signed-in
      user's own username; the public profile route passes its `[username]`
      route param. Omit to skip rendering the Share action entirely. */
  profileUsername?: string;
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
  viewerOwnsBallot,
  preloadedNomination,
  profileUsername,
}: EditableYearSectionProps, ref) {
  const supabase = useSupabaseClient<Database>();
  const user = useUser();
  const { isLoading: sessionLoading } = useSessionContext();
  const { showToast, toast } = useGlobalToast();
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
    // LOOP-M2 guard (first-paint variant): this memo seeds the very first
    // render from the VIEWER's own last-signed-in cache
    // (reawarding-awards-last-user), with no ownership check. On someone
    // else's public profile the viewer is never the profile owner, so this
    // must never seed initialNominees/initialWinner (or the derived
    // hasCustomNominations/customNominees/isUsingCustomView state below) from
    // the viewer's own cached ballot — render strictly from the movies/winner
    // props the page passed in until/unless viewerOwnsBallot is true.
    if (!viewerOwnsBallot) return null;
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
  }, [allMoviesForYear, resolvedCategory, year, isWorkshop, viewerOwnsBallot]);

  const initialNominees = initialCache?.useCustom ? initialCache.nomineeMovies : movies;
  const initialWinner = initialCache?.useCustom ? (initialCache.winnerMovie || null) : (winner || null);

  if (process.env.NODE_ENV === "development") {
    console.log('EditableYearSection user:', user);
  }

  const [isEditing, setIsEditing] = useState(false);
  // Shared by LOOP-3 (reset confirm) and LOOP-5 (discard-unsaved-changes
  // confirm) — one generic confirm dialog instead of two near-identical ones.
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);
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
  const [isShareOpen, setIsShareOpen] = useState(false);

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
        // Seed the parent's live count from this component's own authoritative
        // fetch, not just on subsequent user edits — otherwise YearExplorer
        // shows nominee counts from its own (possibly one-save-stale) prop
        // data until the user's first interaction, disagreeing with the
        // "N/10" text rendered right here from the same nominees array.
        if (isWorkshop) {
          onWorkshopNomineesChange?.(nomineeIds, winnerSource?.id ?? null);
        }
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
        // Same seeding as the custom branch above — this is the "no saved
        // custom ballot yet, fall back to default nominees" path, but the
        // parent still needs the real count from here, not stale prop data.
        if (isWorkshop) {
          onWorkshopNomineesChange?.(nomineeIds, winnerSource?.id ?? null);
        }
      }
    },
    [allMoviesForYear, movies, winner, isWorkshop, onWorkshopNomineesChange]
  );

  // Shared by loadExistingNominations (the fetch path) and the mount effect's
  // preloadedNomination path (PERF-1) — same "apply a saved nomination" logic
  // regardless of whether it came from this component's own /api/awards call
  // or from data the caller already had.
  const applyNominationPayload = React.useCallback(
    (nominations: AwardNomination | null) => {
      setError(null);
      setErrorDetails(null);
      const savedIds = nominations?.nominee_ids ?? [];
      if (savedIds.length > 0) {
        const nomineeMovies = savedIds
          .map((id: string) => allMoviesForYear.find(m => m.id === id))
          .filter(Boolean) as Movie[];
        const winnerMovie = nominations && nominations.winner_id
          ? nomineeMovies.find(m => nominations && m.id === nominations.winner_id) || null
          : null;
        setCustomNominees(nomineeMovies);
        setCustomWinner(winnerMovie);
        customNomineesRef.current = nomineeMovies;
        customWinnerRef.current = winnerMovie;
        setHasCustomNominations(true);
        if (user?.id) {
          setCachedEntry(user.id, resolvedCategory, year, {
            nominee_ids: savedIds,
            winner_id: nominations?.winner_id ?? null,
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
    },
    [allMoviesForYear, movies, resolvedCategory, syncView, user?.id, isWorkshop, year]
  );

  const loadExistingNominations = React.useCallback(async () => {
    setLoadingNominations(true);
    try {
      const response = await fetch(`/api/awards?year=${year}&category=${resolvedCategory}`, {
        credentials: 'same-origin',
      });
      if (response.ok) {
        const data: { nominations: AwardNomination | null } = await response.json();
        applyNominationPayload(data.nominations);
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
  }, [year, resolvedCategory, applyNominationPayload]);

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
    // LOOP-M2 guard: this effect (when viewerOwnsBallot) fetches /api/awards
    // using the CURRENT viewer's session cookie and, if non-empty, overlays
    // it over whatever nominees/winner the parent already computed for the
    // profile being shown. That's only correct when the viewer IS the
    // profile owner (Home, the year workshop). On someone else's public
    // profile this must never run — render strictly from the movies/winner
    // props the page passed in. Ownership doesn't depend on session-load
    // state, so this check runs BEFORE the sessionLoading gate below: while
    // Supabase's session is still restoring (which can race the awards
    // page's own profile fetch), we still want to immediately clear any
    // viewer-cached ballot rather than wait for session load to finish.
    if (!viewerOwnsBallot) {
      hasInitializedGuestRef.current = false;
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
      return;
    }

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
        // PERF-1: skip this instance's own /api/awards round trip when the
        // caller already fetched every year's award in one query and passed
        // this year's slice down.
        if (preloadedNomination !== undefined) {
          applyNominationPayload(preloadedNomination);
        } else {
          loadExistingNominations();
        }
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
  }, [user, sessionLoading, loadExistingNominations, applyNominationPayload, preloadedNomination, syncView, isWorkshop, viewerOwnsBallot]);

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

  const performCancelEditing = () => {
    setIsEditing(false);
    onEditingChange?.(false);
    setNominees([]);
    setSelectedWinner(null);
    setAvailableMovies([]);
    setError(null);
    setErrorDetails(null);
    setShowErrorDetails(false);
  };

  // LOOP-5: closing the editor (backdrop click, X, Escape, or Cancel) used to
  // silently discard in-session add/remove/reorder/winner edits. Only prompt
  // when something has actually changed since handleStartEditing seeded
  // nominees/selectedWinner from currentNominees/currentWinner — order-
  // sensitive, since a pure reorder with no add/remove is still a real edit.
  const handleCancelEditing = () => {
    const changed =
      nominees.length !== currentNominees.length ||
      nominees.some((m, i) => m.id !== currentNominees[i]?.id) ||
      (selectedWinner?.id ?? null) !== (currentWinner?.id ?? null);

    if (!changed) {
      performCancelEditing();
      return;
    }

    setConfirmDialog({
      title: "Discard unsaved changes?",
      body: "Your edits to this year's ballot haven't been saved yet. Closing now will discard them.",
      confirmLabel: "Discard",
      onConfirm: performCancelEditing,
    });
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
    // Crowning (not un-crowning) is the ceremony's peak — success haptic.
    if (selectedWinner?.id !== movie.id) void hapticSuccess();
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
        // Reordering shouldn't invent a winner — only carry an already-explicit
        // pick to its new position. No winner set stays no winner set.
        const nextWinner = activeWorkshopWinner
          ? reordered.find((m) => m.id === activeWorkshopWinner.id) ?? null
          : null;
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

    // LOOP-M1 defense-in-depth: even if the Edit-ballot button were ever
    // shown to a non-owner viewer by a future regression, refuse to persist.
    // Without this, saving here would overwrite the VIEWER's own real ballot
    // for this year with whatever nominees/winner this instance is showing
    // (which, on a public profile, belong to the profile owner, not them).
    if (!viewerOwnsBallot) {
      const msg = "You don't have permission to edit this ballot.";
      setError(msg);
      showToast(msg, 'error');
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

  const performReset = async () => {
    // LOOP-M1 defense-in-depth: never let a non-owner viewer delete/reset
    // nominations for the year being shown — see the matching guard in
    // handleSave.
    if (!viewerOwnsBallot) {
      const msg = "You don't have permission to edit this ballot.";
      setError(msg);
      showToast(msg, 'error');
      return;
    }

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

  // LOOP-3: Reset used to fire performReset (a hard DELETE of the whole
  // saved ballot) directly on click with no confirmation — a misclick could
  // destroy real curation work with no way back.
  const handleResetToDefault = () => {
    if (!viewerOwnsBallot) {
      const msg = "You don't have permission to edit this ballot.";
      setError(msg);
      showToast(msg, 'error');
      return;
    }
    const nomineeCount = currentNominees.length;
    setConfirmDialog({
      title: "Reset this year's ballot?",
      body: `All ${nomineeCount} nominee${nomineeCount === 1 ? "" : "s"}${
        currentWinner ? " and your winner pick" : ""
      } will be removed. This can't be undone.`,
      confirmLabel: "Reset",
      onConfirm: performReset,
    });
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
  const { winners: officialWinners } = useOfficialAwardWinners();
  const academyStatus =
    resolvedCategory === "best-picture"
      ? getAcademyStatus({
          year: Number(year),
          existingAward: {
            year: Number(year),
            category: "best-picture",
            winnerId: displayWinner?.id ?? null,
            nomineeIds: displayNominees.map((m) => m.id),
          },
          liveNomineeCount: nomineeCount,
          yearMovies: allMoviesForYear,
          winners: officialWinners,
        })
      : null;
  const nomineesNeededForComplete = Math.max(0, 5 - nomineeCount);
  // Ballot card states (docs/design/ballot-card-states.md, States 1 & 2 —
  // No nominees / Thin): below the 5-nominee legitimacy floor (Law 2), the
  // full gilt AwardCard + 5-grid frame reads as mostly-empty ceremony for
  // zero or one data points. Covers nomineeCount 0-4 in one branch since the
  // row shape is identical; only the copy differs (handled inline via
  // displayWinner/nomineeCount checks) between "hasn't started" and "started,
  // still forming." View-mode, non-workshop, non-compact only — compact
  // already renders its own reduced (nominees-only) layout, and the workshop
  // keeps its own editing-specific guidance above the drag list.
  const isThinBallot = !isWorkshop && !compact && nomineeCount < 5;
  const defaultNomineeIds = movies.map((m) => m.id);
  const defaultWinnerId = winner?.id ?? movies[0]?.id ?? null;
  const activeWorkshopNominees = isWorkshop ? nominees : displayNominees;
  const activeWorkshopWinner = isWorkshop ? selectedWinner : displayWinner;
  // Rating-integrity warning (docs/design/ballot-card-states.md): a saved
  // ballot is "living" per Law 6 — ratings can drop below the 7 auto-nominate
  // threshold after the ballot was set, leaving a nominee or winner on the
  // ballot that no longer reflects the user's current opinion. Only applies
  // to a saved/custom ballot — the auto-assembled default view is always
  // live-filtered from current ratings, so nothing on it can go stale.
  const staleNomineeIds = isUsingCustomView
    ? new Set(
        activeWorkshopNominees
          .filter((m) => (m.rankings?.[0]?.ranking ?? 0) < 7)
          .map((m) => m.id)
      )
    : new Set<string>();
  const winnerIsBelowThreshold =
    isUsingCustomView &&
    activeWorkshopWinner != null &&
    (activeWorkshopWinner.rankings?.[0]?.ranking ?? 0) < 7;
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
    // Mirror the read view exactly: no saved winner means no crown, full
    // stop. Defaulting to currentNominees[0] here used to silently crown
    // the top-ranked nominee the moment the workshop opened — visually
    // indistinguishable from an explicit pick, and confusing when the read
    // view had just shown "No winner selected yet." for the same ballot.
    setSelectedWinner(currentWinner ?? null);
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
    // LOOP-M1 defense-in-depth: the workshop auto-save path (drag reorder,
    // set winner, remove, reset, add-via-ref) all funnel through here. Never
    // apply or persist a workshop mutation for a viewer who doesn't own this
    // ballot — see the matching guard in handleSave.
    if (!viewerOwnsBallot) {
      const msg = "You don't have permission to edit this ballot.";
      setError(msg);
      showToast(msg, 'error');
      return;
    }

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
      // Adding a nominee shouldn't invent a winner either — preserve whatever
      // was (or wasn't) already explicitly selected.
      void applyWorkshopState(nextNominees, activeWorkshopWinner ?? null);
    },
  }), [isWorkshop, activeWorkshopNominees, activeWorkshopWinner, applyWorkshopState]);

  const handleWorkshopWinner = async (movie: Movie) => {
    if (!isWorkshop) return;
    await applyWorkshopState([...activeWorkshopNominees], movie);
  };

  // LOOP-4: this auto-saves immediately on tap (no confirm step, unlike the
  // non-workshop editor's Cancel/Save flow) — an Undo toast is the only
  // recovery path for an accidental removal.
  const handleWorkshopRemove = async (movieId: string) => {
    if (!isWorkshop) return;
    const removeIndex = activeWorkshopNominees.findIndex((m) => m.id === movieId);
    if (removeIndex === -1) return;
    const removedMovie = activeWorkshopNominees[removeIndex];
    const previousWinner = activeWorkshopWinner;
    const nextNominees = activeWorkshopNominees.filter((m) => m.id !== movieId);
    const nextWinner =
      previousWinner?.id === movieId ? nextNominees[0] ?? null : previousWinner;
    await applyWorkshopState(nextNominees, nextWinner);

    toast(
      (t) => (
        <span className="flex items-center gap-3">
          <span>Removed “{removedMovie.title}” from your nominees</span>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              const restoredNominees = [...nextNominees];
              restoredNominees.splice(removeIndex, 0, removedMovie);
              void applyWorkshopState(restoredNominees, previousWinner);
            }}
            className="font-semibold underline hover:no-underline"
          >
            Undo
          </button>
        </span>
      ),
      { duration: 6000 }
    );
  };

  const handleWorkshopReset = async () => {
    if (!isWorkshop) return;
    const resetNominees = [...movies];
    const resetWinner = winner ?? resetNominees[0] ?? null;
    await applyWorkshopState(resetNominees, resetWinner);
  };

  const errorBanner = error && (
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
  );

  // View mode keeps the ceremonial dark-glass card exactly as before. Edit
  // mode no longer renders inline here — see editContent / BallotEditorOverlay
  // below, which portals it into a dismissible overlay instead of expanding
  // in place.
  const contentBlock = (
    <>
    {/* Shared Reset (LOOP-3) / discard-unsaved-changes (LOOP-5) confirm —
        portaled above BallotEditorOverlay (z-[45]) and the mobile edit
        action bar (z-50). */}
    {confirmDialog && typeof document !== "undefined" && createPortal(
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
        <div className="bg-charcoal-900 border border-gray-700 rounded-lg w-full max-w-md shadow-xl">
          <div className="p-5 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white">{confirmDialog.title}</h3>
          </div>
          <div className="p-5 text-gray-300">
            <p>{confirmDialog.body}</p>
          </div>
          <div className="p-5 border-t border-gray-800 flex justify-end gap-2">
            <button
              onClick={() => setConfirmDialog(null)}
              className="px-4 py-2 rounded-md border border-gray-700 text-gray-200 hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const { onConfirm } = confirmDialog;
                setConfirmDialog(null);
                onConfirm();
              }}
              className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
            >
              {confirmDialog.confirmLabel}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    {!isEditing && (
    <div className={`award-editable-section relative flex flex-col w-full rounded-xl shadow-md p-4 md:p-8 dark-glass${compact ? '' : ' mb-12 md:mb-24'} overflow-hidden`}>

          {errorBanner}

          {/* Content */}
          {/* READ MODE LAYOUT */}
          {isThinBallot ? (
            /* Thin ballot (1-4 nominees) — docs/design/ballot-card-states.md.
               No gilt AwardCard (gold is reserved for a Set ballot, per
               .impeccable.md), no 5-grid frame with mostly-empty tiles.
               Small poster of the leading pick + the completion nudge
               promoted from a footnote into the actual primary action. */
            <div className="flex items-center gap-4">
              <div className="w-16 flex-shrink-0 sm:w-20">
                {displayWinner ? (
                  <MovieCard
                    movie={displayWinner}
                    variant="grid"
                    onClick={() => handleOpenModal(displayWinner)}
                  />
                ) : (
                  <div className="flex aspect-[2/3] w-full items-center justify-center rounded-xl bg-gray-800">
                    <Film className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-gray-300">
                  {displayWinner ? (
                    <>
                      <span className="font-semibold text-white">{displayWinner.title}</span> is leading — rate {5 - nomineeCount} more 7+ to fill the ballot
                    </>
                  ) : (
                    <>You haven&apos;t rated any {year} films yet.</>
                  )}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full ${i < nomineeCount ? "bg-gold-500" : "bg-gray-700"}`}
                    />
                  ))}
                  <span className="ml-1 font-mono text-[10px] tabular-nums text-gray-500">{nomineeCount} of 5</span>
                </div>
                {user && viewerOwnsBallot && (
                  <button
                    type="button"
                    onClick={onEditRequest ?? handleStartEditing}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 px-3.5 py-2 text-xs font-semibold text-charcoal-900 transition hover:brightness-110"
                  >
                    {nomineeCount === 0 ? <>Rate a {year} film to start</> : <>Rate a {year} film →</>}
                  </button>
                )}
              </div>
              {user && viewerOwnsBallot && (
                <button
                  type="button"
                  onClick={onEditRequest ?? handleStartEditing}
                  className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-gray-700/40 px-3 text-xs font-medium text-gray-300 transition-all hover:border-gray-600 hover:bg-gray-800/60 hover:text-white min-h-[36px]"
                >
                  <Edit3 className="h-3 w-3" />
                  Edit
                </button>
              )}
            </div>
          ) : (
            <div className="relative flex flex-col gap-6 md:flex-row md:gap-8">
              {/* Academy stamp — sits in the open space under the winner
                  title and the first couple nominees of row 2, run past the
                  card's true bottom edge and clipped there by the outer
                  award-editable-section's overflow-hidden (not this inner div
                  — clipping here would leave a padding gap before the real
                  card boundary). Upheld/Reawarded only; see AcademyStamp for
                  why Unscreened has no stamp here. */}
              {!compact && (
                <div className="pointer-events-none absolute -bottom-10 left-[20%] z-10 hidden md:block">
                  <AcademyStamp academyStatus={academyStatus} />
                </div>
              )}
              {/* Winner — mobile shows a centered, width-capped exhibit so the
                  nominees stay within the first screenful; desktop keeps the
                  full-column poster beside the grid. */}
              {!compact && (
              <div className="w-full md:w-1/3">
                {/* Eyebrow is desktop-only — on mobile the award artifact
                    carries its own plaque, trophy, and category label. */}
                <div className="hidden md:flex items-center gap-2 mb-3">
                  <Trophy className="w-3.5 h-3.5 text-gold-500/60" />
                  <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-gold-500/60">Best Picture</p>
                </div>
                {displayWinner ? (
                  <>
                    {/* Mobile: the canonical gilt award artifact, fixed above
                        the nominee shelf — the winner doesn't swipe away as
                        part of a carousel; it gets its own standalone reveal,
                        and the nominees below are a separate, uniform-size
                        browsing shelf (see NomineeCardCarousel). */}
                    <div className="md:hidden flex justify-center mb-4">
                      <AwardCard
                        year={Number(year)}
                        winnerTitle={displayWinner.title}
                        winnerPoster={displayWinner.poster_url}
                        winnerMovieId={displayWinner.id}
                        nomineeCount={nomineeCount}
                        onClick={() => handleOpenModal(displayWinner)}
                        fullWidth
                        academyStatus={academyStatus}
                        onShare={profileUsername ? () => setIsShareOpen(true) : undefined}
                      />
                    </div>
                    {winnerIsBelowThreshold && (
                      <p className="md:hidden mb-4 -mt-2 text-center text-xs text-amber-400/80 leading-snug">
                        Re-rated below 7 — still your pick.{" "}
                        <button
                          type="button"
                          onClick={onEditRequest ?? handleStartEditing}
                          className="underline hover:text-amber-300 transition-colors"
                        >
                          Update ballot
                        </button>{" "}
                        if that&apos;s changed.
                      </p>
                    )}
                    <NomineeCardCarousel
                      nominees={displayNominees}
                      winnerId={displayWinner.id}
                      onSelect={handleOpenModal}
                      staleIds={staleNomineeIds}
                    />
                    {/* Desktop: same gilt-frame ceremony as the mobile artifact
                        above (previously a plain FeaturedCard via WinnerCard —
                        the biggest screen had the least ceremony for the one
                        thing on the page that's supposed to have the most).
                        academyStatus IS passed here now (unlike before) so
                        the "The Academy chose X" caption renders under the
                        winner's title — showCornerStamp={false} keeps this
                        card's own small corner stamp off, since the larger
                        floating AcademyStamp below the grid already covers
                        the verdict graphic for desktop. */}
                    <div className="hidden md:flex justify-center">
                      <AwardCard
                        year={Number(year)}
                        winnerTitle={displayWinner.title}
                        winnerPoster={displayWinner.poster_url}
                        winnerMovieId={displayWinner.id}
                        nomineeCount={nomineeCount}
                        onClick={() => handleOpenModal(displayWinner)}
                        fullWidth
                        academyStatus={academyStatus}
                        showCornerStamp={false}
                        onShare={profileUsername ? () => setIsShareOpen(true) : undefined}
                      />
                    </div>
                    {winnerIsBelowThreshold && (
                      <p className="hidden md:block mt-2 text-center text-xs text-amber-400/80 leading-snug">
                        Re-rated below 7 — still your pick.{" "}
                        <button
                          type="button"
                          onClick={onEditRequest ?? handleStartEditing}
                          className="underline hover:text-amber-300 transition-colors"
                        >
                          Update ballot
                        </button>{" "}
                        if that&apos;s changed.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-start gap-3 py-2">
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Your nominees are set. Who wins?
                    </p>
                    {user && (
                      <button
                        type="button"
                        onClick={onEditRequest ?? handleStartEditing}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gold-300/80 border border-gold-500/30 rounded-md hover:text-gold-200 hover:border-gold-400/60 hover:bg-gold-500/5 transition-all"
                      >
                        <Trophy className="w-3 h-3" />
                        Pick your winner
                      </button>
                    )}
                  </div>
                )}
              </div>
              )}

              {/* Divider */}
              {!compact && <div className="hidden w-px bg-gray-700/40 md:block" />}

              {/* Nominees */}
              <div className={`w-full ${compact ? "" : "md:w-2/3"}`}>
                {/* Section header row. On mobile, read mode has already
                    shown the nominees as carousel slides above — repeating
                    a "Nominees" label + ballot-completeness badge here reads
                    as introducing content that isn't there, and ballot
                    talk (Full Ballot, N more films) is an editing concern,
                    not a reading one. The label/count stays desktop-only,
                    where it genuinely introduces the grid that follows.
                    Workshop (editing) keeps the label/count on every
                    breakpoint — actively building the ballot is exactly
                    when that count matters. items-start (not items-center)
                    keeps "Nominees" aligned with "Best Picture" regardless
                    of what renders in this row.
                    Edit ballot itself only lives here in compact mode
                    (no outer year heading to flank it there). Non-compact
                    mobile puts it beside the year heading instead — see the
                    bottom return statement — so it isn't stranded on its
                    own line below the carousel. */}
                {/* justify-center (mobile) assumed a single centered "Edit
                    ballot" button; workshop mode always shows two separate
                    status groups here (ballot progress, save state) that
                    read as unrelated floating badges when centered together
                    instead of anchored to opposite edges like the ballot
                    rows below them. */}
                <div className={`flex flex-wrap items-start gap-y-2 mb-3 ${isWorkshop ? "justify-between" : "justify-center md:justify-between"}`}>
                  {/* Thin gold "ballot" plaque — view mode only (not workshop,
                      which keeps its own plain gray label out of scope for
                      this pass). Nominee tiles themselves stay exactly as
                      plain as every other poster grid in the app — only this
                      header signals "this is a ballot," not a browse shelf. */}
                  <div className={`items-baseline gap-3 ${isWorkshop ? "flex" : "hidden md:flex px-3 py-1 rounded-full border border-gold-500/20 bg-gold-500/5"}`}>
                    <p className={`text-[12px] font-semibold uppercase tracking-[0.2em] ${isWorkshop ? "text-gray-500" : "text-gold-500/70"}`}>Nominees</p>
                    {(() => {
                      const count = isWorkshop ? activeWorkshopNominees.length : nomineeCount;
                      if (count >= 10) return <span className="text-sm font-medium text-emerald-400">Full Ballot</span>;
                      if (count >= 5) return <span className="font-mono text-sm font-medium tabular-nums text-gray-400">{count}</span>;
                      if (count > 0) return <span className="font-mono text-sm font-medium tabular-nums text-gray-500">{count}</span>;
                      return null;
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    {compact && user && viewerOwnsBallot && !isEditing && !isWorkshop && (
                      <button
                        onClick={onEditRequest ?? handleStartEditing}
                        className="md:hidden flex items-center gap-1.5 min-h-[44px] px-3.5 text-sm font-medium text-gray-300 border border-gray-700/40 rounded-lg hover:text-white hover:border-gray-600 hover:bg-gray-800/60 transition-all"
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
                {isWorkshop ? (
                  <>
                  {/* Ballot guidance — workshop keeps it above the grid; the
                      user is actively editing and wants this context immediately. */}
                  <div className="mb-4 space-y-0.5">
                    {(() => {
                      const count = activeWorkshopNominees.length;
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
                  </div>
                  <DndContext sensors={dndSensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <SortableContext
                      items={activeWorkshopNominees.map((movie) => movie.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1" data-tour-grid="nominees">
                        {activeWorkshopNominees.map((movie, index) => (
                          <div
                            key={movie.id}
                            className={staleNomineeIds.has(movie.id) ? "rounded-lg ring-1 ring-amber-700/40 overflow-hidden" : undefined}
                          >
                            <WorkshopNomineeRow
                              movie={movie}
                              rank={index + 1}
                              isWinner={activeWorkshopWinner?.id === movie.id}
                              onSetWinner={() => handleWorkshopWinner(movie)}
                              onRemove={() => handleWorkshopRemove(movie.id)}
                              onRankingChange={(value) => handleWorkshopRankingChange(movie.id, value)}
                            />
                            {staleNomineeIds.has(movie.id) && (
                              <p className="px-3 pb-1.5 text-[9px] text-amber-400/70">
                                Rated below 7 — remove to update your ballot.
                              </p>
                            )}
                          </div>
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
                  </>
                ) : (
                  /* Responsive nominee grid using unified MovieCard:
                     mobile  → free-scrolling shelf (NomineeCardCarousel)
                     desktop → 5-column poster grid (2 rows of 5) */
                  <>
                    {/* Desktop: 5-col poster grid — alphabetical, matching
                        the mobile shelf (NomineeCardCarousel): this is a
                        ballot to browse, not a leaderboard, so rank order
                        shouldn't leak into read mode and put the winner in
                        the first slot every time. Winner stays in the list,
                        trophy-badged, for the same reason the shelf
                        keeps it — same rationale, same behavior on both. */}
                    <div className="hidden md:grid md:grid-cols-5 gap-2">
                      {[...displayNominees]
                        .sort((a, b) => a.title.localeCompare(b.title))
                        .map((movie) => (
                          <div key={movie.id}>
                            <MovieCard
                              movie={movie}
                              variant="grid"
                              isWinner={displayWinner?.id === movie.id}
                              onClick={() => handleOpenModal(movie)}
                            />
                            {staleNomineeIds.has(movie.id) && (
                              <p className="mt-0.5 text-center text-[9px] font-medium text-amber-400/80">
                                Rated below 7
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                    {/* Mobile nominees now live in the shelf above (see the
                        winner column) — nothing to render here below md. */}
                    {displayNominees.length === 0 && (
                      <p className="text-xs text-gray-500 py-3 text-center">No nominees yet.</p>
                    )}
                    {/* Ballot guidance — moved below the grid in view mode so the
                        header sits flush against the grid and top-aligns with the
                        winner poster; the freed corner above holds the Academy
                        stamp. Edit ballot sits beside this whole block, vertically
                        centered against however many of these lines actually
                        render — in-flow (not absolutely positioned) so it always
                        claims its own space, instead of floating over the grid
                        when a short winner title leaves the poster column
                        shorter than the nominees column. Desktop only (hidden
                        md:flex) — mobile gets the single consolidated line
                        above instead of this whole stack. */}
                    <div className="hidden md:flex mt-4 items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        {nomineeCount < 10 && nomineeCount >= 5 && (
                          <p className="text-sm text-gray-500">
                            {10 - nomineeCount} more {10 - nomineeCount === 1 ? "film" : "films"} to complete a Full Ballot
                          </p>
                        )}
                        {nomineeCount > 0 && nomineeCount < 5 && (
                          <p className="text-sm text-amber-400/60">
                            Rate {5 - nomineeCount} more 7+ to fill the 5 nominee slots
                          </p>
                        )}
                        {/* Tertiary — system metadata, visually de-emphasized */}
                        {!hasCustomNominations && nomineeCount > 0 && (
                          <p className="text-[9px] text-gray-600">
                            Auto-selected · top rated · 7+ first
                          </p>
                        )}
                        {/* View toggle lives here in the metadata whisper, not the
                            header — comparing saved vs auto-derived is a rare,
                            curiosity-driven action. Generous py keeps it tappable
                            without visual weight. */}
                        {hasCustomNominations && (
                          <p className={`text-[10px] ${isUsingCustomView ? 'text-gold-500/40' : 'text-gray-600'}`}>
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
                      {!compact && user && viewerOwnsBallot && !isEditing && !isWorkshop && (
                        <button
                          onClick={onEditRequest ?? handleStartEditing}
                          className="hidden md:flex items-center gap-1.5 min-h-[32px] px-3 text-xs font-medium text-gray-300 border border-gray-700/40 rounded-lg hover:text-white hover:border-gray-600 hover:bg-gray-800/60 transition-all flex-shrink-0"
                        >
                          <Edit3 className="w-3 h-3" />
                          Edit ballot
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
    )}

    {isEditing && (
      <BallotEditorOverlay onClose={handleCancelEditing}>
        {errorBanner}
        {/* EDIT MODE LAYOUT */}
        <div className="space-y-6">
              {/* Editing eyebrow — gray, flat register vs. view mode's gold
                  "Best Picture" eyebrow in the same visual slot, so the two
                  modes read as opposites (Guardrail 8). The gold winner-name
                  chip below is left as-is on purpose: it's a functional
                  status readout ("here's your current pick while editing"),
                  not competing ceremony. */}
              <div className="flex items-center gap-2">
                <Edit3 className="w-3.5 h-3.5 text-gray-500" />
                <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-gray-500">Editing · {year}</p>
              </div>
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
                    {/* Action buttons for md+ — same hue/height/spacing as the
                        mobile action bar below, so the toolbar reads as one
                        control group regardless of breakpoint. */}
                    <div className="items-center hidden gap-2 md:flex">
                      <button
                        onClick={handleResetToDefault}
                        className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-orange-300 transition-all rounded-lg bg-orange-500/10 hover:bg-orange-500/20 active:scale-[0.98]"
                        title={resolvedCategory === 'best-picture' ? 'Reset to default nominees (7+ first, then fill to 10)' : 'Reset to default nominees (top 10)'}
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                      </button>
                      <button
                        onClick={handleCancelEditing}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 text-sm font-medium text-gray-300 transition-all rounded-lg bg-gray-800/60 hover:bg-gray-700 active:scale-[0.98]"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium text-white transition-all bg-emerald-600 rounded-lg hover:bg-emerald-500 disabled:bg-gray-600 active:scale-[0.98]"
                      >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                  {loadingNominations ? (
                    <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 w-full px-1 py-1 md:px-2 min-h-[72px]">
                          <div className="award-skeleton-block flex-shrink-0 w-12 h-[72px]" />
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="award-skeleton-block h-3 w-3/4" />
                            <div className="award-skeleton-block h-3 w-1/3" />
                          </div>
                        </div>
                      ))}
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

        {/* Mobile action bar — visible only when editing on small screens.
            Lives inside BallotEditorOverlay's portal (mounted straight onto
            document.body) rather than beside it in the normal tree: this
            section's outer year-container ancestor (see the awards archive's
            GSAP scroll effect that recedes the previous year) can end up
            with an inline `transform`, and any `position: fixed` descendant
            of a transformed ancestor is positioned relative to THAT
            ancestor instead of the viewport — which is exactly how this bar
            went missing while editing a year that had already scrolled
            "back." Portaled, it has no such ancestor to inherit from. */}
        {isEditing && (
          <div className="fixed bottom-0 inset-x-0 z-50 md:hidden flex items-center justify-end gap-2 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-charcoal-900/95 backdrop-blur-sm border-t border-gray-700">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-orange-300 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 active:scale-[0.98] transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              type="button"
              onClick={handleCancelEditing}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-sm font-medium text-gray-300 rounded-lg bg-gray-800/60 hover:bg-gray-700 active:scale-[0.98] transition-all"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium text-white rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 active:scale-[0.98] transition-all"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </BallotEditorOverlay>
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

      {/* Share sheet — only reachable via AwardCard's onShare, which is only
          wired when profileUsername is known, so displayWinner is guaranteed
          set here (onShare only renders inside the displayWinner branch). */}
      {isShareOpen && displayWinner && profileUsername && (
        <ShareSheet
          year={year}
          winner={displayWinner.title}
          nominees={displayNominees
            .filter((m) => m.id !== displayWinner.id)
            .slice(0, 5)
            .map((m) => m.title)}
          username={profileUsername}
          awardUrl={`/${profileUsername}/awards`}
          categoryLabel={CATEGORY_LABELS[resolvedCategory] ?? "Best Picture"}
          onClose={() => setIsShareOpen(false)}
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
            timeline where the card carries the visual weight. Edit ballot
            flanks it on mobile (display:contents so the wrapper itself
            doesn't disturb h2's md:absolute escape from this flex row) —
            one line with the year instead of a stranded line of its own
            below the carousel. Desktop keeps its own Edit ballot placement
            beside the nominee grid (see contentBlock), so the button here
            is mobile-only. */}
        <div className="flex items-center justify-between gap-3 md:contents">
          {/* font-unbounded (the theme utility mapping to next/font's actual
              --font-unbounded variable), not the literal font-['Unbounded']
              this used to be — that string doesn't match next/font's
              generated @font-face name and was silently falling back to a
              generic sans-serif on the one mobile-visible heading here. */}
          <h2 className="md:absolute block top-0 md:top-[120px] left-0 text-2xl md:text-3xl font-bold text-gray-100 md:text-gray-600/60 mt-0 md:mt-2 md:rotate-[-90deg] origin-left font-unbounded tracking-[0.25em]">
            {year}
          </h2>
          {user && viewerOwnsBallot && !isEditing && !isWorkshop && (
            <button
              onClick={onEditRequest ?? handleStartEditing}
              className="md:hidden flex items-center gap-1.5 min-h-[44px] px-3.5 text-sm font-medium text-gray-300 border border-gray-700/40 rounded-lg hover:text-white hover:border-gray-600 hover:bg-gray-800/60 transition-all flex-shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit ballot
            </button>
          )}
        </div>
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
        // Glass row treatment adapted from Rankings' MovieCard "native"
        // compact row (border-white/10 bg-white/5 backdrop-blur + shadow)
        // instead of the flat, unblurred surface this used to have — same
        // family as the rest of the app's list rows, just with ballot-only
        // controls (drag/crown/remove) that Rankings never needed.
        className={`flex items-center gap-2 px-2.5 py-2 min-h-[76px] rounded-2xl border backdrop-blur-sm shadow-sm transition-colors ${
          isWinner
            ? "border-gold-500/30 bg-gold-500/[0.06] hover:bg-gold-500/10"
            : "border-white/10 bg-white/5 hover:bg-white/[0.08]"
        }`}
        style={{ ...style, boxShadow: "0 2px 8px 0 rgba(0,0,0,0.10)" }}
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

        {/* Rank — its own typographic column (matching Rankings' rows)
            instead of a tiny badge stamped on the poster corner. Ballot
            rank is mutable (it's drag order, not a read-only display
            index like Rankings' rank), but the plain-numeral treatment
            still reads better than an overlay chip. */}
        <div className="w-5 flex-shrink-0 flex items-center justify-end text-xs font-mono font-bold text-gray-400 tabular-nums select-none">
          {rank}
        </div>

        {/* Thumbnail — matches MovieCard compact variant (fixed 2:3 poster
            crop), now free of the rank badge that used to sit on its corner. */}
        <div className="relative flex-shrink-0 overflow-hidden bg-gray-800 rounded-lg shadow-md" style={{ width: 48, height: 72 }}>
          {thumbSrc ? (
            <img src={thumbSrc} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center w-full h-full"><Film className="w-4 h-4 text-gray-600" /></div>
          )}
        </div>

        {/* Title — matches MovieCard compact variant */}
        <p className="flex-1 min-w-0 px-2 text-sm font-semibold text-white leading-tight line-clamp-2 break-words">{movie.title}</p>

        {/* Rating badge — bumped to the same 44px pill Rankings' native rows
            use (was 32px). Mostly read, not set, on this row (winner pick and
            nominee promotion read off it; drag/trophy/remove are the actual
            editing controls) but it's still a real tap target that opens the
            rating modal. */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <button
            type="button"
            onClick={() => setShowRatingModal(true)}
            data-tour-target="rating-badge"
            className="min-w-[44px] min-h-[44px] px-1 flex items-center justify-center text-sm font-mono font-bold tabular-nums rounded-full shadow-sm transition-transform active:scale-95"
            style={ranking > 0 ? { backgroundColor: ratingStyle.background, color: ratingStyle.text } : { backgroundColor: 'rgba(75,85,99,0.4)', color: '#9ca3af' }}
          >
            {ranking > 0 ? ranking : <span className="text-sm font-sans">Rate</span>}
          </button>
          {ratingLabel && (
            <span className="mt-0.5 text-xs leading-tight text-gray-400">{ratingLabel}</span>
          )}
        </div>

        {/* Winner toggle + remove — stacked, not side-by-side (same layout
            as DraggableNomineeCard's sibling row), so the two buttons cost
            one column of width instead of two. before:-inset-1.5 grows each
            button's actual hit area beyond its small visible icon (the same
            trick MovieCard's overlay buttons use) — kept modest, and gap-1.5
            between the two buttons, so the two expanded hit areas don't
            meaningfully collide in this stacked, height-constrained column. */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={onSetWinner}
            className={`relative p-1.5 rounded-full border transition-colors before:content-[''] before:absolute before:-inset-1.5 ${
              isWinner
                ? "bg-gold-400 text-black border-gold-300"
                : "text-gray-500 border-gray-600 hover:text-gold-300 hover:border-gold-400/60"
            }`}
            aria-label={isWinner ? "Current winner" : "Set as winner"}
          >
            <Trophy className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={onRemove}
            className="relative p-1.5 text-gray-500 hover:text-red-400 transition-colors before:content-[''] before:absolute before:-inset-1.5"
            aria-label="Remove nominee"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <RatingModal
        isOpen={showRatingModal}
        movieTitle={movie.title}
        posterUrl={movie.poster_url}
        currentRating={ranking || null}
        movieId={movie.id}
        movieYear={movie.release_year ?? undefined}
        onRate={(value) => onRankingChange(value)}
        onClose={() => setShowRatingModal(false)}
      />
    </>
  );
}

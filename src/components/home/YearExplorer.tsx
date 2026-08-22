/**
 * YearExplorer — Homepage Year Workspace
 *
 * Thin orchestration wrapper that embeds EditableYearSection (compact mode)
 * as the canonical award surface, with a ranking grid below for contextual
 * movie rating.
 *
 * Awards table is canonical truth. EditableYearSection fetches its own saved
 * award from GET /api/awards. The movies/winner props are fallback defaults
 * only — used when no saved award exists.
 */

"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { ArrowLeft, X, Trophy, Info, Star, Plus, HelpCircle, Lock, Film } from "lucide-react";
import { supabase } from "@/lib/supabaseBrowser";
import ContextualTip from "@/components/onboarding/ContextualTip";
import { useGlobalToast } from "@/hooks/useGlobalToast";
import type { Movie } from "@/types/types";
import { useOfficialAwardWinners } from "@/data/officialAwardWinners";
import { normalizeImageUrl } from "@/utils/imageUrl";
import { isCanonicalCandidate } from "@/utils/canonicalFilm";
import EditableYearSection from "@/components/award/EditableYearSection";
import type { EditableYearSectionHandle } from "@/components/award/EditableYearSection";
import MovieCard from "@/components/award/MovieCard";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import type { UserAward } from "@/hooks/useUserAwards";

interface Props {
  year: number;
  allMovies: Movie[];
  currentUserId: string;
  existingAward: UserAward | null;
  onCreateAward: (movie: Movie) => void;
  onUpdateMovieRanking: (
    movieId: string,
    updates: { seen_it?: boolean; ranking?: number | null }
  ) => void;
  onClose: () => void;
  /** Suppress the internal "Back to Home" button — for when a caller (like
      BallotEditorOverlay) already renders its own close affordance around
      this component, so there aren't two redundant close controls stacked
      in the same corner. The standalone /year/[year] route has no such
      wrapper, so it omits this and keeps the button. */
  hideBackButton?: boolean;
  isGuest?: boolean;
  onEditingChange?: (editing: boolean) => void;
  /** True when YearExplorer was opened as a result of the new-user onboarding pick. */
  isOnboardingPick?: boolean;
  /** ID of the movie just picked during onboarding — used for highlight + rating tour. */
  pickedMovieId?: string | number | null;
  /** Full movie payload from hero select as fallback before year data hydrates. */
  pickedMovie?: Movie | null;
  /** Initial onboarding rating tour step restored from session state. */
  initialRatingTourStep?: 0 | 1 | 2 | 3;
  /** Emits onboarding tour step changes for session persistence. */
  onRatingTourStepChange?: (step: 0 | 1 | 2 | 3) => void;
}

export default function YearExplorer({
  year,
  allMovies,
  currentUserId,
  existingAward,
  onCreateAward,
  onUpdateMovieRanking,
  onClose,
  hideBackButton = false,
  isGuest,
  onEditingChange,
  isOnboardingPick = false,
  pickedMovieId = null,
  pickedMovie: onboardingPickedMovie = null,
  initialRatingTourStep = 0,
  onRatingTourStepChange,
}: Props) {
  const { showToast } = useGlobalToast();
  const [isEditing, setIsEditing] = useState(false);
  const [yearMovies, setYearMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showYearHelp, setShowYearHelp] = useState(false);
  const [recentlyNominated, setRecentlyNominated] = useState<Set<string | number>>(new Set());
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  // 3-step rating tour shown to new users after their first pick.
  // Step 1: explains the auto-seeded rating=7 (the nomination threshold).
  // Step 2: explains filling the ballot.
  // Step 3: auto-scrolls to acclaimed section (no callout, just scroll + tip).
  const [ratingTourStep, setRatingTourStep] = useState<0 | 1 | 2 | 3>(
    isOnboardingPick
      ? (initialRatingTourStep > 0 ? initialRatingTourStep : 1)
      : 0
  );
  const INITIAL_FILM_LIMIT = 12;
  const [showAllOther, setShowAllOther] = useState(false);
  // "Movies you've ranked" and "Top nominees" used to render every match
  // uncapped — the single biggest source of an overwhelming, scroll-forever
  // list. Same cap + "Show more" pattern "Other notable films" already used.
  const [showAllContenders, setShowAllContenders] = useState(false);
  const [showAllTopContenders, setShowAllTopContenders] = useState(false);
  const rankingSectionRef = useRef<HTMLDivElement | null>(null);
  const contendersSectionRef = useRef<HTMLDivElement | null>(null);
  const candidatesSectionRef = useRef<HTMLDivElement | null>(null);
  const autoPromotedRef = useRef<Set<string | number>>(new Set());
  const workshopRef = useRef<EditableYearSectionHandle>(null);
  const editableSectionEndRef = useRef<HTMLDivElement | null>(null);
  const [showStickyNominees, setShowStickyNominees] = useState(false);
  const seededOnboardingRef = useRef(false);
  // Tour overlay: ref on the ballot section — used to read left/width for tooltip container
  const ballotRef = useRef<HTMLDivElement | null>(null);
  // Rect of the active tour target (step 2 uses the first empty slot).
  const [tourAnchorRect, setTourAnchorRect] = useState<DOMRect | null>(null);
  // Real-time workshop nominee IDs — kept in sync via onWorkshopNomineesChange callback
  const [workshopNomineeIds, setWorkshopNomineeIds] = useState<string[]>([]);
  const [workshopWinnerId, setWorkshopWinnerId] = useState<string | null>(null);
  // Ballot completion milestone tracking (overlay/confetti disabled until UX finalized)
  const prevNomineeCountRef = useRef<number>(0);
  const milestoneStateInitializedRef = useRef(false);

  const { winners: officialWinners } = useOfficialAwardWinners();
  const actualWinner = officialWinners.get(year) ?? null;

  // ─── Compute fallback data for EditableYearSection ─────────────
  // These are only used when no saved award exists in the DB.
  const moviesWithRankings = allMovies.filter(
    (m) =>
      m.release_year === year &&
      m.rankings?.length > 0 &&
      m.rankings[0].ranking !== null
  );
  const rankedSorted = [...moviesWithRankings].sort(
    (a, b) => (b.rankings?.[0]?.ranking ?? 0) - (a.rankings?.[0]?.ranking ?? 0)
  );
  // Winner is always the highest-rated film — decoupled from however
  // defaultNominees below ends up sorted for display.
  const defaultWinner = rankedSorted[0] ?? null;
  // Display order defaults to alphabetical; rating only determines who
  // qualifies (7+) and the top-10 cutoff.
  const defaultNominees = rankedSorted
    .filter((m) => (m.rankings?.[0]?.ranking ?? 0) >= 7)
    .slice(0, 10)
    .sort((a, b) => a.title.localeCompare(b.title));

  // Full movie pool for the year (for edit sidebar — all movies, not just ranked)
  const allMoviesForYear = allMovies.filter((m) => m.release_year === year);

  // ─── Genre-aware sorting — derive picked movie's genre set ──────
  const pickedMovieFromYear = useMemo(
    () =>
      pickedMovieId != null
        ? allMoviesForYear.find((m) => String(m.id) === String(pickedMovieId)) ?? null
        : null,
    [pickedMovieId, allMoviesForYear]
  );
  const pickedMovie = useMemo(() => {
    if (pickedMovieFromYear) return pickedMovieFromYear;
    if (!onboardingPickedMovie) return null;
    return onboardingPickedMovie.release_year === year ? onboardingPickedMovie : null;
  }, [pickedMovieFromYear, onboardingPickedMovie, year]);

  const pickedGenreSet = useMemo(
    () => new Set((pickedMovie?.genres ?? []).map((g) => g.toLowerCase())),
    [pickedMovie]
  );

  const genreMatchLabel = useMemo(() => {
    if (pickedGenreSet.size === 0) return null;
    const genres = [...pickedGenreSet];
    return genres.length === 1
      ? genres[0]
      : `${genres[0]} / ${genres[1]}`;
  }, [pickedGenreSet]);

  const existingNomineeMovies = useMemo(() => {
    if (!existingAward?.nomineeIds?.length) return [];
    return existingAward.nomineeIds
      .map((id) => allMoviesForYear.find((m) => String(m.id) === String(id)))
      .filter((m): m is Movie => Boolean(m));
  }, [existingAward?.nomineeIds, allMoviesForYear]);
  const hasCanonicalBestPictureAward = existingNomineeMovies.length > 0;
  const displayNominees = hasCanonicalBestPictureAward
    ? existingNomineeMovies
    : defaultNominees;
  const displayNomineeCount = displayNominees.length;
  const nomineesNeededForValidBallot = Math.max(0, 5 - (workshopNomineeIds.length > 0 ? workshopNomineeIds.length : displayNomineeCount));
  const canonicalWinnerMovie = hasCanonicalBestPictureAward
    ? (existingNomineeMovies.find((m) => String(m.id) === String(existingAward?.winnerId))
       // Fall back to highest-rated nominee, not arbitrary insertion order
       ?? [...existingNomineeMovies].sort((a, b) => (b.rankings?.[0]?.ranking ?? 0) - (a.rankings?.[0]?.ranking ?? 0))[0]
       ?? null)
    : null;
  // workshopWinnerId is the real-time value from onWorkshopNomineesChange;
  // it must lead the chain so live selections update the sticky-bar crown
  // immediately, before existingAward re-fetches from the API.
  // Only use existingAward.winnerId if that movie is actually present in the
  // current display nominees — stale winner IDs that no longer match should
  // fall through to defaultWinner so the highest-rated film shows correctly.
  const validatedAwardWinnerId = useMemo(() => {
    if (!existingAward?.winnerId) return null;
    const inNominees = displayNominees.some((m) => String(m.id) === String(existingAward.winnerId));
    return inNominees ? existingAward.winnerId : null;
  }, [existingAward?.winnerId, displayNominees]);

  const activeWinnerId =
    workshopWinnerId
    ?? canonicalWinnerMovie?.id
    ?? validatedAwardWinnerId
    ?? defaultWinner?.id
    ?? null;
  const activeNomineeIdSet = useMemo(
    () => {
      // Prefer real-time workshop nominee IDs (from onWorkshopNomineesChange callback)
      // over the lagging existingAward prop which only updates after API refetch.
      if (workshopNomineeIds.length > 0) {
        return new Set(workshopNomineeIds.map(String));
      }
      return new Set(displayNominees.map((m) => String(m.id)));
    },
    [displayNominees, workshopNomineeIds]
  );

  // Seed tour step once per onboarding session. After that, local state is the
  // source of truth — re-syncing from the parent's prop would resurrect the tour
  // after the user dismisses it (X → 0 → propagate up → prop returns as 0 →
  // default branch resets to 1).
  const tourSeededRef = useRef(false);
  useEffect(() => {
    if (!isOnboardingPick) {
      setRatingTourStep(0);
      tourSeededRef.current = false;
      return;
    }
    if (tourSeededRef.current) return;
    tourSeededRef.current = true;
    setRatingTourStep(initialRatingTourStep > 0 ? initialRatingTourStep : 1);
  }, [isOnboardingPick, initialRatingTourStep]);

  useEffect(() => {
    onRatingTourStepChange?.(ratingTourStep);
  }, [ratingTourStep, onRatingTourStepChange]);

  useEffect(() => {
    if (!isOnboardingPick) return;
    if (!pickedMovie) return;
    if (seededOnboardingRef.current) return;

    seededOnboardingRef.current = true;

    // Seed at 7 — the auto-nominate threshold, not a maximal score. This makes the
    // first action a calibration ("dial in how I actually felt") rather than an
    // undoing of an unjustified 10. See PRODUCT_GUARDRAILS — onboarding seeding rule.
    void onUpdateMovieRanking(pickedMovie.id, {
      seen_it: true,
      ranking: 7,
    });

    if (!activeNomineeIdSet.has(String(pickedMovie.id))) {
      onCreateAward(pickedMovie);
    }
  }, [
    isOnboardingPick,
    pickedMovie,
    onUpdateMovieRanking,
    onCreateAward,
    activeNomineeIdSet,
  ]);

  // ─── Fetch movies for ranking grid ─────────────────────────────
  useEffect(() => {
    async function fetchYearMovies() {
      setLoading(true);

      const fromMemory = allMovies.filter(
        (m) => m.release_year === year && isCanonicalCandidate(m)
      );

      if (fromMemory.length > 0) {
        const sorted = [...fromMemory].sort((a, b) => {
          const aVotes = (a as any).vote_count ?? 0;
          const bVotes = (b as any).vote_count ?? 0;
          if (bVotes !== aVotes) return bVotes - aVotes;
          const aRating = a.tmdb_rating ?? 0;
          const bRating = b.tmdb_rating ?? 0;
          if (bRating !== aRating) return bRating - aRating;
          return a.title.localeCompare(b.title);
        });
        setYearMovies(sorted);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("movies")
        .select(
          "id, title, release_year, poster_url, thumb_url, vote_count, tmdb_rating, genres"
        )
        .eq("release_year", year)
        .order("vote_count", { ascending: false, nullsFirst: false })
        .limit(200);

      if (!error && data) {
        setYearMovies((data as Movie[]).filter(isCanonicalCandidate));
      }
      setLoading(false);
    }

    fetchYearMovies();
    setSearchQuery("");
  }, [year, allMovies]);

  const filteredYearMovies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return yearMovies;
    return yearMovies.filter((movie) => movie.title.toLowerCase().includes(query));
  }, [yearMovies, searchQuery]);

  // All movies the user has ranked that aren't current nominees — any rating value.
  // "Rated low" section is folded in here; auto-promotion still only fires for 7+.
  const contenderMovies = useMemo(
    () =>
      filteredYearMovies.filter((movie) => {
        const seenIt = movie.rankings?.[0]?.seen_it === true;
        const ranking = movie.rankings?.[0]?.ranking;
        return (
          seenIt &&
          typeof ranking === "number" &&
          ranking >= 1 &&
          !activeNomineeIdSet.has(String(movie.id))
        );
      }).sort((a, b) => {
        // Highest-rated first within user's ranked films
        const aR = a.rankings?.[0]?.ranking ?? 0;
        const bR = b.rankings?.[0]?.ranking ?? 0;
        return bR - aR;
      }),
    [filteredYearMovies, activeNomineeIdSet]
  );

  // ─── Helper: best available rating for a movie ──────────────────────────
  const bestRating = useCallback((m: Movie) => {
    const tmdb = typeof m.tmdb_rating === "string" ? parseFloat(m.tmdb_rating) : (m.tmdb_rating ?? 0);
    const imdb = typeof m.imdb_rating === "string" ? parseFloat(m.imdb_rating) : (m.imdb_rating ?? 0);
    const meta = (typeof m.metacritic_score === "string" ? parseFloat(m.metacritic_score) : (m.metacritic_score ?? 0)) / 10;
    return Math.max(tmdb, imdb, meta);
  }, []);

  // ─── Rating-based sort (descending) with genre-match bonus ─────────────
  const familiaritySort = useCallback(
    (a: Movie, b: Movie) => {
      // Genre match bonus during onboarding
      if (pickedGenreSet.size > 0) {
        const aMatch = (a.genres ?? []).some((g) => pickedGenreSet.has(g.toLowerCase()));
        const bMatch = (b.genres ?? []).some((g) => pickedGenreSet.has(g.toLowerCase()));
        if (aMatch !== bMatch) return aMatch ? -1 : 1;
      }
      return bestRating(b) - bestRating(a);
    },
    [pickedGenreSet, bestRating]
  );

  // ─── 3-tier candidate pool: Top contenders / Other / Deep cuts ─────────
  // Films exit the pool once they become a current nominee, or once they've
  // already been ranked (and thus already appear in the "Movies you've ranked"
  // section above) — otherwise a ranked 7+ film shows up twice on the page.
  const contenderMovieIdSet = useMemo(
    () => new Set(contenderMovies.map((m) => String(m.id))),
    [contenderMovies]
  );

  const candidateFilms = useMemo(
    () =>
      filteredYearMovies.filter(
        (movie) =>
          !activeNomineeIdSet.has(String(movie.id)) &&
          !contenderMovieIdSet.has(String(movie.id))
      ),
    [filteredYearMovies, activeNomineeIdSet, contenderMovieIdSet]
  );

  const topContenders = useMemo(
    () =>
      candidateFilms
        .filter((m) => bestRating(m) >= 7)
        .sort(familiaritySort),
    [candidateFilms, bestRating, familiaritySort]
  );

  const topContenderIdSet = useMemo(
    () => new Set(topContenders.map((m) => m.id)),
    [topContenders]
  );

  const otherFilms = useMemo(
    () =>
      candidateFilms
        .filter((m) => bestRating(m) >= 5 && !topContenderIdSet.has(m.id))
        .sort(familiaritySort),
    [candidateFilms, bestRating, topContenderIdSet, familiaritySort]
  );

  const otherFilmsIdSet = useMemo(
    () => new Set(otherFilms.map((m) => m.id)),
    [otherFilms]
  );

  const deepCuts = useMemo(
    () =>
      candidateFilms
        .filter((m) => !topContenderIdSet.has(m.id) && !otherFilmsIdSet.has(m.id))
        .sort(familiaritySort),
    [candidateFilms, topContenderIdSet, otherFilmsIdSet, familiaritySort]
  );

  // lowRatedMovies removed — folded into contenderMovies (all user-ranked films).

  const focusContenders = useCallback(() => {
    // "nearest" — on the lg two-column layout this section is already
    // onscreen beside the ballot, so "start" would force-scroll past it,
    // cutting off the ballot above. On mobile's stacked layout it still
    // brings the (offscreen) grid into view.
    contendersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const scrollToCandidates = useCallback(() => {
    const target = candidatesSectionRef.current ?? contendersSectionRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const promoteToNominee = useCallback(
    (movie: Movie) => {
      onUpdateMovieRanking(movie.id, { ranking: 7, seen_it: true });
      if (!activeNomineeIdSet.has(String(movie.id)) && (!hasCanonicalBestPictureAward || displayNomineeCount < 10)) {
        // Flash confirmation before the card disappears from contenders
        setRecentlyNominated((prev) => new Set(prev).add(movie.id));
        setTimeout(() => {
          setRecentlyNominated((prev) => {
            const next = new Set(prev);
            next.delete(movie.id);
            return next;
          });
        }, 1200);

        // Use workshop ref to add nominee directly through EditableYearSection's
        // internal state, avoiding dual-write conflicts with page.tsx's handleMovieSelected.
        if (workshopRef.current) {
          workshopRef.current.addNominee(movie);
        } else {
          onCreateAward(movie);
        }
      }
    },
    [onUpdateMovieRanking, onCreateAward, activeNomineeIdSet, displayNomineeCount]
  );

  // Stable identity matters: EditableYearSection's workshop sync effect lists
  // onEditingChange in its deps, so an inline arrow here re-fires that effect
  // (and its setStates) on every YearExplorer render.
  const handleEditingChange = useCallback(
    (editing: boolean) => {
      setIsEditing(editing);
      onEditingChange?.(editing);
    },
    [onEditingChange]
  );

  // Workshop nominees change handler — keeps YearExplorer's nominee tracking in sync
  const handleWorkshopNomineesChange = useCallback(
    (nomineeIds: string[], winnerId: string | null) => {
      setWorkshopNomineeIds(nomineeIds);
      setWorkshopWinnerId(winnerId);
    },
    []
  );

  // Live nominee count — prefers real-time workshop data over lagging existingAward prop
  const liveNomineeCount = workshopNomineeIds.length > 0
    ? workshopNomineeIds.length
    : displayNomineeCount;

  // Resolve the current winner for milestone UI and summaries
  const liveWinnerMovie = useMemo(() => {
    const wId = workshopWinnerId ?? existingAward?.winnerId;
    if (!wId) return null;
    return allMoviesForYear.find((m) => String(m.id) === String(wId)) ?? null;
  }, [workshopWinnerId, existingAward?.winnerId, allMoviesForYear]);

  useEffect(() => {
    milestoneStateInitializedRef.current = false;
  }, [year]);

  useEffect(() => {
    if (liveNomineeCount >= 10) return;
    for (const movie of contenderMovies) {
      const ranking = movie.rankings?.[0]?.ranking;
      if (typeof ranking !== "number" || ranking < 7) continue;
      if (activeNomineeIdSet.has(String(movie.id))) continue;
      if (autoPromotedRef.current.has(movie.id)) continue;
      autoPromotedRef.current.add(movie.id);

      // Flash "Nominated" confirmation on the card
      setRecentlyNominated((prev) => new Set(prev).add(movie.id));
      setTimeout(() => {
        setRecentlyNominated((prev) => {
          const next = new Set(prev);
          next.delete(movie.id);
          return next;
        });
      }, 1500);

      if (workshopRef.current) {
        workshopRef.current.addNominee(movie);
      } else {
        onCreateAward(movie);
      }
    }
  }, [contenderMovies, activeNomineeIdSet, liveNomineeCount, onCreateAward]);

  useEffect(() => {
    if (!milestoneStateInitializedRef.current) {
      prevNomineeCountRef.current = liveNomineeCount;
      milestoneStateInitializedRef.current = true;
      return;
    }

    const prev = prevNomineeCountRef.current;
    prevNomineeCountRef.current = liveNomineeCount;
    const crossedMilestone = [5, 10].find(
      (milestone) =>
        prev < milestone && liveNomineeCount >= milestone
    );
    // Milestone overlay/confetti disabled for now — re-enable when celebration UX is finalized.
    // if (crossedMilestone) { ... setMilestoneOverlay(...) ... }
    void crossedMilestone;
  }, [
    activeNomineeIdSet,
    allMoviesForYear,
    defaultWinner?.id,
    defaultWinner?.title,
    existingAward?.winnerId,
    liveNomineeCount,
    liveWinnerMovie?.title,
    workshopWinnerId,
    year,
  ]);

  // Rating-first handler: rating a movie auto-marks as seen + triggers auto-promote
  const handleRatingFirst = useCallback(
    (movieId: string, updates: { seen_it?: boolean; ranking?: number | null }) => {
      // If a ranking is being set, auto-mark as seen
      if (updates.ranking != null && updates.ranking > 0) {
        onUpdateMovieRanking(movieId, { ...updates, seen_it: true });
      } else {
        onUpdateMovieRanking(movieId, updates);
      }
    },
    [onUpdateMovieRanking]
  );

  const flashRecentlyNominated = useCallback((movieId: string | string) => {
    setRecentlyNominated((prev) => new Set(prev).add(movieId));
    window.setTimeout(() => {
      setRecentlyNominated((prev) => {
        const next = new Set(prev);
        next.delete(movieId);
        return next;
      });
    }, 1800);
  }, []);

  const handlePromoteContender = useCallback(
    (movie: Movie) => {
      if (activeNomineeIdSet.has(String(movie.id))) return;

      if (liveNomineeCount >= 10) {
        showToast("Your ballot already has 10 nominees. Remove one first.", "info");
        return;
      }

      flashRecentlyNominated(movie.id);
      if (workshopRef.current) {
        workshopRef.current.addNominee(movie);
      } else {
        onCreateAward(movie);
      }
    },
    [activeNomineeIdSet, flashRecentlyNominated, liveNomineeCount, onCreateAward, showToast]
  );

  const renderMovieGrid = useCallback(
    (rowTitle: string, movies: Movie[], rowKey: string, refTarget?: React.RefObject<HTMLDivElement | null>) => {
      if (movies.length === 0) return null;

      return (
        <div className="mb-6" ref={refTarget ?? undefined}>
          <p className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-3">
            {rowTitle}
          </p>
          {/* Same card (variant="large") and grid rhythm Films/Rankings use for
              their own grids, rather than the denser, one-off "grid" variant
              this used to render — that variant's cramped bottom overlay is
              exactly why the old Nominate button needed the z-index/hit-area
              workarounds below; large's footerAction slot sits below the
              poster instead, so none of that's needed anymore, and every row
              can share one column scheme regardless of whether Nominate can
              appear. */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {movies.map((movie) => {
              const justNominated = recentlyNominated.has(movie.id);
              const ranking = movie.rankings?.[0]?.ranking ?? null;
              const canPromote =
                rowKey === "contenders" &&
                typeof ranking === "number" &&
                ranking >= 7 &&
                !activeNomineeIdSet.has(String(movie.id));

              return (
                <div key={`${rowKey}-${movie.id}`} className={`group relative rounded-xl${justNominated ? " nominee-glow" : ""}`}>
                  {justNominated && (
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center z-10 pointer-events-none animate-in fade-in duration-200">
                      <span className="px-2.5 py-1 rounded-full bg-gold-400 text-gold-900 text-[10px] font-bold uppercase tracking-wide shadow-lg">
                        New nominee
                      </span>
                    </div>
                  )}
                  <MovieCard
                    variant="large"
                    movie={movie}
                    ranking={ranking}
                    seenIt={movie.rankings?.[0]?.seen_it ?? false}
                    onUpdate={handleRatingFirst}
                    onClick={() => setSelectedMovie(movie)}
                    footerAction={
                      canPromote ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handlePromoteContender(movie);
                          }}
                          className="flex items-center justify-center w-9 h-9 rounded-full border border-gold-500/30 bg-gold-500/10 text-gold-300 transition-colors hover:border-gold-400/50 hover:bg-gold-500/20 hover:text-gold-200 active:scale-[0.98]"
                          aria-label={`Nominate ${movie.title}`}
                          title="Nominate"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      ) : null
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      );
    },
    [
      currentUserId,
      activeNomineeIdSet,
      handleRatingFirst,
      handlePromoteContender,
      recentlyNominated,
    ]
  );

  // ─── Sticky nominee strip visibility ───────────────────────────
  useEffect(() => {
    const target = editableSectionEndRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyNominees(!entry.isIntersecting),
      { threshold: 0, rootMargin: "0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // ─── Tour overlay: measure the active anchor target ──────────────
  // Step 1 + 3 anchor to the first nominee card. Step 2 anchors to the
  // first empty nominee slot (the open space next to the newly added pick).
  useEffect(() => {
    if (ratingTourStep < 1 || ratingTourStep > 3) {
      setTourAnchorRect(null);
      return;
    }

    const findAnchor = (): HTMLElement | null => {
      // Step 1 → the rating badge on the picked-movie row (the "default, editable" target)
      // Step 2 → the Add Nominee button (the "fill more slots" target)
      // Step 3 → the contenders section below the ballot (the "rate more films" target)
      if (ratingTourStep === 1) {
        return ballotRef.current?.querySelector(
          '[data-tour-grid="nominees"] [data-tour-target="rating-badge"]'
        ) as HTMLElement | null;
      }
      if (ratingTourStep === 2) {
        return ballotRef.current?.querySelector(
          '[data-tour-grid="nominees"] [data-tour-empty-slot="true"]'
        ) as HTMLElement | null;
      }
      if (ratingTourStep === 3) {
        return document.querySelector(
          '[data-tour-target="contenders"]'
        ) as HTMLElement | null;
      }
      return null;
    };

    const measure = () => {
      const anchor = findAnchor();
      if (anchor) {
        setTourAnchorRect(anchor.getBoundingClientRect());
        return;
      }
      setTourAnchorRect(null);
    };

    // Bring the anchor into view if it isn't already — step 3 in particular sits
    // below the fold. For step 3 we use block:"start" so the section's
    // scroll-margin-top (40vh) leaves room above for an upward-floating tooltip.
    const anchorForScroll = findAnchor();
    if (ratingTourStep === 3) {
      anchorForScroll?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      anchorForScroll?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    // Slight delay for step 1 only — card may not have rendered yet
    // (onboarding seeding effect fires asynchronously)
    const t = setTimeout(measure, ratingTourStep === 1 ? 120 : 0);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [ratingTourStep]);

  // ─── RENDER ────────────────────────────────────────────────────
  // Earned framing: ballot title only appears once the user has rated 3+ films
  // for this year. Until then, the page is neutrally "Your {year}" — the formal
  // award language is held back until there's enough signal to justify it.
  const ratedFilmsForYearCount = moviesWithRankings.length;
  const showBallotFraming = ratedFilmsForYearCount >= 3;
  return (
    // Horizontal padding is AppShell's job (main has px-4 sm:px-6) — adding
    // our own here double-padded phones, shrinking every ballot row ~32px
    // for no visual reason (see the .award-editable-section full-bleed
    // fix in globals.css, which fixed the same problem one layer down).
    <div className="py-4 md:p-6 min-h-[70vh] animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-lg font-bold text-white font-unbounded">
            {showBallotFraming ? `Your ${year} Best Picture Ballot` : `Your ${year}`}
          </h3>
          <div className="relative mt-1 inline-flex items-center gap-1 text-xs text-gray-400">
            <button
              type="button"
              onClick={() => setShowYearHelp((v) => !v)}
              className="inline-flex items-center gap-1 hover:text-gray-200 transition-colors"
              title="For simplicity, award year = film release year."
              aria-label="Year definition help"
            >
              <Info className="w-3.5 h-3.5" />
              Year help
            </button>
            {showYearHelp && (
              <div className="absolute top-6 left-0 z-20 whitespace-nowrap rounded-md border border-gray-700 bg-charcoal-900/95 px-2 py-1 text-[11px] text-gray-200 shadow-lg">
                For simplicity, award year = film release year.
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setRatingTourStep(1)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors active:scale-[0.98]"
            aria-label={ratingTourStep > 0 ? "Restart walkthrough" : "Show walkthrough"}
            title="Show walkthrough"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          {!hideBackButton && (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 min-h-[44px] px-2.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors active:scale-[0.98]"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline text-sm">Back to Home</span>
          </button>
          )}
        </div>
      </div>

      {/* Instructional sub-header — same earned-framing gate as the title
          above and the "Will your ballot agree?" line below: once there's
          enough signal that this user already knows the mechanic, stop
          repeating it. This one had been left unconditional by oversight,
          so it kept showing even on a fully-built 10/10 ballot. */}
      {!showBallotFraming && (
        <p className="text-xs text-gray-500 mb-1">
          Rate films to build your ballot. Rate 7+ to auto-nominate. Your highest-ranked film becomes Best Picture.
        </p>
      )}
      {actualWinner && (
        <p className="text-xs text-gray-400 mb-4">
          The Academy chose{" "}
          <span className="font-medium text-gold-400">{actualWinner.filmTitle}</span>.
          {showBallotFraming && (
            <> <span className="text-gray-500">Will your ballot agree?</span></>
          )}
        </p>
      )}

      {/* Guest mode messaging — present but lower-weight than the action buttons.
          A pill, not a banner. The auto-saved indicator inside EditableYearSection
          is hidden for guests so this is the canonical signal that data is at risk. */}
      {isGuest && (
        <div className="mb-4 flex items-center justify-end">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/[0.06] px-2.5 py-1 text-[11px] font-medium text-amber-300/90">
            <Lock className="w-3 h-3" />
            Sign up to save your ballot
          </span>
        </div>
      )}

      {/* ─── Two-column workspace: Ballot | Candidates ─────────────── */}
      <div className="lg:grid lg:grid-cols-[minmax(340px,2fr)_3fr] lg:gap-6">

        {/* ──── LEFT COLUMN: The Ballot ──────────────────────────────── */}
        <div className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
          <div ref={ballotRef}>
            <EditableYearSection
              ref={workshopRef}
              year={String(year)}
              movies={hasCanonicalBestPictureAward ? existingNomineeMovies : defaultNominees}
              winner={canonicalWinnerMovie ?? defaultWinner}
              allMoviesForYear={allMoviesForYear}
              category="best-picture"
              mode="workshop"
              compact
              // The year workshop is only ever reached from Home/own-profile
              // navigation onto the signed-in user's own data (see
              // src/app/year/[year]/page.tsx — useUserAwards/useMovieDataWithGuest
              // have no username param, they're always "me").
              viewerOwnsBallot
              onRequestScrollToContenders={focusContenders}
              onWorkshopRankUpdate={onUpdateMovieRanking}
              onWorkshopNomineesChange={handleWorkshopNomineesChange}
              onEditingChange={handleEditingChange}
            />
          </div>

          {/* Sentinel for sticky strip */}
          <div ref={editableSectionEndRef} className="h-0" />

          {/* Ballot progress — plain text, matching the "{count}/10" +
              "Full Ballot" language EditableYearSection already uses
              elsewhere, rather than the bespoke segmented bar this used to
              be (a UI pattern that didn't exist anywhere else in the app). */}
          <div className="mt-3 mb-4 lg:mb-0 flex items-center gap-2">
            <Trophy className={`w-3.5 h-3.5 ${liveNomineeCount >= 5 ? "text-gold-400" : "text-gold-400/70"}`} />
            {liveNomineeCount >= 10 ? (
              <span className="text-xs font-medium text-emerald-400">Full Ballot</span>
            ) : (
              <span className="text-xs font-medium text-gray-400">
                {liveNomineeCount}/10 nominees
              </span>
            )}
          </div>

          {/* Contextual tips */}
          <ContextualTip
            tipId="first-rating"
            show={moviesWithRankings.length >= 1 && moviesWithRankings.length <= 2}
            position="below"
            autoDismissMs={8000}
          />
          <ContextualTip
            tipId="incomplete-year"
            show={moviesWithRankings.length >= 3 && moviesWithRankings.length < 10 && displayNomineeCount < 5}
            position="below"
            autoDismissMs={10000}
          />
          <ContextualTip
            tipId="disagreement"
            show={
              !!actualWinner &&
              !!canonicalWinnerMovie &&
              (actualWinner.movieId != null
                ? String(actualWinner.movieId) !== String(canonicalWinnerMovie.id)
                : canonicalWinnerMovie.title.toLowerCase() !== actualWinner.filmTitle.toLowerCase()) &&
              moviesWithRankings.length >= 5
            }
            position="below"
            autoDismissMs={10000}
          />
        </div>

        {/* ──── RIGHT COLUMN: Movie Candidates ───────────────────────── */}
        {!isEditing && (
          <div className="mt-6 lg:mt-0 relative" ref={rankingSectionRef}>

            {/* ─── Sticky nominee strip (mobile/tablet — ballot visible on lg+) ─── */}
            {showStickyNominees && displayNominees.length > 0 && (
              <div className="sticky top-0 z-40 -mx-4 px-4 py-2.5 bg-charcoal-900/95 backdrop-blur-sm border-b border-gray-700/40 lg:hidden">
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500 shrink-0">
                    Nominees ({displayNomineeCount}/10)
                  </span>
                  {/* touch-pan-x + overscroll-x-contain: swiping over this strip
                      scrolls only the strip, not the page underneath it — this
                      row previously had no touch-action hint, so a horizontal
                      flick here was ambiguous with the page's own vertical
                      scroll and easily "lost" to it. */}
                  <div className="flex gap-2 overflow-x-auto touch-pan-x overscroll-x-contain">
                    {displayNominees.map((m) => {
                      const isWinner = activeWinnerId != null && String(activeWinnerId) === String(m.id);
                      const isPickedMovie = pickedMovieId !== null && String(m.id) === String(pickedMovieId);
                      const stickyPoster = normalizeImageUrl(m.poster_url);
                      const hasPoster = stickyPoster && stickyPoster.startsWith("http");
                      return (
                        <div key={`sticky-${m.id}`} className="relative shrink-0">
                          <div className={`w-10 h-[60px] rounded overflow-hidden border ${isWinner ? "border-gold-500" : isPickedMovie ? "border-gold-400/70 ring-1 ring-gold-400/50" : "border-gray-600/60"}`}>
                            {hasPoster ? (
                              <Image
                                src={stickyPoster}
                                alt={m.title}
                                width={40}
                                height={60}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                <Film className="w-3.5 h-3.5 text-gray-600" />
                              </div>
                            )}
                          </div>
                          {isWinner && (
                            <Trophy className="absolute -top-1 -right-1 w-3 h-3 text-gold-400" />
                          )}
                        </div>
                      );
                    })}
                    {Array.from({ length: Math.max(0, 5 - displayNomineeCount) }).map((_, i) => (
                      <div key={`empty-sticky-${i}`} className="w-10 h-[60px] rounded border border-dashed border-gray-700/40 bg-gray-800/30 shrink-0" />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── Title + search bar ───────────────────────────────── */}
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-medium text-gray-300">
                {isOnboardingPick ? `From ${year} — add more nominees` : `${year} Movies`}
              </h4>
              <div className="w-full max-w-sm">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={`Filter ${year} movies...`}
                  className="w-full rounded-lg border border-gray-700/50 bg-charcoal-900/60 px-3 py-2 text-base sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold-500/40"
                />
              </div>
            </div>

            {/* Tip: rate to nominate */}
            {candidateFilms.length > 0 && genreMatchLabel && (
              <div className="mb-3 px-2 py-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 flex items-center gap-2 text-xs text-blue-300 animate-in fade-in duration-300">
                <Star className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>
                  {genreMatchLabel.charAt(0).toUpperCase() + genreMatchLabel.slice(1)} films listed first. Rate 7+ to nominate.
                </span>
              </div>
            )}

            {/* ─── Movie sections: recognition first ─────────────── */}
            {renderMovieGrid(
              "Movies you've ranked",
              showAllContenders ? contenderMovies : contenderMovies.slice(0, INITIAL_FILM_LIMIT),
              "contenders",
              contendersSectionRef
            )}
            {contenderMovies.length > INITIAL_FILM_LIMIT && !showAllContenders && (
              <button
                type="button"
                onClick={() => setShowAllContenders(true)}
                className="mb-4 min-h-[44px] px-1 flex items-center text-xs font-medium text-gold-400 hover:text-gold-300 transition-colors"
              >
                Show {contenderMovies.length - INITIAL_FILM_LIMIT} more ranked films
              </button>
            )}
            {/* scroll-mt leaves space above for the step-3 tooltip when this
                section is scrolled into view. Without it, scrollIntoView snaps
                the section to the very top, pushing the tooltip off-screen. */}
            <div ref={candidatesSectionRef} data-tour-target="contenders" className="scroll-mt-[40vh]">
              {renderMovieGrid(
                `Top nominees from ${year}`,
                showAllTopContenders ? topContenders : topContenders.slice(0, INITIAL_FILM_LIMIT),
                "top-contenders"
              )}
              {topContenders.length > INITIAL_FILM_LIMIT && !showAllTopContenders && (
                <button
                  type="button"
                  onClick={() => setShowAllTopContenders(true)}
                  className="mb-4 min-h-[44px] px-1 flex items-center text-xs font-medium text-gold-400 hover:text-gold-300 transition-colors"
                >
                  Show {topContenders.length - INITIAL_FILM_LIMIT} more top nominees
                </button>
              )}
            </div>
            {renderMovieGrid(
              `Other notable films from ${year}`,
              showAllOther ? otherFilms : otherFilms.slice(0, INITIAL_FILM_LIMIT),
              "other-films"
            )}
            {otherFilms.length > INITIAL_FILM_LIMIT && !showAllOther && (
              <button
                type="button"
                onClick={() => setShowAllOther(true)}
                className="mb-4 min-h-[44px] px-1 flex items-center text-xs font-medium text-gold-400 hover:text-gold-300 transition-colors"
              >
                Show {otherFilms.length - INITIAL_FILM_LIMIT} more notable films
              </button>
            )}
            {renderMovieGrid(`Deep cuts from ${year}`, deepCuts.slice(0, 8), "deep-cuts")}

            {/* Loading skeleton */}
            {loading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[2/3] rounded-lg bg-gray-800 animate-pulse"
                  />
                ))}
              </div>
            )}

            {/* Empty year */}
            {!loading && yearMovies.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400 mb-2">
                  We don&apos;t have many films indexed for {year} yet.
                </p>
                <p className="text-xs text-gray-500">
                  Search by name above to find one.
                </p>
              </div>
            )}

            {!loading && filteredYearMovies.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">Movie not found.</p>
                <p className="text-xs text-gray-500 mt-1">You can add it to the database.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Onboarding tour overlay (portal, fixed to viewport) ───────────────
          Steps 1/3 anchor to the first nominee card. Step 2 anchors to the
          first empty nominee slot next to the new pick.
      ─────────────────────────────────────────────────────────────────────────── */}
      {ratingTourStep >= 1 && ratingTourStep <= 3 &&
        tourAnchorRect !== null &&
        (ratingTourStep !== 1 || pickedMovieId == null || activeNomineeIdSet.has(String(pickedMovieId))) &&
        (() => {
          // Center the caret on the anchor — anchors are now precise (rating badge,
          // Add Nominee button, contenders section header) so left-offset is wrong.
          const caretAbsX = tourAnchorRect.left + (tourAnchorRect.width / 2);
          const viewportWidth = window.innerWidth;
          const tooltipWidth = Math.min(338, viewportWidth - 24);
          const tooltipLeft = Math.min(
            Math.max(caretAbsX - tooltipWidth / 2, 12),
            viewportWidth - tooltipWidth - 12
          );
          const caretOffsetInTooltip = Math.min(
            Math.max(caretAbsX - tooltipLeft, 14),
            tooltipWidth - 14
          );
          // Step 3 places the tooltip ABOVE the contenders section (caret pointing
          // down at it), so the user sees the explainer in the space they just
          // scrolled from. Steps 1 and 2 anchor below their target as usual.
          const placeAbove = ratingTourStep === 3;
          const tooltipStyle = placeAbove
            ? {
                top: tourAnchorRect.top - 10,
                left: tooltipLeft,
                width: tooltipWidth,
                transform: "translateY(-100%)",
              }
            : {
                top: tourAnchorRect.bottom + 10,
                left: tooltipLeft,
                width: tooltipWidth,
              };
          return (
            <div
              className="fixed z-[200] pointer-events-none animate-in fade-in duration-300"
              style={tooltipStyle}
            >
              {placeAbove ? (
                /* Downward-pointing caret at bottom of tooltip */
                <svg
                  className="absolute -bottom-[10px]"
                  style={{ left: caretOffsetInTooltip - 10 }}
                  width="20"
                  height="10"
                  viewBox="0 0 20 10"
                  aria-hidden="true"
                >
                  <path d="M0 0 L10 10 L20 0Z" fill="#14161b" stroke="#3f4654" strokeWidth="1.25" strokeLinejoin="round" />
                </svg>
              ) : (
                /* Upward-pointing caret at top of tooltip */
                <svg
                  className="absolute -top-[10px]"
                  style={{ left: caretOffsetInTooltip - 10 }}
                  width="20"
                  height="10"
                  viewBox="0 0 20 10"
                  aria-hidden="true"
                >
                  <path d="M0 10 L10 0 L20 10Z" fill="#14161b" stroke="#3f4654" strokeWidth="1.25" strokeLinejoin="round" />
                </svg>
              )}

              {/* Tour card */}
              <div className="pointer-events-auto rounded-xl border border-gray-600 bg-gray-900 shadow-2xl shadow-black/50 px-4 py-3.5">

                  {/* Header: step badge + dismiss */}
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="inline-flex items-center rounded-full bg-gray-800 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold-400">
                      Step {ratingTourStep} of 3
                    </span>
                    <button
                      onClick={() => setRatingTourStep(0)}
                      className="p-1 rounded text-gray-500 hover:text-gray-200 transition-colors"
                      aria-label="Dismiss tour"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Step content */}
                  {ratingTourStep === 1 && (
                    <>
                      <p className="text-[15px] font-semibold text-white mb-1.5">This score is a starting point</p>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        We seeded your pick at <span className="text-amber-300 font-medium">7</span> — the threshold where a film auto-nominates.
                        Tap the badge to change it (1–10).
                      </p>
                    </>
                  )}
                  {ratingTourStep === 2 && (
                    <>
                      <p className="text-[15px] font-semibold text-white mb-1.5">Add more nominees</p>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        A ballot needs at least <span className="text-amber-300 font-medium">5 nominees</span>, up to 10.
                        Tap here to find more films from this year.
                      </p>
                    </>
                  )}
                  {ratingTourStep === 3 && (
                    <>
                      <p className="text-[15px] font-semibold text-white mb-1.5">Rate films from this year</p>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {genreMatchLabel
                          ? `${genreMatchLabel.charAt(0).toUpperCase() + genreMatchLabel.slice(1)} films are listed first. `
                          : "The most recognized films appear first. "}
                        Anything you rate <span className="text-amber-300 font-medium">7 or higher</span> auto-nominates onto your ballot.
                      </p>
                    </>
                  )}

                  {/* Footer: progress dots + next/done */}
                  <div className="flex items-center justify-between mt-3.5 pt-2 border-t border-gray-700">
                    <div className="flex gap-2">
                      {[1, 2, 3].map((s) => (
                        <div
                          key={s}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            s === ratingTourStep
                              ? "w-6 bg-gold-400"
                              : s < ratingTourStep
                              ? "w-2 bg-gold-400/40"
                              : "w-2 bg-gray-600"
                          }`}
                        />
                      ))}
                    </div>
                    {ratingTourStep < 3 ? (
                      <button
                        onClick={() => setRatingTourStep((s) => (s + 1) as 0 | 1 | 2 | 3)}
                        className="text-sm font-semibold text-gold-400 hover:text-gold-300 transition-colors"
                      >
                        Next →
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setRatingTourStep(0);
                          scrollToCandidates();
                        }}
                        className="text-sm font-semibold text-gold-400 hover:text-gold-300 transition-colors"
                      >
                        Got it →
                      </button>
                    )}
                  </div>
              </div>
            </div>
          );
        })()}

      {/* Movie detail modal — opened by clicking the middle zone of grid cards */}
      {selectedMovie && (
        <MovieDetailModal
          movie={selectedMovie}
          isOpen={!!selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onUpdate={(movieId, newRanking, newSeenIt) => {
            onUpdateMovieRanking(movieId, { ranking: newRanking, seen_it: newSeenIt });
          }}
          initialRanking={selectedMovie.rankings?.[0]?.ranking ?? null}
          initialSeenIt={selectedMovie.rankings?.[0]?.seen_it ?? false}
        />
      )}
    </div>
  );
}

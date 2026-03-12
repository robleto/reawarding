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
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, Trophy, Info, Star, Check } from "lucide-react";
import { supabase } from "@/lib/supabaseBrowser";
import type { Movie } from "@/types/types";
import { getActualWinner } from "@/data/bestPictureWinners";
import { normalizeImageUrl } from "@/utils/imageUrl";
import EditableYearSection from "@/components/award/EditableYearSection";
import type { EditableYearSectionHandle } from "@/components/award/EditableYearSection";
import MoviePosterCard from "@/components/movie/MoviePosterCard";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import type { UserAward } from "@/hooks/useUserAwards";

interface Props {
  year: number;
  allMovies: Movie[];
  currentUserId: string;
  existingAward: UserAward | null;
  onCreateAward: (movie: Movie) => void;
  onUpdateMovieRanking: (
    movieId: number,
    updates: { seen_it?: boolean; ranking?: number | null }
  ) => void;
  onClose: () => void;
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
  isGuest,
  onEditingChange,
  isOnboardingPick = false,
  pickedMovieId = null,
  pickedMovie: onboardingPickedMovie = null,
  initialRatingTourStep = 0,
  onRatingTourStepChange,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [yearMovies, setYearMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showYearHelp, setShowYearHelp] = useState(false);
  const [recentlyNominated, setRecentlyNominated] = useState<Set<string | number>>(new Set());
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  // 3-step rating tour shown to new users after their first pick.
  // Step 1: explains the auto-seeded rating=10. Step 2: explains filling the ballot.
  // Step 3: auto-scrolls to acclaimed section (no callout, just scroll + tip).
  const [ratingTourStep, setRatingTourStep] = useState<0 | 1 | 2 | 3>(
    isOnboardingPick
      ? (initialRatingTourStep > 0 ? initialRatingTourStep : 1)
      : 0
  );
  const [showAcclaimedTip, setShowAcclaimedTip] = useState(false);
  const INITIAL_FILM_LIMIT = 12;
  const [showAllAcclaimed, setShowAllAcclaimed] = useState(false);
  const [showAllUnseen, setShowAllUnseen] = useState(false);
  const rankingSectionRef = useRef<HTMLDivElement | null>(null);
  const contendersSectionRef = useRef<HTMLDivElement | null>(null);
  const acclaimedSectionRef = useRef<HTMLDivElement | null>(null);
  const autoPromotedRef = useRef<Set<string | number>>(new Set());
  const workshopRef = useRef<EditableYearSectionHandle>(null);
  const editableSectionEndRef = useRef<HTMLDivElement | null>(null);
  const [showStickyNominees, setShowStickyNominees] = useState(false);
  const seededOnboardingRef = useRef(false);
  // Tour overlay: ref on the ballot section — used to read left/width for tooltip container
  const ballotRef = useRef<HTMLDivElement | null>(null);
  // Rect of the active tour target (step 2 uses the first empty slot).
  const [tourAnchorRect, setTourAnchorRect] = useState<DOMRect | null>(null);

  const actualWinner = getActualWinner(year);

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
  const defaultNominees = rankedSorted
    .filter((m) => (m.rankings?.[0]?.ranking ?? 0) >= 7)
    .slice(0, 10);
  const defaultWinner =
    defaultNominees.length > 0 ? defaultNominees[0] : rankedSorted[0] ?? null;

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
  const nomineesNeededForValidBallot = Math.max(0, 5 - displayNomineeCount);
  const canonicalWinnerMovie = hasCanonicalBestPictureAward
    ? (existingNomineeMovies.find((m) => String(m.id) === String(existingAward?.winnerId)) ?? existingNomineeMovies[0] ?? null)
    : null;
  const activeWinnerId = canonicalWinnerMovie?.id
    ?? existingAward?.winnerId
    ?? defaultWinner?.id
    ?? null;
  const activeNomineeIdSet = useMemo(
    () => new Set(displayNominees.map((m) => String(m.id))),
    [displayNominees]
  );

  // Sync tour step from parent when isOnboardingPick or initialRatingTourStep changes.
  // IMPORTANT: ratingTourStep intentionally excluded from deps — including it creates
  // a feedback loop via onRatingTourStepChange → page.tsx state → prop back here.
  // React bails on setRatingTourStep when the value matches existing state.
  useEffect(() => {
    if (!isOnboardingPick) {
      setRatingTourStep(0);
      return;
    }
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

    void onUpdateMovieRanking(pickedMovie.id as unknown as number, {
      seen_it: true,
      ranking: 10,
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

      const fromMemory = allMovies.filter((m) => m.release_year === year);

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
          "id, title, release_year, poster_url, thumb_url, vote_count, tmdb_rating"
        )
        .eq("release_year", year)
        .order("vote_count", { ascending: false, nullsFirst: false })
        .limit(200);

      if (!error && data) {
        setYearMovies(data as Movie[]);
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

  const contenderMovies = useMemo(
    () =>
      filteredYearMovies.filter((movie) => {
        const seenIt = movie.rankings?.[0]?.seen_it === true;
        const ranking = movie.rankings?.[0]?.ranking;
        return (
          seenIt &&
          typeof ranking === "number" &&
          ranking >= 5 &&
          !activeNomineeIdSet.has(String(movie.id))
        );
      }),
    [filteredYearMovies, activeNomineeIdSet]
  );

  const isAcclaimedMovie = useCallback((movie: Movie) => {
    return (
      (movie.tmdb_rating != null && movie.tmdb_rating >= 7) ||
      (movie.imdb_rating != null && movie.imdb_rating >= 7) ||
      (movie.metacritic_score != null && movie.metacritic_score >= 65)
    );
  }, []);

  const acclaimedMovies = useMemo(
    () =>
      filteredYearMovies
        .filter((movie) => {
          const seenIt = movie.rankings?.[0]?.seen_it === true;
          return !seenIt && !activeNomineeIdSet.has(String(movie.id)) && isAcclaimedMovie(movie);
        })
        .sort((a, b) => {
          // Genre match bonus: films sharing ≥1 genre with the picked movie rank first
          if (pickedGenreSet.size > 0) {
            const aMatch = (a.genres ?? []).some((g) => pickedGenreSet.has(g.toLowerCase()));
            const bMatch = (b.genres ?? []).some((g) => pickedGenreSet.has(g.toLowerCase()));
            if (aMatch !== bMatch) return aMatch ? -1 : 1;
          }
          // Secondary: external critical score
          const aScore = Math.max(a.tmdb_rating ?? 0, a.imdb_rating ?? 0, (a.metacritic_score ?? 0) / 10);
          const bScore = Math.max(b.tmdb_rating ?? 0, b.imdb_rating ?? 0, (b.metacritic_score ?? 0) / 10);
          if (bScore !== aScore) return bScore - aScore;
          return ((b as any).vote_count ?? 0) - ((a as any).vote_count ?? 0);
        }),
    [filteredYearMovies, activeNomineeIdSet, isAcclaimedMovie, pickedGenreSet]
  );

  const acclaimedIdSet = useMemo(
    () => new Set(acclaimedMovies.map((m) => m.id)),
    [acclaimedMovies]
  );

  const unseenMovies = useMemo(
    () =>
      filteredYearMovies
        .filter((movie) => {
          const seenIt = movie.rankings?.[0]?.seen_it === true;
          return !seenIt && !activeNomineeIdSet.has(String(movie.id)) && !acclaimedIdSet.has(movie.id);
        })
        .sort((a, b) => {
          // Genre match bonus: films sharing ≥1 genre with the picked movie rank first
          if (pickedGenreSet.size > 0) {
            const aMatch = (a.genres ?? []).some((g) => pickedGenreSet.has(g.toLowerCase()));
            const bMatch = (b.genres ?? []).some((g) => pickedGenreSet.has(g.toLowerCase()));
            if (aMatch !== bMatch) return aMatch ? -1 : 1;
          }
          // Secondary: popularity
          return ((b as any).vote_count ?? 0) - ((a as any).vote_count ?? 0);
        }),
    [filteredYearMovies, activeNomineeIdSet, acclaimedIdSet, pickedGenreSet]
  );

  const lowRatedMovies = useMemo(
    () =>
      filteredYearMovies
        .filter((movie) => {
          const seenIt = movie.rankings?.[0]?.seen_it === true;
          const ranking = movie.rankings?.[0]?.ranking;
          return (
            seenIt &&
            typeof ranking === "number" &&
            ranking < 5 &&
            !activeNomineeIdSet.has(String(movie.id))
          );
        })
        .sort((a, b) => {
          const aRanking = a.rankings?.[0]?.ranking ?? 0;
          const bRanking = b.rankings?.[0]?.ranking ?? 0;
          if (aRanking !== bRanking) return aRanking - bRanking;
          return a.title.localeCompare(b.title);
        }),
    [filteredYearMovies, activeNomineeIdSet]
  );

  const focusContenders = useCallback(() => {
    contendersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const scrollToAcclaimed = useCallback(() => {
    // Prefer acclaimed section; fall back to contenders if acclaimed is empty
    const target = acclaimedSectionRef.current ?? contendersSectionRef.current;
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

  useEffect(() => {
    if (displayNomineeCount >= 10) return;
    for (const movie of contenderMovies) {
      const ranking = movie.rankings?.[0]?.ranking;
      if (typeof ranking !== "number" || ranking < 7) continue;
      if (activeNomineeIdSet.has(String(movie.id))) continue;
      if (autoPromotedRef.current.has(movie.id)) continue;
      autoPromotedRef.current.add(movie.id);
      if (workshopRef.current) {
        workshopRef.current.addNominee(movie);
      } else {
        onCreateAward(movie);
      }
    }
  }, [contenderMovies, activeNomineeIdSet, displayNomineeCount, onCreateAward]);

  const renderMovieRow = useCallback(
    (rowTitle: string, movies: Movie[], rowKey: string, attachRef = false) => {
      if (movies.length === 0) return null;

      return (
        <div className="mb-6" ref={attachRef ? contendersSectionRef : undefined}>
          <p className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-2">
            {rowTitle}
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 pr-1">
            {movies.map((movie) => {
              const justNominated = recentlyNominated.has(movie.id);
              const canNominate = !activeNomineeIdSet.has(String(movie.id)) && (!hasCanonicalBestPictureAward || displayNomineeCount < 10);

              return (
                <div key={`${rowKey}-${movie.id}`} className="group relative w-[120px] sm:w-[140px] md:w-[160px] shrink-0">
                  {justNominated ? (
                    <div className="absolute inset-0 z-30 rounded-lg bg-emerald-900/70 flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-200">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center mb-1.5">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-emerald-200">Nominated</span>
                    </div>
                  ) : canNominate ? (
                    <>
                      <div className="absolute inset-0 z-20 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          promoteToNominee(movie);
                        }}
                        className="absolute inset-x-0 top-0 z-30 h-8 flex items-center justify-center rounded-t-lg bg-black/70 text-amber-200 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        + Nominate
                      </button>
                    </>
                  ) : null}

                  <MoviePosterCard
                    movie={movie}
                    currentUserId={currentUserId}
                    ranking={movie.rankings?.[0]?.ranking ?? null}
                    seenIt={movie.rankings?.[0]?.seen_it ?? false}
                    onUpdate={onUpdateMovieRanking}
                    onClick={() => setSelectedMovie(movie)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      );
    },
    [
      activeNomineeIdSet,
      currentUserId,
      displayNomineeCount,
      hasCanonicalBestPictureAward,
      onUpdateMovieRanking,
      promoteToNominee,
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

    const measure = () => {
      const selector = ratingTourStep === 2
        ? '[data-tour-grid="nominees"] [data-tour-empty-slot="true"]'
        : '[data-tour-grid="nominees"] > div';
      const anchor = ballotRef.current?.querySelector(selector) as HTMLElement | null;
      if (anchor) {
        setTourAnchorRect(anchor.getBoundingClientRect());
        return;
      }
      setTourAnchorRect(null);
    };

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
  return (
    <div className="bg-gray-900/80 border border-gray-700/60 shadow-2xl rounded-2xl p-4 md:p-6 min-h-[70vh] animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-lg font-bold text-white font-unbounded">
            Your {year} Best Picture Ballot
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
              <div className="absolute top-6 left-0 z-20 whitespace-nowrap rounded-md border border-gray-700 bg-gray-900/95 px-2 py-1 text-[11px] text-gray-200 shadow-lg">
                For simplicity, award year = film release year.
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
          aria-label="Close year explorer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Instructional sub-header */}
      <p className="text-xs text-gray-500 mb-1">
        Nominate films you&apos;ve seen and rank them. Your highest-ranked film becomes your Best Picture winner.
      </p>
      {actualWinner && (
        <p className="text-xs text-gray-400 mb-4">
          The Academy chose{" "}
          <span className="font-medium text-yellow-400">{actualWinner.title}</span>.{" "}
          <span className="text-gray-500">Will your ballot agree?</span>
        </p>
      )}

      {/* Guest mode messaging */}
      {isGuest && (
        <div className="mb-4 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-300/80 text-xs text-center">
          Sign up to save and edit this ballot.
        </div>
      )}

      {/* Canonical award surface — EditableYearSection in compact mode */}
      {/* ballotRef wraps this so we can measure its position for the floating tour overlay */}
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
          onRequestScrollToContenders={focusContenders}
          onWorkshopRankUpdate={onUpdateMovieRanking}
          onEditingChange={(editing) => {
            setIsEditing(editing);
            onEditingChange?.(editing);
          }}
        />
      </div>

      {/* Sentinel: marks the bottom of EditableYearSection so we know when to show sticky strip */}
      <div ref={editableSectionEndRef} className="h-0" />

      {/* Ranking section — hidden during edit mode (LAW 2 mode isolation) */}
      {!isEditing && (
        <div className="mt-6 relative" ref={rankingSectionRef}>

          {/* ─── Sticky nominee strip ─────────────────────────────── */}
          {showStickyNominees && displayNominees.length > 0 && (
            <div className="sticky top-0 z-40 -mx-4 md:-mx-6 px-4 md:px-6 py-2 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/40">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium shrink-0">
                  Nominees ({displayNomineeCount}/10)
                </span>
                <div className="flex gap-1.5 overflow-x-auto">
                  {displayNominees.map((m) => {
                    const isWinner = activeWinnerId != null && String(activeWinnerId) === String(m.id);
                    const isPickedMovie = pickedMovieId !== null && String(m.id) === String(pickedMovieId);
                    const stickyPoster = normalizeImageUrl(m.poster_url);
                    const hasPoster = stickyPoster && stickyPoster.startsWith("http");
                    return (
                      <div key={`sticky-${m.id}`} className="relative shrink-0">
                        <div className={`w-8 h-12 rounded overflow-hidden border ${isWinner ? "border-yellow-500" : isPickedMovie ? "border-yellow-400/70 ring-1 ring-yellow-400/50" : "border-gray-600/60"}`}>
                          {hasPoster ? (
                            <Image
                              src={stickyPoster}
                              alt={m.title}
                              width={32}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                              <span className="text-[6px] text-gray-500 text-center leading-tight px-0.5">{m.title}</span>
                            </div>
                          )}
                        </div>
                        {isWinner && (
                          <Trophy className="absolute -top-1 -right-1 w-2.5 h-2.5 text-yellow-400" />
                        )}
                      </div>
                    );
                  })}
                  {/* Empty nominee slots */}
                  {Array.from({ length: Math.max(0, 5 - displayNomineeCount) }).map((_, i) => (
                    <div key={`empty-sticky-${i}`} className="w-8 h-12 rounded border border-dashed border-gray-700/40 bg-gray-800/30 shrink-0" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Onboarding tour overlay rendered via portal (fixed position) ─── */}
          {/* Intentionally empty here — the portal is rendered outside this scroll container below */}

          {ratingTourStep === 0 && displayNomineeCount < 5 ? (
            <div className="mb-4 px-3 py-2.5 rounded-lg border border-amber-500/25 bg-amber-500/8 flex items-start gap-2.5">
              <Star className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-200">
                  {displayNomineeCount} nominee{displayNomineeCount !== 1 ? "s" : ""} so far
                </p>
                <p className="text-xs text-amber-300/70 mt-0.5">
                  Add {nomineesNeededForValidBallot} more to create a Standard Ballot (5 nominees). Rate a film 7+ to nominate it.
                </p>
              </div>
            </div>
          ) : ratingTourStep === 0 && displayNomineeCount >= 5 && displayNomineeCount < 10 ? (
            <div className="mb-4 px-3 py-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/8 flex items-start gap-2.5">
              <Trophy className="w-4 h-4 text-emerald-300 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-200">
                  Standard Ballot complete ({displayNomineeCount} nominees)
                </p>
                <p className="text-xs text-emerald-300/70 mt-0.5">
                  Add up to {10 - displayNomineeCount} more to expand to a Full Ballot (10 nominees).
                </p>
              </div>
            </div>
          ) : null}

          {/* ─── Title + search bar ───────────────────────────────── */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-sm font-medium text-gray-300">
              {isOnboardingPick ? `From ${year} — add more nominees` : `${year} Movies`}
            </h4>
            <div className="w-full max-w-sm">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                }}
                placeholder={`Filter ${year} movies...`}
                className="w-full rounded-lg border border-gray-700/50 bg-gray-900/60 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/40"
              />
            </div>
          </div>

          {renderMovieRow("Your contenders (rated 5+)", contenderMovies, "contenders", true)}
          <div ref={acclaimedSectionRef}>
            {showAcclaimedTip && acclaimedMovies.length > 0 && (
              <div className="mb-2 px-2 py-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 flex items-center gap-2 text-xs text-blue-300 animate-in fade-in duration-300">
                <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>
                  {genreMatchLabel
                    ? `${genreMatchLabel.charAt(0).toUpperCase() + genreMatchLabel.slice(1)} films listed first.`
                    : "Highly regarded but unrated."}{" "}
                  Rate 7+ to nominate.
                </span>
              </div>
            )}
            {renderMovieRow(
              `Acclaimed films from ${year}`,
              showAllAcclaimed ? acclaimedMovies : acclaimedMovies.slice(0, INITIAL_FILM_LIMIT),
              "acclaimed"
            )}
            {acclaimedMovies.length > INITIAL_FILM_LIMIT && !showAllAcclaimed && (
              <button
                type="button"
                onClick={() => setShowAllAcclaimed(true)}
                className="mb-4 text-xs font-medium text-yellow-400 hover:text-yellow-300 transition-colors"
              >
                Show {acclaimedMovies.length - INITIAL_FILM_LIMIT} more acclaimed films
              </button>
            )}
          </div>
          {renderMovieRow(
            "Unseen — worth considering",
            showAllUnseen ? unseenMovies : unseenMovies.slice(0, INITIAL_FILM_LIMIT),
            "unseen"
          )}
          {unseenMovies.length > INITIAL_FILM_LIMIT && !showAllUnseen && (
            <button
              type="button"
              onClick={() => setShowAllUnseen(true)}
              className="mb-4 text-xs font-medium text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              Show {unseenMovies.length - INITIAL_FILM_LIMIT} more films
            </button>
          )}
          {renderMovieRow("Low-rated (seen, rated below 5)", lowRatedMovies, "low-rated")}

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
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

      {/* ─── Onboarding tour overlay (portal, fixed to viewport) ───────────────
          Steps 1/3 anchor to the first nominee card. Step 2 anchors to the
          first empty nominee slot next to the new pick.
      ─────────────────────────────────────────────────────────────────────────── */}
      {ratingTourStep >= 1 && ratingTourStep <= 3 &&
        tourAnchorRect !== null &&
        (ratingTourStep !== 1 || pickedMovieId == null || activeNomineeIdSet.has(String(pickedMovieId))) &&
        createPortal(
          (() => {
            const caretAbsX = ratingTourStep === 2
              ? tourAnchorRect.left + (tourAnchorRect.width / 2)
              : tourAnchorRect.left + 22;
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
            return (
              <div
                className="fixed z-[200] pointer-events-none animate-in fade-in duration-300"
                style={{
                  top: tourAnchorRect.bottom + 10,
                  left: tooltipLeft,
                  width: tooltipWidth,
                }}
              >
                {/* Upward-pointing caret */}
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

                {/* Tour card */}
                <div className="pointer-events-auto rounded-xl border border-[#3f4654] bg-[#14161b] shadow-2xl shadow-black/50 px-4 py-3.5">

                  {/* Header: step badge + dismiss */}
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="inline-flex items-center rounded-full bg-[#263142] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#e6b94d]">
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
                      <p className="text-[15px] font-semibold text-white mb-1.5">Your pick is rated 10</p>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        Tap the rating badge on the card to adjust it (1–10).
                      </p>
                    </>
                  )}
                  {ratingTourStep === 2 && (
                    <>
                      <p className="text-[15px] font-semibold text-white mb-1.5">
                        {nomineesNeededForValidBallot > 0
                          ? `Add ${nomineesNeededForValidBallot} more nominee${nomineesNeededForValidBallot !== 1 ? "s" : ""} to complete your ballot`
                          : "Your ballot is taking shape"}
                      </p>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        The empty slots below are waiting. Scroll down, rate a film ≥ 7, then tap{" "}
                        <span className="text-amber-300 font-medium">+ Nominate</span> on its card.
                      </p>
                    </>
                  )}
                  {ratingTourStep === 3 && (
                    <>
                      <p className="text-[15px] font-semibold text-white mb-1.5">Acclaimed films are waiting below</p>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {genreMatchLabel
                          ? `${genreMatchLabel.charAt(0).toUpperCase() + genreMatchLabel.slice(1)} films are listed first.`
                          : "Highly regarded films are listed below the ballot."}{" "}
                        Tap <span className="text-amber-300 font-medium">Got it</span> then scroll down to find them.
                      </p>
                    </>
                  )}

                  {/* Footer: progress dots + next/done */}
                  <div className="flex items-center justify-between mt-3.5 pt-2 border-t border-[#2c3340]">
                    <div className="flex gap-2">
                      {[1, 2, 3].map((s) => (
                        <div
                          key={s}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            s === ratingTourStep
                              ? "w-6 bg-[#e6b94d]"
                              : s < ratingTourStep
                              ? "w-2 bg-[#e6b94d]/40"
                              : "w-2 bg-[#4a5160]"
                          }`}
                        />
                      ))}
                    </div>
                    {ratingTourStep < 3 ? (
                      <button
                        onClick={() => setRatingTourStep((s) => (s + 1) as 0 | 1 | 2 | 3)}
                        className="text-sm font-semibold text-[#e6b94d] hover:text-[#f1cf7a] transition-colors"
                      >
                        Next →
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setRatingTourStep(0);
                          scrollToAcclaimed();
                        }}
                        className="text-sm font-semibold text-[#e6b94d] hover:text-[#f1cf7a] transition-colors"
                      >
                        Got it →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })(),
          document.body
        )}

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

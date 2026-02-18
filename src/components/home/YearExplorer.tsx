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
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [yearMovies, setYearMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showYearHelp, setShowYearHelp] = useState(false);
  const [recentlyNominated, setRecentlyNominated] = useState<Set<number>>(new Set());
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const rankingSectionRef = useRef<HTMLDivElement | null>(null);
  const contendersSectionRef = useRef<HTMLDivElement | null>(null);
  const autoPromotedRef = useRef<Set<number>>(new Set());
  const workshopRef = useRef<EditableYearSectionHandle>(null);
  const editableSectionEndRef = useRef<HTMLDivElement | null>(null);
  const [showStickyNominees, setShowStickyNominees] = useState(false);

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
  const existingNomineeMovies = useMemo(() => {
    if (!existingAward?.nomineeIds?.length) return [];
    return existingAward.nomineeIds
      .map((id) => allMoviesForYear.find((m) => m.id === Number(id)))
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
  const activeNomineeIdSet = new Set(displayNominees.map((m) => m.id));

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
          !activeNomineeIdSet.has(movie.id)
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
          return !seenIt && !activeNomineeIdSet.has(movie.id) && isAcclaimedMovie(movie);
        })
        .sort((a, b) => {
          const aScore = Math.max(a.tmdb_rating ?? 0, a.imdb_rating ?? 0, (a.metacritic_score ?? 0) / 10);
          const bScore = Math.max(b.tmdb_rating ?? 0, b.imdb_rating ?? 0, (b.metacritic_score ?? 0) / 10);
          if (bScore !== aScore) return bScore - aScore;
          return ((b as any).vote_count ?? 0) - ((a as any).vote_count ?? 0);
        }),
    [filteredYearMovies, activeNomineeIdSet, isAcclaimedMovie]
  );

  const acclaimedIdSet = useMemo(
    () => new Set(acclaimedMovies.map((m) => m.id)),
    [acclaimedMovies]
  );

  const unseenMovies = useMemo(
    () =>
      filteredYearMovies.filter((movie) => {
        const seenIt = movie.rankings?.[0]?.seen_it === true;
        return !seenIt && !activeNomineeIdSet.has(movie.id) && !acclaimedIdSet.has(movie.id);
      }),
    [filteredYearMovies, activeNomineeIdSet, acclaimedIdSet]
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
            !activeNomineeIdSet.has(movie.id)
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

  const promoteToNominee = useCallback(
    (movie: Movie) => {
      onUpdateMovieRanking(movie.id, { ranking: 7, seen_it: true });
      if (!activeNomineeIdSet.has(movie.id) && (!hasCanonicalBestPictureAward || displayNomineeCount < 10)) {
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
      if (activeNomineeIdSet.has(movie.id)) continue;
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
              const canNominate = !activeNomineeIdSet.has(movie.id) && (!hasCanonicalBestPictureAward || displayNomineeCount < 10);

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

  // ─── RENDER ────────────────────────────────────────────────────
  return (
    <div className="bg-gray-900/80 border border-gray-700/60 shadow-2xl rounded-2xl p-4 md:p-6 min-h-[70vh] animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white font-unbounded">
            {year}
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
          {actualWinner && (
            <p className="text-xs text-gray-400">
              The Academy chose{" "}
              <span className="text-yellow-400">{actualWinner.title}</span>
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
          aria-label="Close year explorer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Guest mode messaging */}
      {isGuest && (
        <div className="mb-4 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-300/80 text-xs text-center">
          Sign up to save and edit this ballot.
        </div>
      )}

      {/* Canonical award surface — EditableYearSection in compact mode */}
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
        onEditingChange={(editing) => {
          setIsEditing(editing);
          onEditingChange?.(editing);
        }}
      />

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
                    const isWinner = activeWinnerId === m.id;
                    const stickyPoster = normalizeImageUrl(m.poster_url);
                    const hasPoster = stickyPoster && stickyPoster.startsWith("http");
                    return (
                      <div key={`sticky-${m.id}`} className="relative shrink-0">
                        <div className={`w-8 h-12 rounded overflow-hidden border ${isWinner ? "border-yellow-500" : "border-gray-600/60"}`}>
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

          {displayNomineeCount < 5 && (
            <div className="mb-3 inline-flex items-center gap-2 text-sm text-amber-200">
              <Star className="w-4 h-4 text-amber-300" />
              <span>
                Almost there — add {nomineesNeededForValidBallot} more nominees to complete this ballot.
              </span>
            </div>
          )}

          {/* ─── Title + search bar ───────────────────────────────── */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-sm font-medium text-gray-300">{year} Movies</h4>
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

          {renderMovieRow("Contenders (movies seen rated 5+)", contenderMovies, "contenders", true)}
          {renderMovieRow("Acclaimed (unseen movies of high esteem)", acclaimedMovies, "acclaimed")}
          {renderMovieRow("Unseen (unseen movies from this year)", unseenMovies, "unseen")}
          {renderMovieRow("Low-Rated (movies seen rated below 5)", lowRatedMovies, "low-rated")}

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

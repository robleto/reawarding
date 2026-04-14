"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Film, Trophy, Star } from "lucide-react";
import { getActualWinner } from "@/data/bestPictureWinners";
import { normalizeImageUrl } from "@/utils/imageUrl";
import MovieCard from "@/components/award/MovieCard";
import type { Movie } from "@/types/types";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import type { UserAward } from "@/hooks/useUserAwards";

interface Props {
  year: number;
  leader: Movie;
  nomineeCount: number;
  neededForBallot: number;
  allMovies: Movie[];
  awards: UserAward[];
  currentUserId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateMovieRanking: (
    movieId: number,
    updates: { seen_it?: boolean; ranking?: number | null }
  ) => void;
  onCreateAward: (movie: Movie) => void;
  onOpenFullExplorer: (year: number) => void;
  onMilestoneReached?: (payload: { year: number; milestone: 5 | 10; winnerTitle: string }) => void;
}

const RAIL_LIMIT = 15;

export default function ExpandableYearCard({
  year,
  leader,
  nomineeCount,
  neededForBallot,
  allMovies,
  awards,
  currentUserId,
  isExpanded,
  onToggle,
  onUpdateMovieRanking,
  onCreateAward,
  onOpenFullExplorer,
  onMilestoneReached,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [recentlyNominated, setRecentlyNominated] = useState<Set<string | number>>(new Set());
  const [newNomineeTitle, setNewNomineeTitle] = useState<string | null>(null);
  const [cardPulsing, setCardPulsing] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const autoPromotedRef = useRef<Set<string | number>>(new Set());
  const nomineeConfirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [posterError, setPosterError] = useState(false);
  const prevNomineeCountRef = useRef(0);
  const milestoneStateInitializedRef = useRef(false);

  // ── Stable rail snapshot ────────────────────────────────────────────────
  // Rail IDs are frozen when the clamshell opens so that marking a film
  // seen / unseen / rated doesn't eject it from the list mid-session.
  // Each film is still resolved against live allMovies data so the
  // SeenIt / Rate buttons always reflect current state.
  // Nominations DO remove films — that transition is intentional.
  // Snapshot is cleared on close so the next open starts fresh.
  const frozenRailIdsRef = useRef<number[] | null>(null);
  const [frozenRailIds, setFrozenRailIds] = useState<number[] | null>(null);

  // Reset poster error when leader changes
  useEffect(() => {
    setPosterError(false);
  }, [leader.id]);

  const academy = getActualWinner(year);
  const agreedWithAcademy =
    academy && academy.title.toLowerCase() === leader.title.toLowerCase();

  const rawPoster =
    leader.poster_url ||
    leader.thumb_url ||
    "";
  const normalizedPoster = normalizeImageUrl(rawPoster);
  const hasPoster =
    !posterError &&
    normalizedPoster &&
    (normalizedPoster.startsWith("http://") ||
      normalizedPoster.startsWith("https://") ||
      (normalizedPoster.startsWith("/") && normalizedPoster.length > 1));

  // Existing award for this year
  const existingAward = useMemo(
    () => awards.find((a) => a.year === year) ?? null,
    [awards, year]
  );

  const activeNomineeIdSet = useMemo(() => {
    if (!existingAward?.nomineeIds?.length) return new Set<string>();
    return new Set(existingAward.nomineeIds.map(String));
  }, [existingAward]);

  // Live nominee count from award data
  const liveNomineeCount = useMemo(() => {
    if (existingAward?.nomineeIds?.length) return existingAward.nomineeIds.length;
    return nomineeCount;
  }, [existingAward, nomineeCount]);

  const winnerTitle = useMemo(() => {
    const winnerId = existingAward?.winnerId;
    if (winnerId != null) {
      const winnerMovie = allMovies.find((movie) => String(movie.id) === String(winnerId));
      if (winnerMovie?.title) return winnerMovie.title;
    }
    return leader.title;
  }, [allMovies, existingAward?.winnerId, leader.title]);

  // Best available rating helper
  const bestRating = useCallback((m: Movie) => {
    const tmdb =
      typeof m.tmdb_rating === "string"
        ? parseFloat(m.tmdb_rating)
        : (m.tmdb_rating ?? 0);
    const imdb =
      typeof m.imdb_rating === "string"
        ? parseFloat(m.imdb_rating)
        : (m.imdb_rating ?? 0);
    const meta =
      (typeof m.metacritic_score === "string"
        ? parseFloat(m.metacritic_score)
        : (m.metacritic_score ?? 0)) / 10;
    return Math.max(tmdb, imdb, meta);
  }, []);

  // Snapshot rail IDs on open; clear on close so next open starts fresh.
  // Intentionally omits allMovies/year/etc. from deps — we want a one-time
  // capture of the state at the moment the clamshell opens, not a live filter.
  useEffect(() => {
    if (!isExpanded) {
      frozenRailIdsRef.current = null;
      setFrozenRailIds(null);
      return;
    }
    if (frozenRailIdsRef.current !== null) return; // already snapshotted
    const yearMovies = allMovies.filter((m) => m.release_year === year);
    const unseen = yearMovies.filter((m) => {
      const seenIt = m.rankings?.[0]?.seen_it === true;
      return !seenIt && !activeNomineeIdSet.has(String(m.id));
    });
    const ids = [...unseen]
      .sort((a, b) => bestRating(b) - bestRating(a))
      .slice(0, RAIL_LIMIT)
      .map((m) => m.id);
    frozenRailIdsRef.current = ids;
    setFrozenRailIds(ids);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  // Movies for the rail: stable snapshot while open, live fallback when closed.
  // Nominations still remove films; seen/rating changes only update button state.
  const railMovies = useMemo(() => {
    if (frozenRailIds !== null) {
      return frozenRailIds
        .map((id) => allMovies.find((m) => m.id === id))
        .filter((m): m is Movie => m !== undefined)
        // Keep recently-nominated films visible briefly so the chip renders
        .filter((m) => !activeNomineeIdSet.has(String(m.id)) || recentlyNominated.has(m.id));
    }
    // Pre-open fallback (clamshell not yet expanded)
    const yearMovies = allMovies.filter((m) => m.release_year === year);
    const unseen = yearMovies.filter((m) => {
      const seenIt = m.rankings?.[0]?.seen_it === true;
      return !seenIt && !activeNomineeIdSet.has(String(m.id));
    });
    return [...unseen].sort((a, b) => bestRating(b) - bestRating(a)).slice(0, RAIL_LIMIT);
  }, [frozenRailIds, allMovies, year, activeNomineeIdSet, bestRating, recentlyNominated]);

  // Contender movies (rated 7+ but not yet nominated)
  const contenderMovies = useMemo(() => {
    const yearMovies = allMovies.filter((m) => m.release_year === year);
    return yearMovies.filter((m) => {
      const seenIt = m.rankings?.[0]?.seen_it === true;
      const ranking = m.rankings?.[0]?.ranking;
      return (
        seenIt &&
        typeof ranking === "number" &&
        ranking >= 7 &&
        !activeNomineeIdSet.has(String(m.id))
      );
    });
  }, [allMovies, year, activeNomineeIdSet]);

  // Auto-promote: when a movie is rated 7+, auto-nominate it
  useEffect(() => {
    if (liveNomineeCount >= 10) return;
    for (const movie of contenderMovies) {
      const ranking = movie.rankings?.[0]?.ranking;
      if (typeof ranking !== "number" || ranking < 7) continue;
      if (activeNomineeIdSet.has(String(movie.id))) continue;
      if (autoPromotedRef.current.has(movie.id)) continue;
      autoPromotedRef.current.add(movie.id);

      setRecentlyNominated((prev) => new Set(prev).add(movie.id));
      setTimeout(() => {
        setRecentlyNominated((prev) => {
          const next = new Set(prev);
          next.delete(movie.id);
          return next;
        });
      }, 2000);

      // Card-level + title confirmation — visible to new users
      setNewNomineeTitle(movie.title);
      setCardPulsing(true);
      if (nomineeConfirmTimerRef.current) clearTimeout(nomineeConfirmTimerRef.current);
      nomineeConfirmTimerRef.current = setTimeout(() => {
        setNewNomineeTitle(null);
        setCardPulsing(false);
      }, 2500);

      onCreateAward(movie);
    }
  }, [contenderMovies, activeNomineeIdSet, liveNomineeCount, onCreateAward]);

  // Rating-first handler: auto-mark as seen when rating
  const handleRatingFirst = useCallback(
    (movieId: number, updates: { seen_it?: boolean; ranking?: number | null }) => {
      if (updates.ranking != null && updates.ranking > 0) {
        onUpdateMovieRanking(movieId, { ...updates, seen_it: true });
      } else {
        onUpdateMovieRanking(movieId, updates);
      }
    },
    [onUpdateMovieRanking]
  );

  // Measure content height for smooth animation
  useEffect(() => {
    if (!contentRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContentHeight(entry.contentRect.height);
      }
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    milestoneStateInitializedRef.current = false;
  }, [year]);

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
    if (!crossedMilestone) return;

    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      onMilestoneReached?.({
        year,
        milestone: crossedMilestone as 5 | 10,
        winnerTitle,
      });
    }, 350);
  }, [liveNomineeCount, onMilestoneReached, winnerTitle, year]);

  // Cleanup nomination confirm timer on unmount
  useEffect(() => {
    return () => {
      if (nomineeConfirmTimerRef.current) clearTimeout(nomineeConfirmTimerRef.current);
    };
  }, []);

  const progressPct = Math.min(100, (liveNomineeCount / 10) * 100);

  return (
    <>
    <div
      ref={cardRef}
      className={`rounded-xl border transition-all duration-300 ${
        cardPulsing
          ? "border-yellow-400 bg-yellow-900/15 ring-2 ring-yellow-400/60 shadow-xl shadow-yellow-400/20"
          : isExpanded
          ? "border-yellow-500/40 bg-gray-800/60 shadow-lg shadow-yellow-500/5"
          : "border-gray-700/30 bg-gray-900/40 hover:border-yellow-500/30 hover:bg-gray-800/50"
      }`}
    >
      {/* ── Compact card header (always visible) ── */}
      <button
        type="button"
        onClick={onToggle}
        className="group flex w-full items-center gap-4 px-4 py-3 text-left transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-yellow-500/40"
      >
        {/* Poster */}
        <div className="relative h-[72px] w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-800 shadow-md">
          {hasPoster ? (
            <Image
              src={normalizedPoster}
              alt={leader.title}
              fill
              className="object-cover"
              sizes="48px"
              onError={() => setPosterError(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Film className="h-4 w-4 text-gray-600" />
            </div>
          )}
        </div>

        {/* Year + Your Winner */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-unbounded text-lg font-bold text-yellow-300">
              {year}
            </span>
            {/* Mini progress bar */}
            <div className="flex items-center gap-1.5 flex-1 max-w-[120px]">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-700/50">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    liveNomineeCount >= 10 ? "bg-emerald-400" : "bg-yellow-400"
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-gray-500">
                {liveNomineeCount}/10
              </span>
            </div>
            {/* "Rate 7+" hint shown in header when ballot incomplete and not expanded */}
            {!isExpanded && liveNomineeCount < 10 && (
              <span className="text-[10px] text-gray-600 whitespace-nowrap">
                Rate 7+ to nominate
              </span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
            <p className="truncate text-base font-semibold text-white group-hover:text-yellow-100">
              {leader.title}
            </p>
            {/* Status badge — click opens full YearExplorer for this year */}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onOpenFullExplorer(year); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onOpenFullExplorer(year); } }}
              className="text-xs tracking-wide text-yellow-400/60 flex-shrink-0 hover:text-yellow-300 transition-colors text-left cursor-pointer"
            >
              {existingAward?.winnerId
                ? "Winner (selected)"
                : liveNomineeCount >= 10
                ? "Winner (auto)"
                : liveNomineeCount > 0
                ? "Leading nominee"
                : "Start rating"}
            </span>
          </div>
        </div>

        {/* Academy contrast */}
        {academy && (
          <div className="flex flex-col items-end flex-shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-wider text-gray-600">
              Academy
            </p>
            <p
              className={`text-xs font-medium ${
                agreedWithAcademy ? "text-emerald-400" : "text-gray-400"
              }`}
            >
              {academy.title}
            </p>
            {agreedWithAcademy ? (
              <p className="text-[10px] text-emerald-500">Match</p>
            ) : (
              <p className="text-[10px] text-yellow-500/60">Different</p>
            )}
          </div>
        )}

      </button>

      {/* ── Expandable content ── */}
      <div
        className="overflow-hidden transition-[max-height,opacity] duration-400 ease-in-out"
        style={{
          maxHeight: isExpanded ? `${contentHeight + 32}px` : "0px",
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div ref={contentRef} className="px-4 pb-4">
          {/* Divider */}
          <div className="mb-3 border-t border-gray-700/40" />

          {/* ── Nominee confirmation banner ── */}
          {newNomineeTitle && (
            <div className="mb-3 flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-yellow-400/15 border border-yellow-400/40 animate-in fade-in slide-in-from-top-1 duration-200">
              <Trophy className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <p className="text-sm font-medium text-gray-200 leading-snug">
                <span className="font-bold text-yellow-300">{newNomineeTitle}</span>
                {" "}just entered your <span className="font-bold text-white">{year}</span> ballot
              </p>
            </div>
          )}

          {/* Instruction + progress */}
          <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-sm text-gray-300">
                Rate films from{" "}
                <span className="font-semibold text-white">{year}</span> —
                your awards take shape as you go.
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                <Star className="inline w-3 h-3 text-yellow-400/70 mr-0.5 -mt-0.5" />
                Scores 7+ automatically become nominees.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Trophy className="w-3.5 h-3.5 text-yellow-400/70" />
              <span className="text-xs font-medium text-gray-400">
                {liveNomineeCount} of 10 nominees
              </span>
              {liveNomineeCount >= 10 && (
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Complete
                </span>
              )}
            </div>
          </div>

          {/* Progress bar (mobile — replaces hidden inline bar) */}
          <div className="sm:hidden mb-3">
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                    i < liveNomineeCount
                      ? liveNomineeCount >= 10
                        ? "bg-emerald-400"
                        : "bg-yellow-400"
                      : "bg-gray-700/50"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* ── Horizontal film rail ── */}
          {railMovies.length > 0 ? (
            <div className="relative -mx-1">
              <div className="flex gap-2.5 overflow-x-auto pb-2 px-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {railMovies.map((movie) => {
                  const justNominated = recentlyNominated.has(movie.id);
                  return (
                    <div
                      key={movie.id}
                      className={`relative flex-shrink-0 w-[160px] sm:w-[180px] snap-start rounded-lg transition-all duration-300${justNominated ? " ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/30" : ""}`}
                    >
                      {justNominated && (
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center z-10 pointer-events-none animate-in fade-in duration-200">
                          <span className="px-2.5 py-1 rounded-full bg-yellow-400 text-yellow-900 text-[10px] font-bold uppercase tracking-wide shadow-lg">
                            New nominee
                          </span>
                        </div>
                      )}
                      <MovieCard
                        variant="large"
                        movie={movie}
                        ranking={movie.rankings?.[0]?.ranking ?? null}
                        seenIt={movie.rankings?.[0]?.seen_it ?? false}
                        onUpdate={handleRatingFirst}
                        onClick={() => setSelectedMovie(movie)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 py-3 text-center">
              All films from {year} have been rated or nominated.
            </p>
          )}

          {/* Open full explorer link */}
          <button
            type="button"
            onClick={() => onOpenFullExplorer(year)}
            className="mt-2 py-3 text-xs font-medium text-yellow-400/80 hover:text-yellow-300 transition-colors"
          >
            Open full {year} workspace →
          </button>
        </div>
      </div>
    </div>

    {/* Film detail modal — opened when a poster card is clicked */}
    {selectedMovie && (
      <MovieDetailModal
        movie={selectedMovie}
        isOpen={true}
        initialRanking={selectedMovie.rankings?.[0]?.ranking ?? null}
        initialSeenIt={selectedMovie.rankings?.[0]?.seen_it ?? false}
        onUpdate={(movieId, newRanking, newSeenIt) => {
          handleRatingFirst(movieId, { ranking: newRanking, seen_it: newSeenIt });
          setSelectedMovie((prev) =>
            prev
              ? { ...prev, rankings: [{ ...prev.rankings?.[0], ranking: newRanking, seen_it: newSeenIt }] }
              : null
          );
        }}
        onClose={() => setSelectedMovie(null)}
      />
    )}
    </>
  );
}

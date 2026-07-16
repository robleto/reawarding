"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import YearExplorer from "@/components/home/YearExplorer";
import ScreenState from "@/components/ui/ScreenState";
import { useMovieDataWithGuest } from "@/utils/sharedMovieUtils";
import { useCreateAward } from "@/hooks/useCreateAward";
import { useUserAwards } from "@/hooks/useUserAwards";
import type { Movie } from "@/types/types";

const MIN_YEAR = 1888;
const MAX_YEAR = 2100;

// A year's own page — the dedicated ballot workspace that used to be the
// YearExplorer overlay opened from Home. Converted to a route so editing a
// ballot doesn't stack a modal-within-a-modal on top of a film's own detail
// modal, and so a specific year's ballot has a real, shareable URL.
export default function YearPage() {
  const router = useRouter();
  const params = useParams<{ year: string }>();
  const year = parseInt(params?.year ?? "", 10);
  const yearIsValid = Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR;

  const { movies, userId, updateMovieRanking, isGuest, loading, error: moviesError } = useMovieDataWithGuest();
  const { createAward } = useCreateAward();
  const { awards, loading: awardsLoading, error: awardsError } = useUserAwards();

  useEffect(() => {
    if (!yearIsValid) {
      router.replace("/");
    }
  }, [yearIsValid, router]);

  const existingAward = useMemo(() => {
    if (!yearIsValid) return null;
    return awards.find((award) => award.year === year) ?? null;
  }, [awards, year, yearIsValid]);

  const handleCreateAward = useCallback(
    (movie: Movie) => {
      void createAward({
        id: movie.id,
        title: movie.title,
        release_year: movie.release_year,
      });
    },
    [createAward]
  );

  const handleUpdateMovieRanking = useCallback(
    (movieId: string, updates: { seen_it?: boolean; ranking?: number | null }) => {
      void updateMovieRanking(movieId, updates);
    },
    [updateMovieRanking]
  );

  const handleClose = useCallback(() => {
    router.push("/");
  }, [router]);

  if (!yearIsValid) return null;

  if (loading || awardsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-2 rounded-full border-gold-400/30 border-t-gold-400 animate-spin" />
          <p className="text-gray-300">Loading your {year} ballot…</p>
        </div>
      </div>
    );
  }

  if (moviesError || awardsError) {
    return (
      <ScreenState
        testId="screen-state-fetch-failure"
        tone="error"
        title="Couldn't load this ballot"
        message="We couldn't verify your ballot data, so this page is staying closed instead of falling back to defaults."
        primaryAction={{ label: "Back Home", href: "/" }}
      />
    );
  }

  return (
    <div className="w-full min-w-0 max-w-screen-xl mx-auto">
      <YearExplorer
        year={year}
        allMovies={movies}
        currentUserId={userId}
        existingAward={existingAward}
        onCreateAward={handleCreateAward}
        onUpdateMovieRanking={handleUpdateMovieRanking}
        onClose={handleClose}
        isGuest={isGuest}
      />
    </div>
  );
}

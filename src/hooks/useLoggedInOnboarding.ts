"use client";

import { useMemo } from "react";
import type { Movie } from "@/types/types";
import type { UserAward } from "@/hooks/useUserAwards";

export type LoggedInOnboardingStage =
  | "welcome"
  | "first-rating"
  | "year-taking-shape"
  | "winner-emerging"
  | "timeline-building"
  | "complete";

export interface LoggedInOnboardingMetrics {
  stage: LoggedInOnboardingStage;
  totalRated: number;
  yearsStarted: number;
  strongestYear: number | null;
  strongestYearCount: number;
  strongestYearNomineeCount: number;
  strongestYearWinnerTitle: string | null;
  strongestYearNeeded: number;
  shouldShow: boolean;
}

function getRatedMovies(movies: Movie[]) {
  return movies.filter((movie) => {
    const ranking = movie.rankings?.[0]?.ranking;
    return typeof ranking === "number" && ranking >= 1;
  });
}

export function useLoggedInOnboarding(
  movies: Movie[],
  awards: UserAward[],
  dismissed = false,
): LoggedInOnboardingMetrics {
  return useMemo(() => {
    const ratedMovies = getRatedMovies(movies);
    const totalRated = ratedMovies.length;

    const ratingsByYear = new Map<number, Movie[]>();
    ratedMovies.forEach((movie) => {
      if (!movie.release_year) return;
      const bucket = ratingsByYear.get(movie.release_year) ?? [];
      bucket.push(movie);
      ratingsByYear.set(movie.release_year, bucket);
    });

    const yearsStarted = ratingsByYear.size;

    let strongestYear: number | null = null;
    let strongestYearCount = 0;
    let strongestYearNomineeCount = 0;
    let strongestYearWinnerTitle: string | null = null;

    for (const [year, yearMovies] of ratingsByYear.entries()) {
      const isBetterYear =
        yearMovies.length > strongestYearCount ||
        (yearMovies.length === strongestYearCount && strongestYear !== null && year > strongestYear);

      if (!isBetterYear) continue;

      strongestYear = year;
      strongestYearCount = yearMovies.length;
      strongestYearNomineeCount = yearMovies.filter((movie) => {
        const ranking = movie.rankings?.[0]?.ranking;
        return typeof ranking === "number" && ranking >= 7;
      }).length;

      const sortedByRating = [...yearMovies].sort((a, b) => {
        const aRanking = a.rankings?.[0]?.ranking ?? 0;
        const bRanking = b.rankings?.[0]?.ranking ?? 0;
        if (bRanking !== aRanking) return bRanking - aRanking;
        return (b.release_year ?? 0) - (a.release_year ?? 0);
      });

      const savedAward = awards.find((award) => award.year === year);
      const savedWinner = savedAward?.winnerId
        ? yearMovies.find((movie) => String(movie.id) === String(savedAward.winnerId))
        : null;

      strongestYearWinnerTitle = savedWinner?.title ?? sortedByRating[0]?.title ?? null;
    }

    const strongestYearNeeded = strongestYear ? Math.max(0, 5 - strongestYearCount) : 5;

    let stage: LoggedInOnboardingStage = "complete";
    if (totalRated === 0) {
      stage = "welcome";
    } else if (totalRated < 3) {
      stage = "first-rating";
    } else if (strongestYearCount < 5) {
      stage = "year-taking-shape";
    } else if (yearsStarted < 2 && totalRated < 10) {
      stage = "winner-emerging";
    } else if (totalRated < 15 || yearsStarted < 2) {
      stage = "timeline-building";
    }

    return {
      stage,
      totalRated,
      yearsStarted,
      strongestYear,
      strongestYearCount,
      strongestYearNomineeCount,
      strongestYearWinnerTitle,
      strongestYearNeeded,
      shouldShow: !dismissed && stage !== "complete",
    };
  }, [awards, dismissed, movies]);
}


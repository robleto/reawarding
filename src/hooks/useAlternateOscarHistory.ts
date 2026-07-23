"use client";

import { useMemo } from "react";
import type { Movie } from "@/types/types";
import { useUserAwards } from "@/hooks/useUserAwards";
import { useOfficialAwardWinners, getAcademyStatus } from "@/data/officialAwardWinners";

export interface ControversialCall {
  year: number;
  yourWinner: Movie;
  officialTitle: string;
  yourRating: number;
  officialRating: number;
  ratingGap: number; // yourRating - officialRating (signed; sort by magnitude)
  intensity: "mild" | "loud";
}

export interface DecadeStat {
  decade: number; // e.g. 1990
  eligibleYears: number;
  upheld: number;
  reawarded: number;
  unscreened: number;
  upheldRate: number | null; // null when upheld + reawarded === 0 (decade is unscreened-only)
}

export interface AlternateOscarHistorySummary {
  loading: boolean;
  eligibleYears: number;
  upheld: number;
  reawardedMild: number;
  reawardedLoud: number;
  unscreened: number;
  upheldRate: number | null;
  byDecade: DecadeStat[];
  mostControversial: ControversialCall[];
}

/**
 * useAlternateOscarHistory — lifetime rollup of the existing per-year
 * getAcademyStatus() check (PRODUCT_DECISION_LOG.md "Your Alternate Oscar
 * History"). Reuses the same gating (set ballot + matched official winner)
 * that already drives the per-year AcademyStamp; this just aggregates it.
 *
 * "Most controversial call" ranks by the numeric gap between your rating for
 * your own winner and your rating for the Academy's winner — the mild/loud
 * badge language stays the visible label, this just breaks ties inside it.
 */
export function useAlternateOscarHistory(movies: Movie[]): AlternateOscarHistorySummary {
  const { awards, loading: awardsLoading } = useUserAwards();
  const { winners, loading: winnersLoading } = useOfficialAwardWinners();

  return useMemo(() => {
    const moviesByYear = new Map<number, Movie[]>();
    for (const m of movies) {
      const list = moviesByYear.get(m.release_year);
      if (list) list.push(m);
      else moviesByYear.set(m.release_year, [m]);
    }

    let upheld = 0;
    let reawardedMild = 0;
    let reawardedLoud = 0;
    let unscreened = 0;
    const controversial: ControversialCall[] = [];
    const decadeMap = new Map<number, DecadeStat>();

    for (const award of awards) {
      const yearMovies = moviesByYear.get(award.year) ?? [];
      const status = getAcademyStatus({
        year: award.year,
        existingAward: award,
        liveNomineeCount: award.nomineeIds.length,
        yearMovies,
        winners,
      });
      if (!status) continue; // thin/unset year, or no matched official winner

      const decade = Math.floor(award.year / 10) * 10;
      const decadeStat = decadeMap.get(decade) ?? {
        decade,
        eligibleYears: 0,
        upheld: 0,
        reawarded: 0,
        unscreened: 0,
        upheldRate: null,
      };
      decadeStat.eligibleYears += 1;

      if (status.status === "upheld") {
        upheld += 1;
        decadeStat.upheld += 1;
      } else if (status.status === "unscreened") {
        unscreened += 1;
        decadeStat.unscreened += 1;
      } else {
        // reawarded
        if (status.intensity === "mild") reawardedMild += 1;
        else reawardedLoud += 1;
        decadeStat.reawarded += 1;

        const official = winners.get(award.year);
        const officialMovie = official
          ? yearMovies.find((m) => String(m.id) === String(official.movieId))
          : undefined;
        const yourWinner = yearMovies.find((m) => String(m.id) === String(award.winnerId));
        const officialRating = officialMovie?.rankings?.[0]?.ranking;
        const yourRating = yourWinner?.rankings?.[0]?.ranking;
        if (yourWinner && official && typeof officialRating === "number" && typeof yourRating === "number") {
          controversial.push({
            year: award.year,
            yourWinner,
            officialTitle: official.filmTitle,
            yourRating,
            officialRating,
            ratingGap: yourRating - officialRating,
            intensity: status.intensity ?? "mild",
          });
        }
      }

      decadeMap.set(decade, decadeStat);
    }

    for (const stat of decadeMap.values()) {
      const denom = stat.upheld + stat.reawarded;
      stat.upheldRate = denom > 0 ? stat.upheld / denom : null;
    }

    const eligibleYears = upheld + reawardedMild + reawardedLoud + unscreened;
    const upheldRate =
      upheld + reawardedMild + reawardedLoud > 0 ? upheld / (upheld + reawardedMild + reawardedLoud) : null;

    controversial.sort((a, b) => Math.abs(b.ratingGap) - Math.abs(a.ratingGap));

    return {
      loading: awardsLoading || winnersLoading,
      eligibleYears,
      upheld,
      reawardedMild,
      reawardedLoud,
      unscreened,
      upheldRate,
      byDecade: Array.from(decadeMap.values()).sort((a, b) => a.decade - b.decade),
      mostControversial: controversial.slice(0, 5),
    };
  }, [movies, awards, winners, awardsLoading, winnersLoading]);
}

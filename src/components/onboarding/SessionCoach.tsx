"use client";

import { useMemo } from "react";
import { ArrowRight, Film, Star, X } from "lucide-react";
import useOnboardingState from "@/hooks/useOnboardingState";
import type { Movie } from "@/types/types";

interface SessionCoachProps {
  movies: Movie[];
  /** Year with the most progress */
  bestYear: number | null;
  /** Number of rated movies in best year */
  bestYearRatedCount: number;
  /** Name of the current leader for best year */
  leaderTitle: string | null;
  onOpenYear: (year: number) => void;
  onDismiss: () => void;
}

export default function SessionCoach({
  movies,
  bestYear,
  bestYearRatedCount,
  leaderTitle,
  onOpenYear,
  onDismiss,
}: SessionCoachProps) {
  const { sessionCount, stage, hasDismissedOnboarding } = useOnboardingState();

  const coaching = useMemo(() => {
    // Only show for sessions 2-3, or low-data users in early sessions
    if (hasDismissedOnboarding) return null;
    if (stage !== "complete") return null;
    if (sessionCount > 4) return null;

    const totalRated = movies.filter(
      (m) => typeof m.rankings?.[0]?.ranking === "number" && m.rankings[0].ranking >= 1
    ).length;

    if (totalRated === 0) return null;

    // Session 2: encourage adding more films
    if (sessionCount === 2) {
      if (bestYear && bestYearRatedCount < 10) {
        const needed = Math.min(3, 10 - bestYearRatedCount);
        return {
          message: `Welcome back \u2014 your ${bestYear} race has started.${
            leaderTitle ? ` ${leaderTitle} is leading.` : ""
          } Add ${needed} more film${needed === 1 ? "" : "s"} to make the rankings sharper.`,
          cta: `Continue ${bestYear}`,
          year: bestYear,
          icon: "film" as const,
        };
      }
      return {
        message: `Welcome back. You\u2019ve rated ${totalRated} film${totalRated === 1 ? "" : "s"} so far. Pick up where you left off.`,
        cta: "Keep building",
        year: bestYear,
        icon: "star" as const,
      };
    }

    // Session 3: encourage refining close calls
    if (sessionCount === 3) {
      if (bestYear && bestYearRatedCount >= 5) {
        return {
          message: `You\u2019ve got enough ratings to start refining the close calls in ${bestYear}. Settle some head-to-head matchups to strengthen your ballot.`,
          cta: "Refine your rankings",
          year: bestYear,
          icon: "star" as const,
        };
      }
      if (bestYear) {
        const needed = 5 - bestYearRatedCount;
        return {
          message: `${needed} more film${needed === 1 ? "" : "s"} in ${bestYear} and your rankings will really start to take shape.`,
          cta: `Add films to ${bestYear}`,
          year: bestYear,
          icon: "film" as const,
        };
      }
    }

    // Session 4: light nudge
    if (sessionCount === 4 && totalRated < 10) {
      return {
        message: "Your taste profile is forming. A few more ratings will open up new categories and sharper results.",
        cta: "Explore films",
        year: bestYear,
        icon: "star" as const,
      };
    }

    return null;
  }, [sessionCount, stage, hasDismissedOnboarding, movies, bestYear, bestYearRatedCount, leaderTitle]);

  if (!coaching) return null;

  const IconComponent = coaching.icon === "film" ? Film : Star;

  return (
    <div className="mx-auto max-w-2xl mb-8">
      <div className="relative rounded-xl border border-yellow-500/15 bg-gradient-to-r from-yellow-500/5 via-transparent to-transparent p-4 sm:p-5">
        {/* Dismiss */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1 text-gray-600 hover:text-gray-400 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="mt-0.5 flex-shrink-0 rounded-full bg-yellow-500/10 p-2">
            <IconComponent className="h-4 w-4 text-yellow-400/80" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-300 leading-relaxed mb-3">
              {coaching.message}
            </p>
            {coaching.year && (
              <button
                type="button"
                onClick={() => onOpenYear(coaching.year!)}
                className="inline-flex items-center gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 text-sm font-medium text-yellow-300 hover:bg-yellow-500/20 transition-colors"
              >
                {coaching.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

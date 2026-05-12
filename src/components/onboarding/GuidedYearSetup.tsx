"use client";

import { useMemo } from "react";
import { Calendar, ArrowRight, Star } from "lucide-react";
import MovieSearchPicker from "@/components/home/MovieSearchPicker";
import type { Movie } from "@/types/types";
import type { OnboardingStage } from "@/hooks/useOnboardingState";

interface GuidedYearSetupProps {
  stage: OnboardingStage;
  firstYearSelected: number | null;
  starterRatingsCount: number;
  onSelectMovie: (movie: Movie) => void;
  onSelectYear: (year: number) => void;
}

const SUGGESTED_YEARS = (() => {
  const current = new Date().getFullYear();
  return [current, current - 1, current - 2, 2019, 2014, 2010, 2007, 1999, 1994];
})();

export default function GuidedYearSetup({
  stage,
  firstYearSelected,
  starterRatingsCount,
  onSelectMovie,
  onSelectYear,
}: GuidedYearSetupProps) {
  // Stage: year-selection
  if (stage === "year-selection") {
    return (
      <div className="px-2 pt-6 sm:px-0">
        <section className="mx-auto max-w-xl text-center">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-gold-500/10 border border-gold-500/20 px-3 py-1 mb-4">
              <Calendar className="h-3.5 w-3.5 text-gold-400" />
              <span className="text-xs font-medium text-gold-300 uppercase tracking-wider">
                Step 1 of 3
              </span>
            </div>
            <h2 className="font-unbounded text-2xl sm:text-3xl font-bold text-white mb-3">
              Pick a year you know well enough to have opinions
            </h2>
            <p className="text-base text-gray-400 max-w-md mx-auto">
              A favorite year, a recent year, or a year with films you remember clearly all work.
            </p>
          </div>

          {/* Year suggestions */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {SUGGESTED_YEARS.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => onSelectYear(year)}
                className="rounded-lg border border-gray-700/40 bg-charcoal-900/50 px-4 py-2.5 font-unbounded text-sm font-bold text-white hover:border-gold-500/40 hover:bg-gray-800/60 transition-all"
              >
                {year}
              </button>
            ))}
          </div>

          {/* Or search */}
          <p className="text-xs text-gray-500 mb-3">
            Or search for a film \u2014 we\u2019ll use its year
          </p>
          <div className="mx-auto max-w-md">
            <MovieSearchPicker
              onSelect={onSelectMovie}
              placeholder="Search for a movie you love..."
            />
          </div>
        </section>
      </div>
    );
  }

  // Stage: rating
  if (stage === "rating" && firstYearSelected) {
    const remaining = Math.max(0, 3 - starterRatingsCount);

    if (remaining > 0) {
      return (
        <div className="mx-auto max-w-2xl mb-6">
          <div className="rounded-xl border border-gold-500/15 bg-gradient-to-r from-gold-500/5 via-transparent to-transparent p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0 rounded-full bg-gold-500/10 p-2">
                <Star className="h-4 w-4 text-gold-400/80" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gold-400/70 uppercase tracking-wider">
                    Step 2 of 3
                  </span>
                  <span className="text-xs text-gray-600">\u00B7</span>
                  <span className="text-xs text-gray-500">
                    {starterRatingsCount}/3 rated
                  </span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {starterRatingsCount === 0
                    ? `Start with 3\u20135 films you\u2019ve seen from ${firstYearSelected}. Choose films you remember well \u2014 you can add more later.`
                    : `${remaining} more rating${remaining === 1 ? "" : "s"} and we\u2019ll have enough to start building your ${firstYearSelected} race.`}
                </p>
                {/* Progress dots */}
                <div className="flex gap-1.5 mt-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        i < starterRatingsCount
                          ? "w-8 bg-gold-400"
                          : "w-8 bg-gray-700"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Transitional acknowledgment (3+ ratings, before payoff)
    return (
      <div className="mx-auto max-w-2xl mb-6">
        <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent p-4 sm:p-5 text-center">
          <p className="text-sm font-medium text-emerald-300">
            Nice \u2014 you\u2019ve given us enough to start building your {firstYearSelected} race.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            These ratings are a first signal, not a permanent verdict.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

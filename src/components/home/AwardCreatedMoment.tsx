"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import type { AwardResult } from "@/hooks/useCreateAward";

interface Props {
  result: AwardResult;
  movieTitle: string;
  moviePosterUrl?: string;
  isGuest: boolean;
  onAddNominees: () => void;
  onFixAnotherYear: () => void;
  onSeeMyAwards: () => void;
  onSignup?: () => void;
  isFirstAward?: boolean;
}

/**
 * AwardCreatedMoment — animated celebration shown after creating an award.
 *
 * Displays trophy icon, movie poster, year badge, context message.
 * Three CTAs + optional guest signup prompt.
 */
export default function AwardCreatedMoment({
  result,
  movieTitle,
  moviePosterUrl,
  isGuest,
  onAddNominees,
  onFixAnotherYear,
  onSeeMyAwards,
  onSignup,
  isFirstAward = false,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Handle error state with delay (don't remove celebration instantly)
  useEffect(() => {
    if (!result.success && result.error) {
      const timer = setTimeout(() => setShowError(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  if (showError) {
    return (
      <div className="text-center py-8 px-4">
        <p className="text-red-400 text-sm mb-3">{result.error}</p>
        <button
          onClick={onFixAnotherYear}
          className="text-sm text-blue-400 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div
      className={`text-center py-8 px-4 transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {/* Trophy + Poster */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <Trophy className="w-10 h-10 text-yellow-400 animate-bounce" />
        {moviePosterUrl && (
          <div className="relative">
            <img
              src={moviePosterUrl}
              alt={movieTitle}
              className="w-20 h-28 object-cover rounded-lg shadow-lg border-2 border-yellow-400/50"
            />
            <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {result.year}
            </div>
          </div>
        )}
      </div>

      {/* Title */}
      <h2 className="text-lg font-bold text-white mb-1">
        {movieTitle} is your Best Picture of {result.year}
      </h2>

      {/* Context message */}
      <p className="text-sm text-gray-400 mb-6">
        {result.contextMessage}
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onAddNominees}
          className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30 rounded-lg text-sm font-medium transition-colors"
        >
          Add nominees for {result.year}
        </button>
        <button
          onClick={onFixAnotherYear}
          className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700/70 text-gray-200 border border-gray-600/30 rounded-lg text-sm font-medium transition-colors"
        >
          Fix another year
        </button>
        <button
          onClick={onSeeMyAwards}
          className="px-4 py-2 text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors"
        >
          See my awards
        </button>
      </div>

      {/* Guest signup CTA — soft, after first award */}
      {isGuest && isFirstAward && onSignup && (
        <div className="mt-6 pt-4 border-t border-gray-700/50">
          <button
            onClick={onSignup}
            className="text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors"
          >
            Save your award &mdash; create a free account
          </button>
        </div>
      )}
    </div>
  );
}

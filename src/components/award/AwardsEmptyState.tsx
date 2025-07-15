"use client";

import { Trophy, Star, ArrowRight, Crown, Calendar, Medal } from "lucide-react";
import Link from "next/link";

interface AwardsEmptyStateProps {
  ratedMoviesCount: number;
}

export default function AwardsEmptyState({ ratedMoviesCount }: AwardsEmptyStateProps) {
  if (ratedMoviesCount === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center py-16 px-6">
          <div className="max-w-2xl mx-auto">
            {/* Icon */}
            <div className="relative mb-8">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-xl">
                <Crown className="w-12 h-12 text-white" />
              </div>
            </div>

            {/* Main Message */}
            <h1 className="text-4xl tracking-wide font-unbounded uppercase text-gray-900 dark:text-white mt-0 pt-0 mb-6">
                Your Decide Best Picture!
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Create custom Best Picture awards by year, with your own nominees and winners 
              based on your movie ratings.
            </p>

            {/* Demo Preview with Dark Glass Effect */}
            <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-8 mb-8 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6 flex items-center justify-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                How It Works
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">1. Rate Movies</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Give movies 1-10 ratings across different years
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">2. Auto-Generated Years</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    We organize your top-rated movies by release year
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/50 border border-orange-200 dark:border-orange-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">3. Customize Awards</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Adjust nominees and pick who you think should have won
                  </p>
                </div>
              </div>

              <div className="mt-8 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                  <p className="text-sm">
                    <strong className="text-gray-700 dark:text-gray-300">Example:</strong> Rate 10+ movies from 2023 → Get a "Best Picture 2023" category 
                    with your top picks as nominees, then choose who you believe should have won
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/films"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium text-lg shadow-lg"
              >
                <Star className="w-5 h-5" />
                Start Rating Movies
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Stats Preview */}
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-4">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">5+</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Movies per year needed</div>
              </div>
              <div className="p-4">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">10</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Max nominees per year</div>
              </div>
              <div className="p-4">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">1</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Winner per category</div>
              </div>
              <div className="p-4">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">100</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Years you can create</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Partial state - has some ratings but not enough for meaningful awards
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center py-12 px-6">
        <div className="max-w-lg mx-auto">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Almost Ready for Awards!
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            You've rated {ratedMoviesCount} movie{ratedMoviesCount !== 1 ? 's' : ''}. 
            Rate movies from different years to create your custom award categories.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            <strong className="text-gray-700 dark:text-gray-300">Tip:</strong> We need at least 5 rated movies from the same year to create a Best Picture category for that year.
          </p>
          <Link
            href="/films"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg"
          >
            <Star className="w-5 h-5" />
            Continue Rating Movies
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

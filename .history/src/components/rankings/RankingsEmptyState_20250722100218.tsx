"use client";

import { Trophy, Star, ArrowRight, Calendar, Award, List } from "lucide-react";
import Link from "next/link";

interface RankingsEmptyStateProps {
  isGuest: boolean;
  onSignupClick?: () => void;
}

export default function RankingsEmptyState({ isGuest, onSignupClick }: RankingsEmptyStateProps) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="px-6 pt-16 pb-0 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Hero Icon */}
          <div className="relative mb-0">
            <img 
              src="/oscarworthy-logomark.svg" 
              alt="Golden Envelope" 
              className="w-24 h-24 mx-auto" 
            />
          </div>

          {/* Main Message */}
          <h1 className="pt-0 mt-0 mb-6 text-4xl tracking-wide text-gray-900 uppercase font-unbounded dark:text-white">
            Build Your Movie Rankings
          </h1>
          <p className="max-w-2xl mx-auto mb-12 text-xl text-gray-600 dark:text-gray-300">
            Rate movies to create personalized rankings by year. See how your taste compares 
            across different eras of cinema and track your favorite films of all time.
          </p>

          {/* Demo Preview */}
          <div className="p-8 mb-12 border shadow-xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
            <h3 className="flex items-center justify-center gap-2 mb-6 text-xl font-semibold text-gray-800 dark:text-gray-200">
              <List className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              How ReAwarding Work
            </h3>
            
            <div className="grid grid-cols-1 gap-6 text-sm md:grid-cols-3">
              <div className="text-center">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-blue-100 border border-blue-200 rounded-full dark:bg-blue-900/50 dark:border-blue-700">
                  <Star className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">1. Rate Movies</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Give movies 1-10 ratings as you watch them
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-yellow-100 border border-yellow-200 rounded-full dark:bg-yellow-900/50 dark:border-yellow-700">
                  <List className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">2. View Rankings</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  See your rated movies organized by year and ranking
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-orange-100 border border-orange-200 rounded-full dark:bg-orange-900/50 dark:border-orange-700">
                  <Trophy className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">3. Create Awards</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Generate Best Picture ceremonies from your rankings
                </p>
              </div>
            </div>

            <div className="p-4 mt-8 border-2 border-gray-300 border-dashed rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm dark:border-gray-600">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <List className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                <p className="text-sm">
                  <strong className="text-gray-700 dark:text-gray-300">Example:</strong> Rate 15 movies from different years → See your highest rated films organized by release year → Generate your personal Best Picture winners
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/films"
              className="inline-flex items-center gap-2 px-8 py-4 text-lg font-medium text-white transition-all rounded-lg shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Star className="w-5 h-5" />
              Start Rating Movies
              <ArrowRight className="w-5 h-5" />
            </Link>
            {isGuest && onSignupClick && (
              <button
                onClick={onSignupClick}
                className="inline-flex items-center gap-2 px-8 py-4 text-lg font-medium text-gray-900 transition-all bg-white border border-gray-300 rounded-lg dark:bg-gray-800 dark:text-white dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Trophy className="w-5 h-5" />
                Sign Up to Save Rankings
              </button>
            )}
          </div>

          {/* Stats Teaser */}
          <div className="grid grid-cols-2 gap-4 mt-16 text-center opacity-75 sm:grid-cols-4">
            <div className="p-4">
              <div className="mb-1 text-2xl font-bold text-blue-600 dark:text-blue-400">1-10</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Rating Scale</div>
            </div>
            <div className="p-4">
              <div className="mb-1 text-2xl font-bold text-yellow-600 dark:text-yellow-400">95</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Years Available</div>
            </div>
            <div className="p-4">
              <div className="mb-1 text-2xl font-bold text-purple-600 dark:text-purple-400">∞</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Movies to Rank</div>
            </div>
            <div className="p-4">
              <div className="mb-1 text-2xl font-bold text-orange-600 dark:text-orange-400">📊</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Personal Lists</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

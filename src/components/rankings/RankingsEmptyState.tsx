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
      <div className="text-center pt-16 pb-0 px-6">
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
          <h1 className="text-4xl tracking-wide font-unbounded uppercase text-gray-900 dark:text-white mt-0 pt-0 mb-6">
            Build Your Movie Rankings
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
            Rate movies to create personalized rankings by year. See how your taste compares 
            across different eras of cinema and track your favorite films of all time.
          </p>

          {/* Demo Preview */}
          <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-8 mb-12 shadow-xl">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-6 flex items-center justify-center gap-2">
              <List className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              How Rankings Work
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">1. Rate Movies</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Give movies 1-10 ratings as you watch them
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <List className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">2. View Rankings</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  See your rated movies organized by year and ranking
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/50 border border-orange-200 dark:border-orange-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">3. Create Awards</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Generate Best Picture ceremonies from your rankings
                </p>
              </div>
            </div>

            <div className="mt-8 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <List className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                <p className="text-sm">
                  <strong className="text-gray-700 dark:text-gray-300">Example:</strong> Rate 15 movies from different years → See your highest rated films organized by release year → Generate your personal Best Picture winners
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
            {isGuest && onSignupClick && (
              <button
                onClick={onSignupClick}
                className="inline-flex items-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-medium text-lg"
              >
                <Trophy className="w-5 h-5" />
                Sign Up to Save Rankings
              </button>
            )}
          </div>

          {/* Stats Teaser */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center opacity-75">
            <div className="p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">1-10</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Rating Scale</div>
            </div>
            <div className="p-4">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">95</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Years Available</div>
            </div>
            <div className="p-4">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">∞</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Movies to Rank</div>
            </div>
            <div className="p-4">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">📊</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Personal Lists</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

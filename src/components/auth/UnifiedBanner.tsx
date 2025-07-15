"use client";

import { X, Trophy, Star, Film, AlertTriangle, User, UserPlus } from "lucide-react";
import { useBannerPriority, BannerType } from "@/hooks/useBannerPriority";
import { useMovieDataWithGuest } from "@/utils/sharedMovieUtils";

interface UnifiedBannerProps {
  onSignupClick: () => void;
  onLoginClick?: () => void;
  excludeBannerTypes?: BannerType[];
}

export default function UnifiedBanner({ onSignupClick, onLoginClick, excludeBannerTypes = [] }: UnifiedBannerProps) {
  const { activeBanner, interactionCount, isReturningUser, shouldShowBanner, dismissBanner, dismissPermanently } = useBannerPriority();
  const { movies } = useMovieDataWithGuest();
  
  // Calculate actual movie count (movies with ratings)
  const ratedMovieCount = movies.filter(movie => 
    movie.rankings && movie.rankings.length > 0 && movie.rankings[0].ranking !== null
  ).length;

  // Don't show banner if it's excluded or shouldn't show
  if (!shouldShowBanner || excludeBannerTypes.includes(activeBanner)) {
    return null;
  }

  const renderBannerContent = () => {
    switch (activeBanner) {
      case 'welcome':
        return (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
            <div className="text-center max-w-2xl mx-auto">
              <div className="flex justify-center gap-2 mb-4">
                <Trophy className="w-8 h-8 text-yellow-500 dark:text-yellow-400" />
                <Star className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                <Film className="w-8 h-8 text-purple-500 dark:text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to Reawarding!
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Discover and rate the best movies of the year. Start by exploring our collection 
                and rating your favorites - no sign-up required to get started!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    document.getElementById('movies-section')?.scrollIntoView({ 
                      behavior: 'smooth' 
                    });
                  }}
                  className="px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors font-medium"
                >
                  Start Rating Movies
                </button>
                <button
                  onClick={onSignupClick}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  Sign Up to Save Progress
                </button>
              </div>
            </div>
            <button
              onClick={dismissBanner}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        );

      case 'returning':
        return (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-amber-900 dark:text-amber-100 font-medium text-sm mb-1">
                    Welcome back! You have {ratedMovieCount} movie{ratedMovieCount !== 1 ? 's' : ''} rated locally.
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 text-xs mb-3">
                    They'll be lost if you clear your browser data.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={onSignupClick}
                      className="inline-flex items-center px-3 py-2 bg-amber-600 dark:bg-amber-700 text-white text-sm font-medium rounded-lg hover:bg-amber-700 dark:hover:bg-amber-800 transition-colors"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Sign up to save data
                    </button>
                    {onLoginClick && (
                      <button
                        onClick={onLoginClick}
                        className="inline-flex items-center px-3 py-2 border border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300 text-sm font-medium rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                      >
                        Already have account?
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={dismissBanner}
                  className="p-1 text-amber-400 hover:text-amber-600 dark:text-amber-500 dark:hover:text-amber-300"
                  title="Dismiss for this session"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={dismissPermanently}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 underline"
                  title="Don't show again"
                >
                  Don't show again
                </button>
              </div>
            </div>
          </div>
        );

      case 'save-prompt':
        return (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-blue-600 dark:text-blue-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-blue-900 dark:text-blue-100 font-medium text-sm mb-1">
                    Loving this? Sign up to save your Best Picture picks.
                  </p>
                  <p className="text-blue-700 dark:text-blue-300 text-xs mb-3">
                    Create a free account to keep your rankings safe and access them anywhere.
                  </p>
                  <button
                    onClick={onSignupClick}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
                  >
                    Create Free Account
                  </button>
                </div>
              </div>
              <button
                onClick={dismissBanner}
                className="p-1 text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative">
      {renderBannerContent()}
    </div>
  );
}

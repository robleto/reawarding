"use client";

import { ArrowRight, Star, Film, Trophy } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface FilmsEmptyStateProps {
  isGuest: boolean;
  onSignupClick?: () => void;
}

export default function FilmsEmptyState({ isGuest, onSignupClick }: FilmsEmptyStateProps) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="px-6 pt-16 pb-0 text-center">
        <div className="max-w-3xl mx-auto">
          {/* Logo/Icon */}
          <div className="relative mb-0">
            <Image 
              src="/Oscarworthy-logomark.svg" 
              alt="Oscarworthy Logo" 
              width={96} 
              height={96} 
              className="mx-auto" 
            />
          </div>

          {/* Main Message */}
          <h1 className="pt-0 mt-0 mb-6 text-4xl tracking-wide text-gray-900 uppercase font-unbounded dark:text-white">
            Start Your Movie Journey
          </h1>
          <p className="max-w-2xl mx-auto mb-10 text-xl text-gray-600 dark:text-gray-300">
            Ready to discover and rate films? Search for a movie you've seen, give it a rating, and begin building your personal movie history. The more you rate, the better your experience!
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col justify-center gap-4 sm:flex-row mb-10">
            <Link
              href="/films"
              className="inline-flex items-center gap-2 px-8 py-4 text-lg font-medium text-white transition-all rounded-lg shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Film className="w-5 h-5" />
              Start Rating Films
              <ArrowRight className="w-5 h-5" />
            </Link>
            {isGuest && onSignupClick && (
              <button
                onClick={onSignupClick}
                className="inline-flex items-center gap-2 px-8 py-4 text-lg font-medium text-gray-900 transition-all bg-white border border-gray-300 rounded-lg dark:bg-gray-800 dark:text-white dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Trophy className="w-5 h-5" />
                Sign Up to Save Progress
              </button>
            )}
          </div>

          {/* Quick Steps */}
          <div className="grid grid-cols-1 gap-6 text-sm md:grid-cols-3 mb-12">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-blue-100 border border-blue-200 rounded-full dark:bg-blue-900/50 dark:border-blue-700">
                <Star className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">1. Search & Rate</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Find a movie you've seen and give it a rating from 1-10.
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-yellow-100 border border-yellow-200 rounded-full dark:bg-yellow-900/50 dark:border-yellow-700">
                <Film className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">2. Build Your List</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Add more films to grow your personal movie log.
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-orange-100 border border-orange-200 rounded-full dark:bg-orange-900/50 dark:border-orange-700">
                <Trophy className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
              <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">3. Unlock Rankings</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Once you've rated a few, see your rankings and awards!
              </p>
            </div>
          </div>

          {/* Getting Started Tip */}
          <div className="p-6 border-2 border-gray-300 border-dashed rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm dark:border-gray-600">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Film className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
              <p className="text-sm">
                <strong className="text-gray-700 dark:text-gray-300">Getting Started:</strong> Think of a recent movie you watched and enjoyed. Search for it above, then give it a rating to begin your journey!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

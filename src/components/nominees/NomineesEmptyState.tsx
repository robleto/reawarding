"use client";

import { Trophy, Star, ArrowRight, Film, Crown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface NomineesEmptyStateProps {
  isGuest: boolean;
  ratedMoviesCount: number;
  onSignupClick?: () => void;
}

// Sample demo nominees to show what's possible
const DEMO_NOMINEES = [
  { title: "Everything Everywhere All at Once", year: 2022, rating: 9.2, poster: "/posters/everything-everywhere-all-at-once-2022.jpg" },
  { title: "The Godfather", year: 1972, rating: 9.1, poster: "/posters/the-godfather-1972.jpg" },
  { title: "Parasite", year: 2019, rating: 8.9, poster: "/posters/parasite-2019.jpg" },
  { title: "Moonlight", year: 2016, rating: 8.7, poster: "/posters/moonlight-2016.jpg" },
  { title: "No Country for Old Men", year: 2007, rating: 8.5, poster: "/posters/no-country-for-old-men-2007.jpg" },
];

export default function NomineesEmptyState({ isGuest, ratedMoviesCount, onSignupClick }: NomineesEmptyStateProps) {
  if (ratedMoviesCount === 0) {
    return (
      <div className="text-center py-16 px-6">
        <div className="max-w-2xl mx-auto">
          {/* Icon */}
          <div className="relative mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
              <Crown className="w-4 h-4 text-yellow-800" />
            </div>
          </div>

          {/* Main Message */}
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Create Your Best Picture Nominees
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Rate movies to build your personalized Best Picture ceremony. 
            Select up to 10 nominees and crown your winner!
          </p>

          {/* Demo Preview */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center justify-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              Preview: Sample Nominees List
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {DEMO_NOMINEES.map((movie, index) => (
                <div key={movie.title} className="relative group">
                  <div className="aspect-[2/3] bg-gray-200 rounded-lg overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
                    <div className="absolute top-2 left-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold z-20">
                      {index === 0 ? <Crown className="w-3 h-3" /> : index + 1}
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 z-20">
                      <div className="text-white text-xs font-medium truncate">{movie.title}</div>
                      <div className="text-yellow-300 text-xs flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        {movie.rating}
                      </div>
                    </div>
                    {/* Placeholder for movie poster */}
                    <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                      <Film className="w-8 h-8 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3 italic">
              * This is just an example. Your nominees will be based on your movie ratings.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/films"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Star className="w-5 h-5" />
              Start Rating Movies
              <ArrowRight className="w-4 h-4" />
            </Link>
            
            {isGuest && onSignupClick && (
              <button
                onClick={onSignupClick}
                className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                <Trophy className="w-5 h-5" />
                Sign Up to Save Nominees
              </button>
            )}
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 text-sm">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Star className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Rate Movies</h4>
              <p className="text-gray-600">Give movies a 1-10 rating based on your preferences</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-6 h-6 text-yellow-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Build Nominees</h4>
              <p className="text-gray-600">Select your top 10 movies as Best Picture nominees</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Crown className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Crown Winner</h4>
              <p className="text-gray-600">Choose your ultimate Best Picture winner</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Partial state - has some ratings but not enough for meaningful nominees
  if (ratedMoviesCount < 5) {
    return (
      <div className="text-center py-12 px-6">
        <div className="max-w-lg mx-auto">
          <Trophy className="w-16 h-16 mx-auto mb-6 text-yellow-500" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Keep Rating Movies!
          </h2>
          <p className="text-gray-600 mb-6">
            You've rated {ratedMoviesCount} movie{ratedMoviesCount !== 1 ? 's' : ''}. 
            Rate a few more to create a meaningful Best Picture nominees list.
          </p>
          <Link
            href="/films"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Star className="w-5 h-5" />
            Rate More Movies
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return null; // Show normal nominees interface if they have enough ratings
}

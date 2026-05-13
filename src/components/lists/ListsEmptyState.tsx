"use client";

import { Trophy, Star, ArrowRight, Calendar, Award, List, Plus } from "lucide-react";
import Link from "next/link";

interface ListsEmptyStateProps {
  onCreateList: () => void;
}

export default function ListsEmptyState({ onCreateList }: ListsEmptyStateProps) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="text-center pt-16 pb-0 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Hero Icon */}
          <div className="relative mb-0">
            <img 
              src="/reawarding-logomark.svg" 
              alt="Reawarding" 
              className="w-24 h-24 mx-auto" 
            />
          </div>

          {/* Main Message */}
          <h1 className="text-4xl tracking-wide font-unbounded uppercase text-white mt-0 pt-0 mb-6">
            Create Custom Movie Lists
          </h1>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Organize your movie collection into custom lists. Create themed collections, 
            watchlists, favorites, or any personalized ranking you can imagine.
          </p>

          {/* Demo Preview */}
          <div className="bg-charcoal-900/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 mb-12 shadow-xl">
            <h3 className="text-xl font-semibold text-gray-200 mb-6 flex items-center justify-center gap-2">
              <List className="w-5 h-5 text-blue-400" />
              How Lists Work
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-900/50 border border-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-blue-400" />
                </div>
                <h4 className="font-semibold text-white mb-2">1. Create Lists</h4>
                <p className="text-gray-300">
                  Make custom lists with any theme or criteria you want
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gold-900/50 border border-gold-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-gold-400" />
                </div>
                <h4 className="font-semibold text-white mb-2">2. Add & Rank Movies</h4>
                <p className="text-gray-300">
                  Add movies and arrange them in your preferred order
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-900/50 border border-orange-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-orange-400" />
                </div>
                <h4 className="font-semibold text-white mb-2">3. Share & Organize</h4>
                <p className="text-gray-300">
                  Keep lists private or share your curated collections
                </p>
              </div>
            </div>

            <div className="mt-8 p-4 bg-gray-800/80 backdrop-blur-sm rounded-lg border-2 border-dashed border-gray-600">
              <div className="text-center text-gray-400">
                <List className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                <p className="text-sm">
                  <strong className="text-gray-300">Examples:</strong> "Best Sci-Fi Films" • "Movies to Watch" • "2023 Favorites" • "Underrated Gems" • "Director's Best Works"
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onCreateList}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium text-lg shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Create Your First List
              <ArrowRight className="w-5 h-5" />
            </button>
            <Link
              href="/films"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gray-800 text-white border border-gray-600 rounded-lg hover:bg-gray-700 transition-all font-medium text-lg"
            >
              <Star className="w-5 h-5" />
              Browse Movies First
            </Link>
          </div>

          {/* Stats Teaser */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center opacity-75">
            <div className="p-4">
              <div className="text-2xl font-bold text-blue-400 mb-1">∞</div>
              <div className="text-xs text-gray-400">Custom Lists</div>
            </div>
            <div className="p-4">
              <div className="text-2xl font-bold text-gold-400 mb-1">📝</div>
              <div className="text-xs text-gray-400">Any Theme</div>
            </div>
            <div className="p-4">
              <div className="text-2xl font-bold text-purple-400 mb-1">🔄</div>
              <div className="text-xs text-gray-400">Reorder Anytime</div>
            </div>
            <div className="p-4">
              <div className="text-2xl font-bold text-orange-400 mb-1">🔒</div>
              <div className="text-xs text-gray-400">Private or Public</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

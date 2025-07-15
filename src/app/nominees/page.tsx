"use client";

import { useMovieDataWithGuest } from "@/utils/sharedMovieUtils";
import BestPictureNominees from "@/components/nominees/BestPictureNominees";
import NomineesEmptyState from "@/components/nominees/NomineesEmptyState";
import AuthModalManager from "@/components/auth/AuthModalManager";
import { useState } from "react";
import type { Movie } from "@/types/types";
import { Trophy, Save, Share2, Crown } from "lucide-react";

export default function NomineesPage() {
  const { movies, loading, isGuest } = useMovieDataWithGuest();
  const [selectedNominees, setSelectedNominees] = useState<Movie[]>([]);
  const [winner, setWinner] = useState<Movie | undefined>();
  
  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');

  // Count movies with ratings
  const ratedMoviesCount = movies.filter(movie => 
    movie.rankings && movie.rankings.length > 0 && movie.rankings[0]?.ranking && movie.rankings[0].ranking > 0
  ).length;

  const handleSignupClick = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  const handleNomineesChange = (nominees: Movie[], selectedWinner?: Movie) => {
    setSelectedNominees(nominees);
    setWinner(selectedWinner);
  };

  const handleSaveNominees = () => {
    // TODO: Implement saving nominees to database
    console.log("Saving nominees:", selectedNominees);
    console.log("Winner:", winner);
    alert(`Nominees and winner saved! Winner: ${winner?.title || 'None selected'} (Feature coming soon)`);
  };

  const handleShareNominees = () => {
    // TODO: Implement sharing functionality
    console.log("Sharing nominees:", selectedNominees);
    alert("Share feature coming soon!");
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your rated movies...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state for users with no/few ratings
  if (ratedMoviesCount === 0 || ratedMoviesCount < 5) {
    return (
      <>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <NomineesEmptyState 
            isGuest={isGuest}
            ratedMoviesCount={ratedMoviesCount}
            onSignupClick={handleSignupClick}
          />
        </div>
        <AuthModalManager 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode={authMode}
        />
      </>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-8 h-8 text-yellow-500" />
          <h1 className="text-3xl font-bold text-gray-900">Best Picture Nominees</h1>
        </div>
        <p className="text-lg text-gray-600">
          Create your personal Best Picture nominees list from your rated movies. 
          Select up to 10 films and arrange them in your preferred order.
        </p>
      </div>

      {/* Action Buttons */}
      {selectedNominees.length > 0 && (
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleSaveNominees}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Nominees
          </button>
          <button
            onClick={handleShareNominees}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share List
          </button>
        </div>
      )}

      {/* Main Component */}
      <BestPictureNominees 
        movies={movies}
        onNomineesChange={handleNomineesChange}
        className="bg-gray-50 rounded-xl p-6"
      />

      {/* Summary */}
      {selectedNominees.length > 0 && (
        <div className="mt-8 p-6 bg-white rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Nominees Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{selectedNominees.length}</div>
              <div className="text-sm text-gray-600">Movies Selected</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {(selectedNominees.reduce((sum, movie) => sum + (movie.rankings?.[0]?.ranking || 0), 0) / selectedNominees.length).toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Average Rating</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {selectedNominees.filter(movie => (movie.rankings?.[0]?.ranking || 0) >= 8).length}
              </div>
              <div className="text-sm text-gray-600">8+ Rated Films</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {winner ? '👑' : '—'}
              </div>
              <div className="text-sm text-gray-600">
                {winner ? 'Winner Selected' : 'No Winner Yet'}
              </div>
            </div>
          </div>
          {winner && (
            <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-yellow-800">
                <Crown className="w-4 h-4" />
                <span className="font-medium">Best Picture Winner: {winner.title} ({winner.release_year})</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Guest User Notice */}
      {isGuest && (
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <Trophy className="w-5 h-5" />
            <span className="font-medium">Guest Mode</span>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            Sign up to save your nominees list and share it with friends!
          </p>
          <button
            onClick={handleSignupClick}
            className="mt-2 text-sm text-yellow-800 hover:text-yellow-900 underline"
          >
            Sign up now
          </button>
        </div>
      )}
      
      <AuthModalManager 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
    </div>
  );
}

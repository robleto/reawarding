"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import CollectionRow from "@/components/films/CollectionRow";
import CollectionCard from "@/components/films/CollectionCard";
import type { Movie } from "@/types/types";

interface FilmCollection {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  featured: boolean;
  movie_count: number;
}

interface CollectionsHomeSectionProps {
  movies: Movie[];
  userId: string | null;
  updateMovieRanking: (movieId: number, data: { ranking?: number | null; seen_it?: boolean }) => void;
  setSelectedMovie: (movie: Movie) => void;
}

export default function CollectionsHomeSection({
  movies,
  userId,
  updateMovieRanking,
  setSelectedMovie,
}: CollectionsHomeSectionProps) {
  const [featuredCollections, setFeaturedCollections] = useState<FilmCollection[]>([]);
  const [otherCollections, setOtherCollections] = useState<FilmCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllCollections, setShowAllCollections] = useState(false);

  useEffect(() => {
    async function fetchCollections() {
      const { data, error } = await supabase
        .from('film_collections_with_counts')
        .select('*')
        .order('title');

      if (error) {
        console.error('Error fetching collections:', error);
        setLoading(false);
        return;
      }

      // Randomize order using daily seed (changes once per day)
      const shuffleWithDailySeed = (arr: FilmCollection[]) => {
        const today = new Date().toDateString();
        const seed = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        
        const seededRandom = (index: number) => {
          const x = Math.sin(seed + index) * 10000;
          return x - Math.floor(x);
        };
        
        return [...arr].sort((a, b) => {
          const aIndex = arr.indexOf(a);
          const bIndex = arr.indexOf(b);
          return seededRandom(aIndex) - seededRandom(bIndex);
        });
      };

      const shuffled = shuffleWithDailySeed(data || []);
      setFeaturedCollections(shuffled.filter(c => c.featured));
      setOtherCollections(shuffled.filter(c => !c.featured));
      setLoading(false);
    }

    fetchCollections();
  }, []);

  if (loading) {
    return (
      <section className="mt-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-gray-900/60 border border-yellow-500/20 rounded-2xl animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (featuredCollections.length === 0 && otherCollections.length === 0) {
    return null;
  }

  const displayedCollections = showAllCollections ? otherCollections : otherCollections.slice(0, 6);
  const hasMoreCollections = otherCollections.length > 6;

  return (
    <section className="mt-4">
      {/* Featured Collections - Horizontal Movie Rows */}
      {featuredCollections.length > 0 && (
        <div className="space-y-8">
          {featuredCollections.map((collection) => (
            <CollectionRow
              key={collection.id}
              collection={collection}
              movies={movies}
              userId={userId}
              onUpdateMovie={updateMovieRanking}
              onMovieClick={setSelectedMovie}
            />
          ))}
        </div>
      )}

      {/* Other Collections - Grid */}
      {otherCollections.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-white mb-4">More Collections</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayedCollections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                movieCount={collection.movie_count}
              />
            ))}
          </div>
          
          {hasMoreCollections && !showAllCollections && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowAllCollections(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900/60 hover:bg-gray-900/80 text-white border border-yellow-500/20 hover:border-yellow-500/40 rounded-lg font-medium transition-all"
              >
                View more collections
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}


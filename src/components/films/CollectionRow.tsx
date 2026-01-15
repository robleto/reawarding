"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import MoviePosterCard from "@/components/movie/MoviePosterCard";
import type { Movie } from "@/types/types";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import * as LucideIcons from "lucide-react";

interface CollectionRowProps {
  collection: {
    id: string;
    slug: string;
    title: string;
    description: string;
    icon: string;
    color?: string;
    category: string;
    movie_count?: number;
  };
  movies: Movie[];
  userId: string | null;
  onUpdateMovie: (movieId: number, data: { ranking?: number | null; seen_it?: boolean }) => void;
  onMovieClick: (movie: Movie) => void;
}

export default function CollectionRow({
  collection,
  movies,
  userId,
  onUpdateMovie,
  onMovieClick,
}: CollectionRowProps) {
  const [collectionMovies, setCollectionMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCollectionMovies() {
      setLoading(true);
      
      // Fetch TMDB IDs for this collection
      const { data: itemsData, error } = await supabase
        .from('film_collection_items')
        .select('tmdb_id')
        .eq('collection_id', collection.id)
        .limit(20); // Show first 20 movies
      
      if (error) {
        console.error('Error fetching collection items:', error);
        setLoading(false);
        return;
      }
      
      const tmdbIds = itemsData?.map(item => item.tmdb_id) || [];
      
      // Filter movies by TMDB IDs
      const filteredMovies = tmdbIds
        .map(tmdbId => movies.find(m => m.tmdb_id === tmdbId))
        .filter(Boolean) as Movie[];
      
      setCollectionMovies(filteredMovies);
      setLoading(false);
    }
    
    fetchCollectionMovies();
  }, [collection.id, movies]);

  if (loading || collectionMovies.length === 0) return null;

  // Get the icon component dynamically
  const IconComponent = (LucideIcons as any)[collection.icon] || LucideIcons.Film;

  return (
    <div>
      {/* Collection Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div>
          <h2 className="text-xl font-bold text-white">
            {collection.title}
          </h2>
          {collection.description && (
            <p className="text-sm text-gray-400 max-w-2xl">
              {collection.description}
            </p>
          )}
        </div>
        
        <Link
          href={`/films/collections/${collection.slug}`}
          className="flex items-center gap-1 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap"
        >
          See All {collection.movie_count && `(${collection.movie_count})`}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Horizontal Scroll */}
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {collectionMovies.map((movie) => {
            const ranking = movie.rankings?.[0];
            return (
              <div 
                key={movie.id} 
                className="flex-shrink-0 w-[140px] sm:w-[160px] snap-start"
              >
                <MoviePosterCard
                  movie={movie}
                  currentUserId={userId}
                  ranking={ranking?.ranking ?? null}
                  seenIt={ranking?.seen_it ?? false}
                  onUpdate={onUpdateMovie}
                  onClick={() => onMovieClick(movie)}
                />
              </div>
            );
          })}
          
          {/* See More Card */}
          <Link
            href={`/films/collections/${collection.slug}`}
            className="flex-shrink-0 w-[140px] sm:w-[160px] snap-start"
          >
            <div className="aspect-[2/3] rounded-lg border-2 border-dashed border-gray-600 hover:border-blue-500 bg-gray-900/40 hover:bg-gray-800/60 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer group">
              <ChevronRight className="w-8 h-8 text-gray-500 group-hover:text-blue-400 transition-colors" />
              <span className="text-sm font-medium text-gray-400 group-hover:text-blue-400 transition-colors">
                See All
              </span>
              {collection.movie_count && (
                <span className="text-xs text-gray-500">
                  {collection.movie_count} films
                </span>
              )}
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

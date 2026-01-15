"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import CollectionRow from "@/components/films/CollectionRow";
import type { Movie } from "@/types/types";

interface FeaturedCollectionsSectionProps {
  movies: Movie[];
  userId: string | null;
  updateMovieRanking: (movieId: number, data: { ranking?: number | null; seen_it?: boolean }) => void;
  setSelectedMovie: (movie: Movie) => void;
}

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

export default function FeaturedCollectionsSection({
  movies,
  userId,
  updateMovieRanking,
  setSelectedMovie,
}: FeaturedCollectionsSectionProps) {
  const [featuredCollections, setFeaturedCollections] = useState<FilmCollection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeaturedCollections() {
      const { data, error } = await supabase
        .from('film_collections_with_counts')
        .select('*')
        .eq('featured', true)
        .order('title')
        .limit(3); // Show only 3 featured collections on home page

      if (error) {
        console.error('Error fetching featured collections:', error);
        setLoading(false);
        return;
      }

      setFeaturedCollections(data || []);
      setLoading(false);
    }

    fetchFeaturedCollections();
  }, []);

  if (loading || featuredCollections.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 space-y-6">
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
    </section>
  );
}

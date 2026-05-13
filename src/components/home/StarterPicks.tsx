"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import type { Movie } from "@/types/types";
import { STARTER_PICKS } from "@/data/bestPictureWinners";

interface Props {
  onSelect: (movie: Movie) => void;
}

/**
 * StarterPicks — horizontal carousel of curated beloved films that lost Best Picture.
 * Fetches full Movie objects from DB by title+year on mount.
 */
export default function StarterPicks({ onSelect }: Props) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStarterPicks() {
      // Fetch all starter pick movies in one query using OR conditions
      const titles = STARTER_PICKS.map((p) => p.title);
      const { data, error } = await supabase
        .from("movies")
        .select("id, title, release_year, poster_url, thumb_url")
        .in("title", titles)
        .limit(20);

      if (!error && data) {
        // Match against starter picks to preserve order and filter exact matches
        const matched: Movie[] = [];
        for (const pick of STARTER_PICKS) {
          const found = data.find(
            (m: any) => m.title === pick.title && m.release_year === pick.year
          );
          if (found) {
            matched.push(found as Movie);
          }
        }
        setMovies(matched);
      }
      setLoading(false);
    }

    fetchStarterPicks();
  }, []);

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[100px] sm:w-[120px] aspect-[2/3] rounded-lg bg-gray-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (movies.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory">
      {movies.map((movie) => (
        <button
          key={movie.id}
          onClick={() => onSelect(movie)}
          className="flex-shrink-0 w-[100px] sm:w-[120px] group relative snap-start"
        >
          <div className="aspect-[2/3] rounded-lg overflow-hidden border-2 border-transparent group-hover:border-gold-400 transition-colors shadow-md">
            {movie.poster_url ? (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <span className="text-xs text-gray-500 text-center px-1">{movie.title}</span>
              </div>
            )}
          </div>
          <p className="mt-1.5 text-xs text-gray-400 text-center truncate">
            {movie.title}
          </p>
          <p className="text-[10px] text-gray-500 text-center">
            {movie.release_year}
          </p>
        </button>
      ))}
    </div>
  );
}

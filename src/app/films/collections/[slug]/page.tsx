"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseBrowser";
import MoviePosterCard from "@/components/movie/MoviePosterCard";
import MovieRowCard from "@/components/movie/MovieRowCard";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import MovieFilters from "@/components/filters/MovieFilters";
import type { Movie } from "@/types/types";
import {
  useMovieDataWithGuest,
  type SortKey,
  type SortOrder,
} from "@/utils/sharedMovieUtils";
import Loader from "@/components/ui/Loading";
import { ArrowLeft } from "lucide-react";
import * as LucideIcons from "lucide-react";
import Link from "next/link";

interface FilmCollection {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  featured: boolean;
}

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  
  const [collection, setCollection] = useState<FilmCollection | null>(null);
  const [collectionTmdbIds, setCollectionTmdbIds] = useState<number[]>([]);
  const [collectionLoading, setCollectionLoading] = useState(true);

  const { movies, loading, userId, updateMovieRanking, isGuest } = useMovieDataWithGuest();

  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("collectionViewMode") as "grid" | "list" | null;
      return stored || "grid";
    }
    return "grid";
  });

  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [sortBy, setSortBy] = useState<SortKey>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("collectionSortBy");
      return (stored as SortKey) || "year_desc";
    }
    return "year_desc";
  });

  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("collectionSortOrder");
      return (stored as SortOrder) || "desc";
    }
    return "desc";
  });

  const [yearFilter, setYearFilter] = useState<{ min: number; max: number }>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("collectionYearFilter");
      if (stored) {
        const parsed = JSON.parse(stored);
        return { min: parsed.min || 1900, max: parsed.max || new Date().getFullYear() };
      }
    }
    return { min: 1900, max: new Date().getFullYear() };
  });

  const [genreFilter, setGenreFilter] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("collectionGenreFilter");
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const [ratingFilter, setRatingFilter] = useState<{ min: number; max: number }>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("collectionRatingFilter");
      if (stored) {
        const parsed = JSON.parse(stored);
        return { min: parsed.min || 0, max: parsed.max || 10 };
      }
    }
    return { min: 0, max: 10 };
  });

  const [seenFilter, setSeenFilter] = useState<"all" | "seen" | "unseen">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("collectionSeenFilter");
      return (stored as "all" | "seen" | "unseen") || "all";
    }
    return "all";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("collectionViewMode", viewMode);
    }
  }, [viewMode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("collectionSortBy", sortBy);
    }
  }, [sortBy]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("collectionSortOrder", sortOrder);
    }
  }, [sortOrder]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("collectionYearFilter", JSON.stringify(yearFilter));
    }
  }, [yearFilter]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("collectionGenreFilter", JSON.stringify(genreFilter));
    }
  }, [genreFilter]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("collectionRatingFilter", JSON.stringify(ratingFilter));
    }
  }, [ratingFilter]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("collectionSeenFilter", seenFilter);
    }
  }, [seenFilter]);

  // FcollectionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Collection not found</h1>
          <Link href="/films/collections" className="text-gold hover:text-gold-light">
            Back to Collections
          </Link>
        </div>
      </div>
    );
  }

  // Get the Lucide icon component dynamically
  const IconComponent = (LucideIcons as any)[collection.icon] || LucideIcons.Film;

  // Filter movies to only include those in this collection
  const collectionMovies = movies.filter((movie) =>
    collectionT
      
      setCollection(collectionData);
      
      // Fetch collection items (TMDB IDs)
      const { data: itemsData, error: itemsError } = await supabase
        .from('film_collection_items')
        .select('tmdb_id')
        .eq('collection_id', collectionData.id);
      
      if (itemsError) {
        console.error('Error fetching collection items:', itemsError);
      } else {
        setCollectionTmdbIds(itemsData?.map(item => item.tmdb_id) || []);
      }
      
      setCollectionLoading(false);
    }
    
    fetchCollection();
  }, [slug]);

  if (!collection) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Collection not found</h1>
          <Link href="/films/collections" className="text-gold hover:text-gold-light">
            Back to Collections
          </Link>
        </div>
      </div>
    );
  }

  // Get the Lucide icon component dynamically
  const IconComponent = (LucideIcons as any)[collection.icon] || LucideIcons.Film;

  // Filter movies to only include those in this collection
  const collectionMovies = movies.filter((movie) =>
    collection.tmdbIds.includes(movie.tmdb_id)
  );

  // Apply filters
  let filteredMovies = [...collectionMovies];

  // Year filter
  filteredMovies = filteredMovies.filter((movie) => {
    if (!movie.release_year) return true;
    return movie.release_year >= yearFilter.min && movie.release_year <= yearFilter.max;
  });

  // Genre filter
  if (genreFilter.length > 0) {
    filteredMovies = filteredMovies.filter((movie) => {
      if (!movie.genres || movie.genres.length === 0) return false;
      return genreFilter.some((genre) => movie.genres?.includes(genre));
    });
  }

  // Rating filter
  filteredMovies = filteredMovies.filter((movie) => {
    const rating = movie.tmdb_rating || 0;
    return rating >= ratingFilter.min && rating <= ratingFilter.max;
  });

  // Seen filter
  if (seenFilter !== "all") {
    filteredMovies = filteredMovies.filter((movie) => {
      const hasSeen = movie.rankings.some((r) => r.seen_it);
      return seenFilter === "seen" ? hasSeen : !hasSeen;
    });
  }

  // Sort movies
  filteredMovies.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "year_desc":
        comparison = (b.release_year || 0) - (a.release_year || 0);
        break;
      case "year_asc":
        comparison = (a.release_year || 0) - (b.release_year || 0);
        break;
      case "title":
        comparison = a.title.localeCompare(b.title);
        break;
      case "rating":
        comparison = (b.tmdb_rating || 0) - (a.tmdb_rating || 0);
        break;
      case "my_ranking":
        const aRank = a.rankings.find((r) => r.user_id === userId)?.ranking || 999;
        const bRank = b.rankings.find((r) => r.user_id === userId)?.ranking || 999;
        comparison = aRank - bRank;
        break;
      default:
        comparison = 0;
    }
    return sortOrder === "desc" ? -comparison : comparison;
  });

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsModalOpen(true);
  };

  const handleRatingChange = async (movieId: number, newRating: number) => {
    await updateMovieRanking(movieId, newRating);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button & Header */}
        <div className="mb-8">
          <Link
            href="/films/collections"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-gold transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Collections
          </Link>

          <div className="flex items-start gap-4 mb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20">
              <IconComponent className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 font-unbounded">
                {collection.title}
              </h1>
              <p className="text-lg text-gray-400">{collection.description}</p>
              <p className="text-sm text-gray-500 mt-2">
                {filteredMovies.length} of {collectionMovies.length} films
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <MovieFilters
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          yearFilter={yearFilter}
          onYearFilterChange={setYearFilter}
          genreFilter={genreFilter}
          onGenreFilterChange={setGenreFilter}
          ratingFilter={ratingFilter}
          onRatingFilterChange={setRatingFilter}
          seenFilter={seenFilter}
          onSeenFilterChange={setSeenFilter}
          groupBy={null}
          onGroupByChange={() => {}}
          totalCount={filteredMovies.length}
          showGroupBy={false}
        />

        {/* Movies Grid/List */}
        {filteredMovies.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No films found matching your filters</p>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                : "space-y-4"
            }
          >
            {filteredMovies.map((movie) => {
              const userRanking = movie.rankings.find((r) => r.user_id === userId);
              return viewMode === "grid" ? (
                <MoviePosterCard
                  key={movie.id}
                  movie={movie}
                  onClick={() => handleMovieClick(movie)}
                  currentRating={userRanking?.ranking}
                  onRatingChange={(rating) => handleRatingChange(movie.id, rating)}
                  showRating={true}
                />
              ) : (
                <MovieRowCard
                  key={movie.id}
                  movie={movie}
                  onClick={() => handleMovieClick(movie)}
                  currentRating={userRanking?.ranking}
                  onRatingChange={(rating) => handleRatingChange(movie.id, rating)}
                  showRating={true}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Movie Detail Modal */}
      {selectedMovie && (
        <MovieDetailModal
          movie={selectedMovie}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedMovie(null);
          }}
          onRatingChange={handleRatingChange}
        />
      )}
    </div>
  );
}

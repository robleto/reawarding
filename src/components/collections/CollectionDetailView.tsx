"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search, X } from "lucide-react";
import MovieCard from "@/components/award/MovieCard";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import Loader from "@/components/ui/Loading";
import { useCollectionFilms } from "@/hooks/useCollectionFilms";
import type { Movie } from "@/types/types";

interface CollectionDetailViewProps {
  collectionId: string;
  title: string;
  description: string | null;
  filmsSeen: number;
  totalFilms: number;
  isCompleted: boolean;
  userId: string | null;
  /** 'route': classic "Back to Collections" chrome, real page.
      'overlay': close button, injected by CollectionExpandOverlay. */
  variant?: "route" | "overlay";
  onRequestClose?: () => void;
  /** Required when variant is 'route' — the profile's own /collections
      index, e.g. `/${username}/collections`. Not used in 'overlay' mode. */
  backHref?: string;
}

export default function CollectionDetailView({
  collectionId,
  title,
  description,
  filmsSeen,
  totalFilms,
  isCompleted,
  userId,
  variant = "route",
  onRequestClose,
  backHref,
}: CollectionDetailViewProps) {
  const { films, loading, updateFilmRanking } = useCollectionFilms(collectionId, userId);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredFilms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return films;
    return films.filter((movie) => movie.title.toLowerCase().includes(q));
  }, [films, query]);

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsModalOpen(true);
  };

  return (
    <div className={variant === "overlay" ? "max-w-screen-xl mx-auto py-6 pb-28" : "max-w-screen-xl mx-auto px-4 sm:px-6 py-8"}>
      {variant === "overlay" ? (
        <button
          type="button"
          onClick={onRequestClose}
          aria-label="Close"
          className="flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      ) : (
        <Link
          href={backHref ?? "/"}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-gold transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Collections
        </Link>
      )}

      <div className="mt-5 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1
            className={`font-unbounded text-white ${variant === "overlay" ? "text-xl" : "text-2xl md:text-3xl"}`}
            title={title}
          >
            {title}
          </h1>
          <span
            className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium ${
              isCompleted ? "text-emerald-300 bg-emerald-500/10" : "text-gold-300 bg-gold-500/10"
            }`}
          >
            {filmsSeen} of {totalFilms} seen
          </span>
        </div>
        {description && <p className="mt-2 text-sm text-gray-400 max-w-2xl">{description}</p>}
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader />
        </div>
      ) : films.length === 0 ? (
        <p className="text-sm text-gray-400 py-8">This collection doesn&apos;t have any films yet.</p>
      ) : (
        <div className="max-w-2xl">
          {films.length > 8 && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${totalFilms} films...`}
                className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500/40"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {filteredFilms.length === 0 ? (
            <p className="text-sm text-gray-400 py-8">No films match &quot;{query}&quot;.</p>
          ) : (
            filteredFilms.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              variant="compact"
              ranking={movie.rankings[0]?.ranking ?? null}
              seenIt={movie.rankings[0]?.seen_it ?? false}
              showYear
              dimUnseen
              onUpdate={updateFilmRanking}
              onClick={() => handleMovieClick(movie)}
            />
            ))
          )}
        </div>
      )}

      {selectedMovie && (
        <MovieDetailModal
          movie={selectedMovie}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedMovie(null);
          }}
          onUpdate={(movieId, newRanking, newSeenIt) => {
            updateFilmRanking(movieId, { ranking: newRanking, seen_it: newSeenIt });
          }}
          initialRanking={selectedMovie.rankings[0]?.ranking ?? null}
          initialSeenIt={selectedMovie.rankings[0]?.seen_it ?? false}
        />
      )}
    </div>
  );
}

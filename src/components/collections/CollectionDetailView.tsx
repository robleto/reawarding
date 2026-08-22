"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowLeft, Check, Filter, Search, SortAsc, SortDesc, X } from "lucide-react";
import MovieCard from "@/components/award/MovieCard";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import Loader from "@/components/ui/Loading";
import { useCollectionFilms } from "@/hooks/useCollectionFilms";
import { useGlobalToast } from "@/hooks/useGlobalToast";
import type { Movie } from "@/types/types";

type SortKey = "release_year" | "title" | "seen";
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "release_year", label: "Release year" },
  { key: "title", label: "Title" },
  { key: "seen", label: "Seen status" },
];
const DEFAULT_SORT_BY: SortKey = "release_year";
const DEFAULT_SORT_ORDER = "asc" as const;

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
  /** Fires with the live seen/total counts once films have loaded and
      whenever a seen/rating change updates them — lets a caller (the
      collections grid, via CollectionExpandOverlay) patch its own stale
      snapshot instead of waiting for a full refetch. */
  onProgressChange?: (filmsSeen: number, totalFilms: number) => void;
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
  onProgressChange,
}: CollectionDetailViewProps) {
  const { films, loading, updateFilmRanking } = useCollectionFilms(collectionId, userId);
  const { showToast } = useGlobalToast();
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT_BY);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(DEFAULT_SORT_ORDER);
  const [showSortOverlay, setShowSortOverlay] = useState(false);
  const isSortDefault = sortBy === DEFAULT_SORT_BY && sortOrder === DEFAULT_SORT_ORDER;

  // The films array is the one thing here actually kept live by
  // updateFilmRanking's optimistic writes — deriving counts from it (once
  // loaded) instead of the initial filmsSeen/totalFilms props means the
  // header, and anyone listening via onProgressChange, reflect a seen/rating
  // change immediately rather than showing the stale snapshot those props
  // were computed from until a full page reload.
  const liveFilmsSeen = films.filter((f) => f.rankings[0]?.seen_it).length;
  const liveTotalFilms = films.length;
  const displayFilmsSeen = loading ? filmsSeen : liveFilmsSeen;
  const displayTotalFilms = loading ? totalFilms : liveTotalFilms;
  const displayIsCompleted = loading ? isCompleted : liveTotalFilms > 0 && liveFilmsSeen === liveTotalFilms;

  useEffect(() => {
    if (!loading) onProgressChange?.(liveFilmsSeen, liveTotalFilms);
  }, [loading, liveFilmsSeen, liveTotalFilms, onProgressChange]);

  const filteredFilms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return films;
    return films.filter((movie) => movie.title.toLowerCase().includes(q));
  }, [films, query]);

  const sortedFilms = useMemo(() => {
    const direction = sortOrder === "asc" ? 1 : -1;
    return [...filteredFilms].sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title) * direction;
      if (sortBy === "seen") {
        const aSeen = a.rankings[0]?.seen_it ? 1 : 0;
        const bSeen = b.rankings[0]?.seen_it ? 1 : 0;
        return (aSeen - bSeen) * direction;
      }
      return ((a.release_year ?? 0) - (b.release_year ?? 0)) * direction;
    });
  }, [filteredFilms, sortBy, sortOrder]);

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
              displayIsCompleted ? "text-emerald-300 bg-emerald-500/10" : "text-gold-300 bg-gold-500/10"
            }`}
          >
            {displayFilmsSeen} of {displayTotalFilms} seen
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
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
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
              <button
                type="button"
                onClick={() => setShowSortOverlay(true)}
                aria-label="Sort"
                title="Sort"
                className={`relative flex-shrink-0 flex items-center justify-center p-2.5 rounded-full border backdrop-blur-sm transition-colors ${
                  isSortDefault
                    ? "text-gray-300 border-white/10 bg-white/5 hover:bg-white/10"
                    : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                }`}
              >
                <Filter className="w-4 h-4" />
                {!isSortDefault && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    1
                  </span>
                )}
              </button>
            </div>
          )}

          {sortedFilms.length === 0 ? (
            <p className="text-sm text-gray-400 py-8">No films match &quot;{query}&quot;.</p>
          ) : (
            sortedFilms.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              variant="compact"
              ranking={movie.rankings[0]?.ranking ?? null}
              seenIt={movie.rankings[0]?.seen_it ?? false}
              showYear
              dimUnseen
              onUpdate={async (movieId, updates) => {
                const success = await updateFilmRanking(movieId, updates);
                if (!success) showToast("Couldn't save that change. Please try again.", "error");
                return success;
              }}
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
            void updateFilmRanking(movieId, { ranking: newRanking, seen_it: newSeenIt }).then(
              (success) => {
                if (!success) showToast("Couldn't save that change. Please try again.", "error");
              }
            );
          }}
          initialRanking={selectedMovie.rankings[0]?.ranking ?? null}
          initialSeenIt={selectedMovie.rankings[0]?.seen_it ?? false}
        />
      )}

      {/* Portaled straight to document.body: in overlay mode this view sits
          inside CollectionExpandOverlay's pan-transformed track, and
          `transform` on an ancestor makes it the containing block for any
          `fixed` descendant — same fix MovieFilters uses for its own modal. */}
      {showSortOverlay && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowSortOverlay(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-sm z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
              <h2 className="text-sm font-semibold text-gray-200">Sort films</h2>
              <button
                onClick={() => setShowSortOverlay(false)}
                aria-label="Close"
                className="p-1.5 -m-1.5 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-1">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    sortBy === opt.key ? "bg-gold-500/10 text-gold-300" : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  {opt.label}
                  {sortBy === opt.key && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors text-sm text-gray-300"
              >
                {sortOrder === "asc" ? (
                  <>
                    <SortAsc className="w-4 h-4" />
                    Ascending
                  </>
                ) : (
                  <>
                    <SortDesc className="w-4 h-4" />
                    Descending
                  </>
                )}
              </button>
            </div>

            <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 px-5 py-3 flex gap-3">
              <button
                onClick={() => { setSortBy(DEFAULT_SORT_BY); setSortOrder(DEFAULT_SORT_ORDER); }}
                disabled={isSortDefault}
                className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  isSortDefault
                    ? "opacity-50 cursor-not-allowed text-gray-400 border-gray-700"
                    : "text-gray-200 border-gray-700 hover:bg-gray-800"
                }`}
              >
                Reset
              </button>
              <button
                onClick={() => setShowSortOverlay(false)}
                className="flex-1 px-4 py-2.5 bg-gold-500 hover:bg-gold-400 text-black rounded-lg text-sm font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

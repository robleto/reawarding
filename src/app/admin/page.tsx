"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { AlertCircle, CheckCircle, ExternalLink, Copy, Check } from "lucide-react";
import Image from "next/image";
import { normalizeImageUrl } from "@/utils/imageUrl";

type MovieFromDB = {
  id: string;
  title: string;
  release_year: number | null;
  tmdb_id?: number | null;
  poster_url: string | null;
  thumb_url: string | null;
  cached_poster_url?: string | null;
  cached_thumb_url?: string | null;
};

type BrokenImageMovie = MovieFromDB & {
  hasBrokenPoster: boolean;
  hasBrokenThumb: boolean;
};

export default function AdminBrokenImagesPage() {
  const [movies, setMovies] = useState<BrokenImageMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "poster" | "thumb" | "both">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadMovies();
  }, []);

  const loadMovies = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("movies")
      .select("id, title, release_year, tmdb_id, poster_url, thumb_url, cached_poster_url, cached_thumb_url")
      .order("release_year", { ascending: false });

    if (error) {
      console.error("Error loading movies:", error);
      setLoading(false);
      return;
    }

    if (data) {
      // Analyze each movie for broken images
      const analyzed = data.map((movie: MovieFromDB) => {
        const hasBrokenPoster = !movie.poster_url || movie.poster_url.trim() === "" || movie.poster_url.includes("placeholder");
        const hasBrokenThumb = !movie.thumb_url || movie.thumb_url.trim() === "" || movie.thumb_url.includes("placeholder");

        return {
          ...movie,
          hasBrokenPoster,
          hasBrokenThumb,
        };
      });

      // Filter to only movies with at least one broken image
      const broken = analyzed.filter((m: BrokenImageMovie) => m.hasBrokenPoster || m.hasBrokenThumb);
      setMovies(broken);
    }

    setLoading(false);
  };

  const filteredMovies = movies.filter((movie) => {
    switch (filter) {
      case "poster":
        return movie.hasBrokenPoster;
      case "thumb":
        return movie.hasBrokenThumb;
      case "both":
        return movie.hasBrokenPoster && movie.hasBrokenThumb;
      case "all":
      default:
        return true;
    }
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-unbounded font-bold text-gray-900 dark:text-gray-100 mb-2">
          Broken Movie Images
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Movies with missing or broken poster/thumbnail images
        </p>
      </div>

      {/* Stats & Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-4 text-sm">
          <div className="px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300">
            <span className="font-semibold">{movies.length}</span> movies with issues
          </div>
          <div className="px-4 py-2 rounded-lg bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300">
            <span className="font-semibold">{movies.filter((m) => m.hasBrokenPoster).length}</span> broken posters
          </div>
          <div className="px-4 py-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300">
            <span className="font-semibold">{movies.filter((m) => m.hasBrokenThumb).length}</span> broken thumbs
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            All Issues
          </button>
          <button
            onClick={() => setFilter("poster")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "poster"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Poster Only
          </button>
          <button
            onClick={() => setFilter("thumb")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "thumb"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Thumb Only
          </button>
          <button
            onClick={() => setFilter("both")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "both"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Both Broken
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredMovies.length} {filteredMovies.length === 1 ? "movie" : "movies"}
      </div>

      {/* Movies list */}
      <div className="space-y-4">
        {filteredMovies.map((movie) => (
          <div
            key={movie.id}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <div className="flex gap-4">
              {/* Thumbnail preview */}
              <div className="flex-shrink-0 w-16 h-24 bg-gray-100 dark:bg-gray-900 rounded overflow-hidden">
                {movie.poster_url && !movie.hasBrokenPoster ? (
                  <Image
                    src={normalizeImageUrl(movie.poster_url)}
                    alt={movie.title}
                    width={64}
                    height={96}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Hide on error
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                )}
              </div>

              {/* Movie info */}
              <div className="flex-grow">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {movie.title} ({movie.release_year})
                    </h3>
                    <div className="mt-1 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <span>ID: {movie.id}</span>
                      {movie.tmdb_id && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <span>TMDB: {movie.tmdb_id}</span>
                            <button
                              onClick={() => copyToClipboard(movie.tmdb_id!.toString(), movie.id)}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Copy TMDB ID"
                            >
                              {copiedId === movie.id ? (
                                <Check className="w-3 h-3 text-green-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            <a
                              href={`https://www.themoviedb.org/movie/${movie.tmdb_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Open in TMDB"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex gap-2">
                    {movie.hasBrokenPoster ? (
                      <span className="px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Poster
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Poster OK
                      </span>
                    )}
                    {movie.hasBrokenThumb ? (
                      <span className="px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Thumb
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Thumb OK
                      </span>
                    )}
                  </div>
                </div>

                {/* URLs for debugging */}
                <div className="mt-3 space-y-1 text-xs font-mono">
                  {movie.hasBrokenPoster && (
                    <div className="text-red-600 dark:text-red-400">
                      Poster: {movie.poster_url || "(empty)"}
                    </div>
                  )}
                  {movie.hasBrokenThumb && (
                    <div className="text-red-600 dark:text-red-400">
                      Thumb: {movie.thumb_url || "(empty)"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredMovies.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No movies found with the selected filter.
        </div>
      )}
    </div>
  );
}

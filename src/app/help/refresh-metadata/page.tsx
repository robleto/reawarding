"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function RefreshMetadataPage() {
  const [dbId, setDbId] = useState("");
  const [tmdbId, setTmdbId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error" | "info";
    message: string;
    details?: string[];
  } | null>(null);

  const handleRefresh = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const movieTmdbId = parseInt(tmdbId, 10);

    if (isNaN(movieTmdbId)) {
      setResult({
        type: "error",
        message: "TMDB ID must be a valid number",
      });
      setLoading(false);
      return;
    }

    try {
      // Call API route to refresh metadata (dbId can be UUID string)
      const response = await fetch("/api/refresh-movie-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dbId: dbId, // Send as string (handles UUID or integer)
          tmdbId: movieTmdbId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({
          type: "error",
          message: "Failed to update database",
          details: [data.error || "Unknown error"],
        });
        setLoading(false);
        return;
      }

      setResult({
        type: "success",
        message: `Successfully updated metadata for "${data.movie.title}"`,
        details: [
          `Year: ${data.movie.year || "N/A"}`,
          `Runtime: ${data.movie.runtime || "N/A"} min`,
          `Director: ${data.movie.director || "N/A"}`,
          `Genres: ${data.movie.genres?.join(", ") || "N/A"}`,
          `Poster: ${data.movie.poster_url ? "✓" : "✗"}`,
          `Thumbnail: ${data.movie.thumb_url ? "✓" : "✗"}`,
          `Rankings preserved ✓`,
        ],
      });

      // Clear form
      setDbId("");
      setTmdbId("");
    } catch (error: any) {
      setResult({
        type: "error",
        message: "Failed to fetch or update movie data",
        details: [error.message],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-unbounded font-semibold text-yellow-400 mb-2">
          Refresh Movie Metadata
        </h1>
        <p className="text-gray-400">
          Update incorrect movie information from TMDB without affecting your rankings.
        </p>
      </div>

      <div className="bg-gray-900/60 border border-yellow-500/20 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          How to Use
        </h2>
        <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
          <li>
            <strong>Find the Database ID:</strong> Open the movie page and look at
            the URL (e.g., <code className="text-yellow-300">/films/movie-slug/123</code> → ID is <code className="text-yellow-300">123</code>)
          </li>
          <li>
            <strong>Find the correct TMDB ID:</strong> Search on{" "}
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-400 hover:text-yellow-300"
            >
              themoviedb.org
            </a>{" "}
            and grab the ID from the URL
          </li>
          <li>
            <strong>Enter both IDs below</strong> and click refresh
          </li>
        </ol>
      </div>

      <form onSubmit={handleRefresh} className="bg-gray-900/60 border border-yellow-500/20 rounded-xl p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="dbId" className="block text-sm font-medium text-gray-200 mb-2">
              Database Movie ID (UUID or Integer)
            </label>
            <input
              type="text"
              id="dbId"
              value={dbId}
              onChange={(e) => setDbId(e.target.value)}
              placeholder="e.g., 04581dc3-1771-46f8-86f7-071fd660e2c1"
              className="w-full px-4 py-2 bg-gray-800/50 border border-yellow-500/20 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 font-mono text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="tmdbId" className="block text-sm font-medium text-gray-200 mb-2">
              Correct TMDB ID
            </label>
            <input
              type="text"
              id="tmdbId"
              value={tmdbId}
              onChange={(e) => setTmdbId(e.target.value)}
              placeholder="e.g., 550"
              className="w-full px-4 py-2 bg-gray-800/50 border border-yellow-500/20 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-gray-900 font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Refreshing..." : "Refresh Metadata"}
          </button>
        </div>
      </form>

      {/* Result Message */}
      {result && (
        <div
          className={`border rounded-xl p-6 ${
            result.type === "success"
              ? "bg-green-900/20 border-green-500/30"
              : result.type === "error"
              ? "bg-red-900/20 border-red-500/30"
              : "bg-blue-900/20 border-blue-500/30"
          }`}
        >
          <div className="flex items-start gap-3">
            {result.type === "success" && (
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
            )}
            {result.type === "error" && (
              <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            {result.type === "info" && (
              <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h3
                className={`font-semibold mb-2 ${
                  result.type === "success"
                    ? "text-green-300"
                    : result.type === "error"
                    ? "text-red-300"
                    : "text-blue-300"
                }`}
              >
                {result.message}
              </h3>
              {result.details && result.details.length > 0 && (
                <ul className="space-y-1 text-sm text-gray-300">
                  {result.details.map((detail, idx) => (
                    <li key={idx} className="font-mono">
                      {detail}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Warning Box */}
      <div className="mt-6 bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-300">
            <strong className="text-yellow-300">Note:</strong> This operation updates all
            metadata fields (title, year, overview, runtime, poster, etc.) but preserves your
            rankings and any user data associated with this movie.
          </div>
        </div>
      </div>
    </div>
  );
}

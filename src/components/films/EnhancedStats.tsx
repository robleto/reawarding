"use client";

import { TrendingUp, Users, Calendar, Globe, CheckCircle2, Clock } from "lucide-react";

interface EnhancedStatsProps {
  popularity?: number | null;
  voteCount?: number | null;
  status?: string | null;
  originalLanguage?: string | null;
  originalTitle?: string | null;
  title?: string;
  releaseDate?: string | null;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ru: "Russian",
  pt: "Portuguese",
  ar: "Arabic",
  hi: "Hindi",
  th: "Thai",
  sv: "Swedish",
  no: "Norwegian",
  da: "Danish",
  fi: "Finnish",
  nl: "Dutch",
  pl: "Polish",
  tr: "Turkish",
};

const STATUS_COLORS: Record<string, string> = {
  Released: "text-green-400 border-green-500/20 bg-green-900/20",
  "Post Production": "text-blue-400 border-blue-500/20 bg-blue-900/20",
  "In Production": "text-yellow-400 border-yellow-500/20 bg-yellow-900/20",
  Planned: "text-purple-400 border-purple-500/20 bg-purple-900/20",
  Rumored: "text-gray-400 border-gray-500/20 bg-gray-900/20",
  Canceled: "text-red-400 border-red-500/20 bg-red-900/20",
};

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

function getPopularityLevel(popularity: number): { label: string; color: string } {
  if (popularity >= 100) return { label: "Viral", color: "text-red-400" };
  if (popularity >= 50) return { label: "Very High", color: "text-orange-400" };
  if (popularity >= 20) return { label: "High", color: "text-yellow-400" };
  if (popularity >= 10) return { label: "Moderate", color: "text-green-400" };
  return { label: "Low", color: "text-gray-400" };
}

export default function EnhancedStats({
  popularity,
  voteCount,
  status,
  originalLanguage,
  originalTitle,
  title,
  releaseDate,
}: EnhancedStatsProps) {
  const hasStats = popularity || voteCount || status || originalLanguage || originalTitle;
  
  if (!hasStats) return null;

  const popularityLevel = popularity ? getPopularityLevel(popularity) : null;
  const languageName = originalLanguage ? LANGUAGE_NAMES[originalLanguage] || originalLanguage.toUpperCase() : null;
  const isDifferentTitle = originalTitle && title && originalTitle !== title;
  const statusColor = status ? STATUS_COLORS[status] || STATUS_COLORS.Released : null;

  return (
    <div className="p-6 rounded-lg bg-gray-900/40 border border-yellow-500/10">
      <h3 className="text-xl font-unbounded font-semibold text-yellow-400 mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5" />
        Audience & Release Stats
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Popularity Score */}
        {popularity && (
          <div className="p-4 rounded-lg bg-gray-800/40 border border-yellow-500/10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-400">TMDB Popularity</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-100">{popularity.toFixed(1)}</span>
              {popularityLevel && (
                <span className={`text-sm font-semibold ${popularityLevel.color}`}>
                  {popularityLevel.label}
                </span>
              )}
            </div>
            <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400"
                style={{ width: `${Math.min((popularity / 100) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Vote Count */}
        {voteCount && voteCount > 0 && (
          <div className="p-4 rounded-lg bg-gray-800/40 border border-yellow-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-400">User Ratings</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-100">{formatNumber(voteCount)}</span>
              <span className="text-sm text-gray-500">votes</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {voteCount >= 10000 ? "Widely rated" : voteCount >= 1000 ? "Well rated" : "Growing audience"}
            </p>
          </div>
        )}

        {/* Release Status */}
        {status && (
          <div className="p-4 rounded-lg bg-gray-800/40 border border-yellow-500/10">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-400">Status</span>
            </div>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusColor || STATUS_COLORS.Released}`}>
              <span className="text-sm font-semibold">{status}</span>
            </div>
            {releaseDate && status === "Released" && (
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(releaseDate).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            )}
          </div>
        )}

        {/* Original Language */}
        {languageName && (
          <div className="p-4 rounded-lg bg-gray-800/40 border border-yellow-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-400">Original Language</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-gray-100">{languageName}</span>
              <span className="text-sm text-gray-500 uppercase">({originalLanguage})</span>
            </div>
          </div>
        )}

        {/* Original Title (if different) */}
        {isDifferentTitle && (
          <div className="p-4 rounded-lg bg-gray-800/40 border border-yellow-500/10 sm:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-400">Original Title</span>
            </div>
            <p className="text-lg font-semibold text-gray-100 italic">{originalTitle}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// BarChart3 icon component (if not already imported)
function BarChart3({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
}

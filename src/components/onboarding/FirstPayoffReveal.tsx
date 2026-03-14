"use client";

import Image from "next/image";
import { Trophy, ArrowRight, Film, Plus } from "lucide-react";
import type { Movie } from "@/types/types";

interface FirstPayoffRevealProps {
  year: number;
  topMovies: Movie[];
  totalRated: number;
  onAddMoreFilms: () => void;
  onDismiss: () => void;
}

export default function FirstPayoffReveal({
  year,
  topMovies,
  totalRated,
  onAddMoreFilms,
  onDismiss,
}: FirstPayoffRevealProps) {
  const leader = topMovies[0];
  const runnerUps = topMovies.slice(1, 4);

  if (!leader) return null;

  const leaderPoster =
    leader.cached_poster_url ||
    leader.poster_url ||
    leader.cached_thumb_url ||
    leader.thumb_url ||
    "";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onDismiss}
      />

      <div className="relative z-10 w-full max-w-lg mx-4">
        <div className="rounded-2xl border border-yellow-500/20 bg-gray-950/95 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 mb-4">
              <Trophy className="h-3.5 w-3.5 text-yellow-400" />
              <span className="text-xs font-medium text-yellow-300 uppercase tracking-wider">
                Your {year} Race
              </span>
            </div>
            <h2 className="font-unbounded text-2xl font-bold text-white">
              Your {year} race is beginning to take shape
            </h2>
          </div>

          {/* Leader */}
          <div className="flex items-start gap-4 rounded-xl bg-gray-900/60 border border-gray-700/30 p-4 mb-4">
            <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-800 shadow-lg">
              {leaderPoster ? (
                <Image
                  src={leaderPoster}
                  alt={leader.title}
                  fill
                  className="object-cover"
                  sizes="64px"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Film className="h-5 w-5 text-gray-600" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-yellow-400/80 uppercase tracking-wider mb-1">
                Current Best Picture Leader
              </p>
              <p className="text-lg font-semibold text-white truncate">
                {leader.title}
              </p>
              {leader.rankings?.[0]?.ranking && (
                <p className="text-sm text-gray-400 mt-1">
                  Your rating: {leader.rankings[0].ranking}/10
                </p>
              )}
            </div>
          </div>

          {/* Runner-ups */}
          {runnerUps.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Early Contenders
              </p>
              <div className="flex gap-2">
                {runnerUps.map((movie) => {
                  const poster =
                    movie.cached_thumb_url ||
                    movie.thumb_url ||
                    movie.cached_poster_url ||
                    movie.poster_url ||
                    "";
                  return (
                    <div key={movie.id} className="flex items-center gap-2 flex-1 rounded-lg bg-gray-900/40 border border-gray-700/20 px-3 py-2">
                      <div className="relative h-10 w-7 flex-shrink-0 overflow-hidden rounded bg-gray-800">
                        {poster ? (
                          <Image
                            src={poster}
                            alt={movie.title}
                            fill
                            className="object-cover"
                            sizes="28px"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Film className="h-3 w-3 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-300 truncate">{movie.title}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Explanation */}
          <div className="rounded-lg bg-gray-800/40 border border-gray-700/20 px-4 py-3 mb-6">
            <p className="text-sm text-gray-400 leading-relaxed">
              These are early results based on the{" "}
              <span className="text-gray-300 font-medium">{totalRated} films</span>{" "}
              you rated so far. Add more films or settle close calls to make the year stronger.
            </p>
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onAddMoreFilms}
              className="flex items-center justify-center gap-2 rounded-xl bg-yellow-500/15 border border-yellow-500/25 px-5 py-3 text-sm font-medium text-yellow-300 hover:bg-yellow-500/25 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add more films to {year}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors py-2"
            >
              I&rsquo;ll explore on my own
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import * as LucideIcons from "lucide-react";
import type { FilmCollection as DataFilmCollection } from "@/data/filmCollections";

interface DbFilmCollection {
  slug: string;
  title: string;
  description: string | null;
  icon: string;
  color?: string;
  category: string;
  featured: boolean;
  movie_count?: number;
}

type FilmCollection = DataFilmCollection | DbFilmCollection;

interface CollectionCardProps {
  collection: FilmCollection;
  movieCount?: number;
}

export default function CollectionCard({ collection, movieCount }: CollectionCardProps) {
  const colorClasses = {
    gold: 'from-yellow-500/20 to-amber-600/20 border-yellow-500/30 hover:border-yellow-400/50',
    blue: 'from-blue-500/20 to-cyan-600/20 border-blue-500/30 hover:border-blue-400/50',
    purple: 'from-purple-500/20 to-violet-600/20 border-purple-500/30 hover:border-purple-400/50',
    yellow: 'from-yellow-400/20 to-yellow-600/20 border-yellow-400/30 hover:border-yellow-300/50',
    red: 'from-red-500/20 to-rose-600/20 border-red-500/30 hover:border-red-400/50',
    amber: 'from-amber-500/20 to-orange-600/20 border-amber-500/30 hover:border-amber-400/50',
    green: 'from-green-500/20 to-emerald-600/20 border-green-500/30 hover:border-green-400/50',
    emerald: 'from-emerald-500/20 to-green-600/20 border-emerald-500/30 hover:border-emerald-400/50',
    teal: 'from-teal-500/20 to-cyan-600/20 border-teal-500/30 hover:border-teal-400/50',
    cyan: 'from-cyan-500/20 to-blue-600/20 border-cyan-500/30 hover:border-cyan-400/50',
    indigo: 'from-indigo-500/20 to-blue-600/20 border-indigo-500/30 hover:border-indigo-400/50',
    violet: 'from-violet-500/20 to-purple-600/20 border-violet-500/30 hover:border-violet-400/50',
    pink: 'from-pink-500/20 to-rose-600/20 border-pink-500/30 hover:border-pink-400/50',
    rose: 'from-rose-500/20 to-red-600/20 border-rose-500/30 hover:border-rose-400/50',
    slate: 'from-slate-500/20 to-gray-600/20 border-slate-500/30 hover:border-slate-400/50',
    gray: 'from-gray-500/20 to-slate-600/20 border-gray-500/30 hover:border-gray-400/50',
    orange: 'from-orange-500/20 to-amber-600/20 border-orange-500/30 hover:border-orange-400/50',
    sky: 'from-sky-500/20 to-blue-600/20 border-sky-500/30 hover:border-sky-400/50',
  };

  const gradientClass = colorClasses[(collection.color || 'gold') as keyof typeof colorClasses] || colorClasses.gold;

  // Get the Lucide icon component dynamically
  const IconComponent = (LucideIcons as any)[collection.icon] || LucideIcons.Film;

  return (
    <Link href={`/films/collections/${collection.slug}`}>
      <div className="dark-glass group rounded-xl shadow-md h-[200px] flex flex-col overflow-hidden transition-all duration-200 hover:shadow-lg">
        <div className="p-5 flex-1 flex flex-col">
          {/* Icon and Title Row */}
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-shrink-0">
              <IconComponent className="w-8 h-8 text-yellow-400" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white line-clamp-2 group-hover:text-yellow-300 transition-colors">
                {collection.title}
              </h3>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-400 leading-relaxed line-clamp-3 flex-1">
            {collection.description}
          </p>

          {/* Footer with count */}
          {movieCount !== undefined && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700/50">
              <span className="text-xs text-gray-500 font-medium">{movieCount} films</span>
              <svg className="w-4 h-4 text-gray-500 group-hover:text-yellow-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

"use client";

import Link from "next/link";
import * as LucideIcons from "lucide-react";

interface FilmCollection {
  slug: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  category: string;
  featured: boolean;
  movie_count?: number;
}

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

  const gradientClass = colorClasses[collection.color as keyof typeof colorClasses] || colorClasses.gold;

  // Get the Lucide icon component dynamically
  const IconComponent = (LucideIcons as any)[collection.icon] || LucideIcons.Film;

  return (
    <Link href={`/films/collections/${collection.slug}`}>
      <div className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradientClass} backdrop-blur-sm border transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl h-full flex flex-col`}>
        <div className="p-6 flex-1 flex flex-col">
          {/* Icon */}
          <div className="mb-4 transform group-hover:scale-110 transition-transform duration-300">
            <IconComponent className="w-12 h-12 text-white/90" strokeWidth={1.5} />
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-white mb-2 font-unbounded">
            {collection.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-300 leading-relaxed mb-4 line-clamp-2 flex-1">
            {collection.description}
          </p>

          {/* Movie count */}
          {movieCount !== undefined && (
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-auto">
              <span className="font-medium">{movieCount} films</span>
            </div>
          )}
        </div>

        {/* Shine effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </div>
      </div>
    </Link>
  );
}

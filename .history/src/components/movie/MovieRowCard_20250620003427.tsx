'use client';

import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import { getRatingStyle } from '@/utils/getRatingStyle';
import type { Movie } from '@/types/types'; // adjust import if needed

type Props = {
  movie: Movie;
  currentUserId: string;
  onUpdate: (movieId: number, updates: { seen_it?: boolean; ranking?: number }) => void;
};

export default function MovieRowCard({ movie, currentUserId, onUpdate }: Props) {
  const ranking = movie.rankings[0] ?? {
    id: crypto.randomUUID(),
    user_id: currentUserId,
    seen_it: false,
    ranking: 0,
  };

  const style = getRatingStyle(ranking.ranking ?? 0);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b hover:bg-gray-50">
      {/* Poster */}
      <Image
        src={movie.thumb_url_url}
        alt={movie.title}
        width={60}
        height={90}
        className="rounded shadow"
        unoptimized
      />

      {/* Details */}
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900">{movie.title}</h3>
        <div className="text-sm text-gray-600">{movie.release_year}</div>
      </div>

      {/* Seen It */}
      <button
        onClick={() => onUpdate(movie.id, { seen_it: !ranking.seen_it })}
        className="flex items-center gap-1 text-sm font-medium"
      >
        {ranking.seen_it ? (
          <>
            <Eye className="w-4 h-4 text-blue-600" />
            <span className="text-blue-600">Watched</span>
          </>
        ) : (
          <>
            <EyeOff className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400">Unseen</span>
          </>
        )}
      </button>

      {/* Ranking Dropdown */}
      <div className="relative">
        <select
          value={ranking.ranking ?? ''}
          onChange={(e) =>
            onUpdate(movie.id, { ranking: parseInt(e.target.value) })
          }
          className="px-2 py-1 text-sm font-bold rounded shadow-sm"
          style={{ backgroundColor: style.background, color: style.text }}
        >
          <option value="">–</option>
          {Array.from({ length: 10 }, (_, i) => 10 - i).map((num) => {
            const optStyle = getRatingStyle(num);
            return (
              <option
                key={num}
                value={num}
                style={{ backgroundColor: optStyle.background, color: optStyle.text }}
              >
                {num}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}

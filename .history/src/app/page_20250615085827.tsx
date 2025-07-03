// app/rankings/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { fetchRankings } from '@/utils/fetchRankings';

export default function RankingsPage() {
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRankings()
      .then((data) => setMovies(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Movie Rankings</h1>
      <table className="min-w-full border border-collapse border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Seen</th>
            <th className="p-2 border">Rank</th>
            <th className="p-2 border">Thumb</th>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Year</th>
            <th className="p-2 border">Studio</th>
            <th className="p-2 border">Rating</th>
            <th className="p-2 border">Genre</th>
          </tr>
        </thead>
        <tbody>
          {movies.map((movie) => (
            <tr key={movie.id} className="border-t">
              <td className="p-2 text-center border">{movie.seen_it ? '✅' : ''}</td>
              <td className="p-2 border">
                <Image
                  src={movie.thumb_url}
                  alt={movie.title}
                  width={64}
                  height={96}
                  className="w-16"
                  unoptimized
                />
              </td>
              <td className="p-2 border">
								<Image 
									src={movie.thumb_url} alt={movie.title} className="w-16" /></td>
              <td className="p-2 border">{movie.title}</td>
              <td className="p-2 border">{movie.year}</td>
              <td className="p-2 border">{movie.studio}</td>
              <td className="p-2 border">{movie.rating}</td>
              <td className="p-2 border">{movie.genre}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

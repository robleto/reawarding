"use client";

import Link from 'next/link';
import { useMemo } from 'react';
import { useMovieDataWithGuest } from '@/utils/sharedMovieUtils';
import { normalizeImageUrl } from '@/utils/imageUrl';

type GuestSuggestion = {
  director: string;
  seen_count: number;
  movies: Array<{
    id: string;
    title: string;
    release_year: number | null;
    poster_url: string | null;
    ranking: number | null;
    seen_it: boolean;
  }>;
};

export default function GuestSuggestions() {
  const { movies, loading, hasMounted } = useMovieDataWithGuest();

  const suggestions = useMemo<GuestSuggestion[]>(() => {
    if (!hasMounted || loading) return [];
    const seen = movies.filter((m) => m.rankings?.[0]?.seen_it && !!(m as any).director);
    const byDirector = new Map<string, typeof seen>();
    for (const m of seen) {
      const dir = (m as any).director as string | null;
      if (!dir) continue;
      if (!byDirector.has(dir)) byDirector.set(dir, []);
      byDirector.get(dir)!.push(m);
    }
    const entries = [...byDirector.entries()]
      .map(([director, arr]) => ({ director, arr }))
      .filter((e) => e.arr.length >= 10)
      .sort((a, b) => b.arr.length - a.arr.length)
      .slice(0, 12);

    return entries.map(({ director, arr }) => ({
      director,
      seen_count: arr.length,
      movies: arr
        .map((m) => ({
          id: m.id,
          title: m.title,
          release_year: m.release_year ?? null,
          poster_url: (m.poster_url as string | null),
          ranking: m.rankings?.[0]?.ranking ?? null,
          seen_it: !!m.rankings?.[0]?.seen_it,
        }))
        .sort((a, b) => (b.ranking ?? 0) - (a.ranking ?? 0)),
    }));
  }, [movies, loading, hasMounted]);

  if (!hasMounted) return null;

  if (loading) {
    return (
      <div className="bg-charcoal-900/60 border border-gold-500/20 rounded-lg p-6">
        <p className="text-gray-300">Loading suggestions…</p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="bg-charcoal-900/60 border border-gold-500/20 rounded-lg p-6">
        <p className="text-gray-300">Mark at least 10 movies by a director as seen to unlock ready-made lists.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-unbounded font-semibold">Your Ready‑Made Lists (Guest)</h2>
          <p className="text-gray-400">Based on your guest rankings. Sign in to save.</p>
        </div>
        <Link href="/login" className="px-3 py-2 bg-gold-500 text-black rounded hover:bg-gold-400">Sign in to Save</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {suggestions.map((s) => (
          <div key={s.director} className="bg-charcoal-900/60 border border-gold-500/20 rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{s.director}: {s.seen_count} You’ve Seen</h3>
                <p className="text-sm text-gray-400">Auto-generated from your guest data</p>
              </div>
              <Link href="/login" className="px-3 py-2 bg-gold-500 text-black rounded hover:bg-gold-400">Save</Link>
            </div>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
              {s.movies.slice(0, 12).map((m) => (
                <div key={m.id} className="w-28 shrink-0">
                  <div className="aspect-[2/3] rounded bg-gray-800 overflow-hidden border border-gray-800">
                    {m.poster_url ? (
                      <img src={normalizeImageUrl(m.poster_url)} alt={m.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No Image</div>
                    )}
                  </div>
                  <div className="mt-1 text-xs line-clamp-2">{m.title}</div>
                  <div className="text-[10px] text-gray-500">{m.release_year ?? ''}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

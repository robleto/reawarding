"use client";

import Image from "next/image";
import { useState } from "react";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import type { Movie } from "@/types/types";
import { normalizeImageUrl } from "@/utils/imageUrl";

export type ReadyMadeMovie = {
  id: number;
  title: string;
  release_year: number | null;
  poster_url: string | null;
  ranking?: number | null;
};

export default function ReadyMadeDetailClient({ movies }: { movies: ReadyMadeMovie[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Movie | null>(null);
  const [selectedInitialRanking, setSelectedInitialRanking] = useState<number | null>(null);

  const openModal = (m: ReadyMadeMovie) => {
    const movie: Movie = {
      id: m.id,
      title: m.title,
      release_year: (m.release_year ?? 0) as number,
      poster_url: (m.poster_url ?? "") as string,
      thumb_url: "",
      created_at: "",
      rankings: [
        {
          user_id: "",
          seen_it: true,
          ranking: m.ranking ?? null,
        },
      ],
    } as Movie;
    setSelected(movie);
    setSelectedInitialRanking(m.ranking ?? null);
    setOpen(true);
  };

  const handleUpdate = (_movieId: number, _newRanking: number | null, _newSeenIt: boolean) => {
    // No-op; MovieDetailModal already persists via Supabase. In future, refresh server data.
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {movies.map((m, idx) => (
          <button
            key={m.id}
            type="button"
            onClick={() => openModal(m)}
            className="p-2 text-left border rounded bg-charcoal-900/60 border-gold-500/20 hover:border-gold-500/40 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
          >
            <div className="relative aspect-[2/3] rounded overflow-hidden border border-gray-800 bg-gray-800">
              <div className="absolute z-10 px-3 py-2 text-lg font-bold text-white border rounded-md shadow-sm top-2 left-2 bg-charcoal-900/80 border-gray-300/50 font-unbounded backdrop-blur-sm">
                {idx + 1}
              </div>
              {m.poster_url ? (
                <Image src={normalizeImageUrl(m.poster_url)} alt={m.title} width={400} height={600} className="object-cover w-full h-full" />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-xs text-gray-600">No Image</div>
              )}
            </div>
            <div className="mt-2 text-sm font-medium line-clamp-2">{m.title}</div>
            <div className="text-xs text-gray-500">{m.release_year ?? ""}</div>
          </button>
        ))}
      </div>

      {selected && (
        <MovieDetailModal
          movie={selected}
          isOpen={open}
          onClose={() => setOpen(false)}
          onUpdate={handleUpdate}
          initialRanking={selectedInitialRanking}
          initialSeenIt={true}
        />
      )}
    </>
  );
}

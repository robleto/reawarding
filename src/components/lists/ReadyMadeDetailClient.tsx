"use client";

import { useState } from "react";
import MovieCard from "@/components/award/MovieCard";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import type { Movie } from "@/types/types";

export type ReadyMadeMovie = {
  id: string;
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

  const handleUpdate = (_movieId: string, _newRanking: number | null, _newSeenIt: boolean) => {
    // No-op; MovieDetailModal already persists via Supabase. In future, refresh server data.
  };

  return (
    <>
      {/* Same row anatomy as the classic list-detail page's default (list)
          view mode (src/components/list/DraggableMovieCard.tsx's list
          branch → MovieCard variant="compact") — rank 10 down to 1, no
          drag handle/remove button since this isn't an editable saved
          list yet, just a preview. */}
      <div className="space-y-2">
        {movies.map((m, idx) => (
          <MovieCard
            key={m.id}
            movie={{
              id: m.id,
              title: m.title,
              release_year: m.release_year,
              poster_url: m.poster_url,
              thumb_url: null,
              created_at: "",
              rankings: [],
            } as unknown as Movie}
            variant="compact"
            rank={idx + 1}
            ranking={m.ranking ?? null}
            seenIt={true}
            showYear
            onClick={() => openModal(m)}
          />
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

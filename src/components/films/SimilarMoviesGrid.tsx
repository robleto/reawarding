import PosterThumb from "@/components/movie/PosterThumb";
import HorizontalScroller from "@/components/ui/HorizontalScroller";

type SimilarItem = {
  id: number | string;
  title: string;
  thumb_url?: string | null;
  poster_url?: string | null;
};

interface SimilarMoviesGridProps {
  items: SimilarItem[];
}

export default function SimilarMoviesGrid({ items }: SimilarMoviesGridProps) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <HorizontalScroller>
      {items.map((m) => (
        <div key={m.id} className="flex-shrink-0 w-[140px] sm:w-[160px] snap-start">
          <PosterThumb id={m.id} title={m.title} imageUrl={m.poster_url || null} />
        </div>
      ))}
    </HorizontalScroller>
  );
}

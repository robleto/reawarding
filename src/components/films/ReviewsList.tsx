import Image from "next/image";
import { Star } from "lucide-react";
import type { TMDBReview } from "@/types/types";

interface ReviewsListProps {
  reviews: TMDBReview[];
  max?: number;
}

function Stars({ rating = 0 }: { rating?: number }) {
  // TMDB ratings often 0-10; display out of 5 stars
  const outOfFive = Math.round((Number(rating) || 0) / 2);
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= outOfFive ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
      ))}
    </div>
  );
}

export default function ReviewsList({ reviews, max = 3 }: ReviewsListProps) {
  if (!Array.isArray(reviews) || reviews.length === 0) return null;
  const display = reviews.slice(0, max);

  return (
    <div className="space-y-4">
      {display.map((r) => {
        const rating = r.author_details?.rating;
        const avatarPath = r.author_details?.avatar_path;
        const avatar = avatarPath
          ? (avatarPath.startsWith('/https') ? avatarPath.slice(1) : `https://image.tmdb.org/t/p/w45${avatarPath}`)
          : null;
        return (
          <div key={r.id} className="p-4 rounded-lg bg-gray-900/40 border border-yellow-500/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 flex-shrink-0">
                {avatar ? (
                  <Image src={avatar} alt={r.author} width={40} height={40} unoptimized />
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="text-sm text-gray-300 font-medium">{r.author}</div>
                  {typeof rating === 'number' && <Stars rating={rating} />}
                </div>
                <p className="text-gray-200 text-sm leading-relaxed line-clamp-6">
                  {r.content}
                </p>
                <div className="text-xs text-gray-500 mt-2">
                  {new Date(r.created_at).toLocaleDateString()}
                  {r.url && (
                    <>
                      {' · '}<a className="text-yellow-400 hover:text-yellow-300" href={r.url} target="_blank" rel="noopener noreferrer">Read more</a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

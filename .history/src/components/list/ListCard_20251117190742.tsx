import Link from "next/link";
import Image from "next/image";
import { normalizeImageUrl } from "@/utils/imageUrl";

type MovieList = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  updated_at: string;
  movie_count?: number;
  posterUrls?: string[];
};

interface ListCardProps {
  list: MovieList;
  readOnly?: boolean;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
  return `${Math.floor(diffInDays / 365)} years ago`;
}

function getUpdatedNumberAndLabel(dateString: string): { num: number; label: string } {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return { num: 0, label: "today" };
  if (diffInDays === 1) return { num: 1, label: "day ago" };
  if (diffInDays < 7) return { num: diffInDays, label: "days ago" };
  if (diffInDays < 30) return { num: Math.floor(diffInDays / 7), label: "weeks ago" };
  if (diffInDays < 365) return { num: Math.floor(diffInDays / 30), label: "months ago" };
  return { num: Math.floor(diffInDays / 365), label: "years ago" };
}

const ListCard = ({ list, readOnly }: ListCardProps) => {
  const lastModified = formatRelativeTime(list.updated_at);
  const { num: updatedNum, label: updatedLabel } = getUpdatedNumberAndLabel(list.updated_at);
  const posterUrls = (list.posterUrls || []).filter((u) => typeof u === 'string' && u.trim().length > 0);

  return (
    <Link href={`/lists/${list.id}`} tabIndex={readOnly ? -1 : 0} aria-disabled={readOnly}>
    <div className={`light-glass dark:dark-glass group ${readOnly ? 'opacity-80 pointer-events-none' : ''} relative rounded-xl shadow-md h-[320px] flex flex-col overflow-visible transition-transform duration-200 hover:-translate-y-0.5 ring-0 hover:ring-1 hover:ring-yellow-500/20 hover:border-yellow-500/30 hover:shadow-lg`}>
      {/* Gold sheen sweep on hover */}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 group-hover:animate-gold-sheen sheen-gradient z-10" />
        {/* Fan of posters (pop above card) */}
        {posterUrls.length > 0 && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-24 w-[180px] flex items-center justify-center pointer-events-none select-none z-20 transition-transform duration-200 group-hover:scale-105">
            {/* Soft radial highlight behind the fan */}
            <span aria-hidden className="absolute -top-1 left-1/2 -translate-x-1/2 w-[220px] h-[100px] rounded-full blur-md opacity-30 bg-[radial-gradient(ellipse_at_center,_rgba(234,179,8,0.25),_transparent_60%)]" />
            {posterUrls.map((url: string, i: number) => (
              <div
                key={i}
                className={`absolute w-16 h-24 rounded-xl shadow-lg border-2 border-gray-800 overflow-hidden transition-transform duration-200 ease-out ${(() => {
                  const centerIndex = Math.round((posterUrls.length - 1) / 2);
                  return i === centerIndex ? 'group-hover:scale-105 group-hover:-translate-y-0.5 filter group-hover:brightness-110' : '';
                })()}`}
                style={{
                  left: `calc(50% + ${(i - (posterUrls.length - 1) / 2) * 32}px - 32px)`,
                  zIndex: posterUrls.length - i,
                  transform: `rotate(${(i - 2) * 7}deg)`
                }}
              >
                {(() => {
                  const src = normalizeImageUrl(url);
                  return src ? (
                    <Image
                      src={src}
                      alt="Movie poster"
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 64px, 64px"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200" />
                  );
                })()}
              </div>
            ))}
          </div>
        )}
        <div className="p-6 pt-20 pb-6 flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mt-8 mb-2">
            <h3 className="text-lg font-semibold text-white line-clamp-2 group-hover:text-blue-400 transition-colors">
              {list.name}
            </h3>
            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
              {list.is_public ? (
                <div className="flex items-center text-green-400 bg-green-900/30 px-2.5 py-1 rounded-full text-xs font-medium">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path
                      fillRule="evenodd"
                      d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Public
                </div>
              ) : (
                <div className="flex items-center text-gray-400 bg-gray-700/50 px-2.5 py-1 rounded-full text-xs font-medium">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Private
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {list.description && (
            <p className="text-sm text-gray-300 mb-4 line-clamp-2 leading-relaxed">
              {list.description}
            </p>
          )}

          {/* Stats */}
          <div className="mt-auto pt-2 border-t border-gray-600/50">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-gray-500 mb-1">
              <span>Movies</span>
              <span>Updated</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-300">
              <div className="flex items-center font-semibold">
                <svg className="w-4 h-4 mr-1.5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                {list.movie_count ?? 0}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-semibold text-gray-200">{updatedNum}</span>
                <span className="text-xs text-gray-400">{updatedLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ListCard;

import Link from "next/link";

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

const ListCard = ({ list, readOnly }: ListCardProps) => {
  const lastModified = formatRelativeTime(list.updated_at);
  const posterUrls = list.posterUrls || [];

  return (
    <Link href={`/lists/${list.id}`} tabIndex={readOnly ? -1 : 0} aria-disabled={readOnly}>
      <div className={`border border-[#232326]/80 bg-[#1c1c1e]/60 hover:bg-[#232326]/90 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group ${readOnly ? 'opacity-80 pointer-events-none' : ''}`}>
        {/* Fan of posters */}
        {posterUrls.length > 0 && (
          <div className="flex items-center justify-center -mt-4 mb-2 h-28 relative overflow-visible z-20">
            {posterUrls.map((url: string, i: number) => (
              <img
                key={i}
                src={url}
                alt="Movie poster"
                className="w-16 h-24 object-cover rounded-xl shadow-lg border-2 border-gray-800 absolute"
                style={{
                  left: `calc(50% + ${(i - (posterUrls.length - 1) / 2) * 32}px - 32px)`,
                  zIndex: posterUrls.length - i,
                  transform: `rotate(${(i - 2) * 7}deg)`
                }}
              />
            ))}
          </div>
        )}
        <div className="p-6 pt-2">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
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
          <div className="flex items-center justify-between text-sm text-gray-400 pt-2 border-t border-gray-600/50">
            <div className="flex items-center font-medium">
              <svg className="w-4 h-4 mr-1.5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              {list.movie_count} {list.movie_count === 1 ? "movie" : "movies"}
            </div>
            <span className="text-xs">Updated {lastModified}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ListCard;

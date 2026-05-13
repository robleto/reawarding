export default function MovieListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700 animate-pulse">
          <div className="w-20 h-28 bg-gray-700 rounded flex-shrink-0" />
          <div className="flex-1">
            <div className="h-5 bg-gray-700 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-700 rounded w-1/2 mb-2" />
            <div className="h-4 bg-gray-700 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

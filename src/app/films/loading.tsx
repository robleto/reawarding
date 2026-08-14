import MovieGridSkeleton from "@/components/ui/MovieGridSkeleton";

// Films tab fallback (docs/IPHONE_FEEL_AUDIT.md item 3) — header, year
// timeline, then the poster grid the page resolves into.
export default function Loading() {
  return (
    <div className="max-w-screen-xl py-6" aria-busy="true" aria-label="Loading films">
      <div className="animate-pulse">
        <div className="h-9 w-36 rounded bg-gray-700/70 mb-6" />
        <div className="flex gap-2 overflow-hidden mb-8">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-8 w-12 flex-shrink-0 rounded-md bg-gray-800/60" />
          ))}
        </div>
      </div>
      <MovieGridSkeleton count={12} />
    </div>
  );
}

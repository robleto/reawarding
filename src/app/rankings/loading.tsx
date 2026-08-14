import MovieGridSkeleton from "@/components/ui/MovieGridSkeleton";

// Rankings tab fallback (docs/IPHONE_FEEL_AUDIT.md item 3) — the page's
// poster grid uses the same column recipe as MovieGridSkeleton.
export default function Loading() {
  return (
    <div className="max-w-screen-xl py-6" aria-busy="true" aria-label="Loading rankings">
      <div className="animate-pulse">
        <div className="h-9 w-44 rounded bg-gray-700/70 mb-6" />
      </div>
      <MovieGridSkeleton count={16} />
    </div>
  );
}

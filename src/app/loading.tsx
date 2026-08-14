// Root route fallback (docs/IPHONE_FEEL_AUDIT.md item 3): paints instantly on
// navigation so a tab tap never freezes on the outgoing view. Echoes Home's
// showcase structure (search → year timeline → ballot archive) in dim canvas
// ghosts; deeper segments with their own loading.tsx override this one.
export default function Loading() {
  return (
    <div className="max-w-screen-xl py-6 animate-pulse" aria-busy="true" aria-label="Loading">
      {/* Search bar */}
      <div className="h-12 w-full max-w-xl rounded-xl bg-gray-800/60 border border-gray-700/40 mb-6" />

      {/* Year timeline chips */}
      <div className="flex gap-2 overflow-hidden mb-8">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-8 w-12 flex-shrink-0 rounded-md bg-gray-800/60" />
        ))}
      </div>

      {/* Two ballot-year sections */}
      {Array.from({ length: 2 }).map((_, s) => (
        <div
          key={s}
          className="rounded-xl border border-gray-700/40 bg-gray-800/30 p-4 mb-6"
        >
          <div className="h-7 w-40 rounded bg-gray-700/70 mb-4" />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-lg bg-gray-700/70" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Lists tab fallback (docs/IPHONE_FEEL_AUDIT.md item 3) — the lists world is
// horizontally scrolling rows, so ghost three row headers + poster strips.
export default function Loading() {
  return (
    <div className="max-w-screen-xl py-6 animate-pulse" aria-busy="true" aria-label="Loading lists">
      {Array.from({ length: 3 }).map((_, row) => (
        <div key={row} className="mb-8">
          <div className="h-7 w-48 rounded bg-gray-700/70 mb-4" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="w-32 flex-shrink-0"
              >
                <div className="aspect-[2/3] rounded-lg bg-gray-700/70" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

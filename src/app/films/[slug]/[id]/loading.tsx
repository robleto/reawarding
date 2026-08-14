// Film detail fallback (docs/IPHONE_FEEL_AUDIT.md item 3) — mirrors the
// page's poster-left / info-right grid so the layout holds while the server
// component fetches. Column recipe matches page.tsx.
export default function Loading() {
  return (
    <div className="max-w-screen-xl py-6 animate-pulse" aria-busy="true" aria-label="Loading film">
      <div className="grid grid-cols-1 md:grid-cols-[280px,1fr] lg:grid-cols-[350px,1fr] gap-6 lg:gap-8 mb-8">
        {/* Poster */}
        <div className="self-start rounded-xl overflow-hidden border border-gray-700/40 bg-gray-900/60 max-w-xl md:max-w-none mx-auto md:mx-0 w-full">
          <div className="aspect-[2/3] bg-gray-800/70" />
        </div>

        {/* Title + meta + blurb */}
        <div className="min-w-0">
          <div className="h-10 w-3/4 rounded bg-gray-700/70 mb-4" />
          <div className="h-5 w-1/3 rounded bg-gray-800/70 mb-6" />
          <div className="space-y-2 mb-8">
            <div className="h-4 w-full rounded bg-gray-800/70" />
            <div className="h-4 w-11/12 rounded bg-gray-800/70" />
            <div className="h-4 w-2/3 rounded bg-gray-800/70" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-28 rounded-lg bg-gray-800/70" />
            <div className="h-10 w-28 rounded-lg bg-gray-800/70" />
          </div>
        </div>
      </div>

      {/* Lower two-column blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-40 rounded-xl border border-gray-700/40 bg-gray-800/30" />
        <div className="h-40 rounded-xl border border-gray-700/40 bg-gray-800/30" />
      </div>
    </div>
  );
}

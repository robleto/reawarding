import type { AlternativeTitle } from "@/types/types";

interface AlternativeTitlesProps {
  titles: AlternativeTitle[];
  max?: number;
}

export default function AlternativeTitles({ titles, max = 10 }: AlternativeTitlesProps) {
  if (!Array.isArray(titles) || titles.length === 0) return null;
  const display = titles.slice(0, max);

  return (
    <div className="p-6 rounded-lg bg-gray-900/40 border border-yellow-500/10">
      <h3 className="text-lg font-unbounded font-semibold text-yellow-400 mb-3">Also Known As</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {display.map((t, idx) => (
          <div key={`${t.title}-${idx}`} className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-gray-800/50 border border-yellow-500/10">
            <div className="text-gray-200 truncate" title={t.title}>{t.title}</div>
            <div className="text-xs text-gray-500 whitespace-nowrap">{t.iso_3166_1}{t.type ? ` · ${t.type}` : ''}</div>
          </div>
        ))}
      </div>
      {titles.length > display.length && (
        <div className="text-xs text-gray-500 mt-2">+{titles.length - display.length} more</div>
      )}
    </div>
  );
}

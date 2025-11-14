import Image from "next/image";
import { Play } from "lucide-react";
import type { WatchProvider } from "@/types/types";

type RegionProviders = {
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
};

interface WatchProvidersProps {
  providersByRegion?: Record<string, RegionProviders> | null;
  preferredRegion?: string; // e.g., 'US'
}

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/";

function ProviderPill({ p }: { p: WatchProvider }) {
  const logo = p.logo_path ? `${TMDB_IMAGE_BASE}w45${p.logo_path}` : null;
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-800/60 border border-yellow-500/10">
      {logo ? (
        // next/image with unoptimized because remotePatterns may not include TMDB in some envs
        <Image src={logo} alt={p.provider_name} width={20} height={20} className="rounded" unoptimized />
      ) : (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-700 text-[10px]">
          <Play className="w-3 h-3 text-gray-300" />
        </span>
      )}
      <span className="text-sm text-gray-200">{p.provider_name}</span>
    </div>
  );
}

export default function WatchProviders({ providersByRegion, preferredRegion = "US" }: WatchProvidersProps) {
  if (!providersByRegion || typeof providersByRegion !== "object") return null;

  // Pick preferred region if available, else first region with any data
  const regionKeys = Object.keys(providersByRegion);
  if (regionKeys.length === 0) return null;
  const region = providersByRegion[preferredRegion] || providersByRegion[regionKeys[0]];
  if (!region) return null;

  const sections: Array<{ label: string; key: keyof RegionProviders }> = [
    { label: "Streaming", key: "flatrate" },
    { label: "Rent", key: "rent" },
    { label: "Buy", key: "buy" },
  ];

  const hasAny = sections.some(({ key }) => Array.isArray(region[key]) && (region[key] as WatchProvider[]).length > 0);
  if (!hasAny) return null;

  return (
    <div>
      <div className="text-sm text-gray-400 mb-3">Availability region: <span className="text-gray-300 font-medium">{providersByRegion[preferredRegion] ? preferredRegion : regionKeys[0]}</span></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sections.map(({ label, key }) => {
          const list = (region[key] || []) as WatchProvider[];
          if (!Array.isArray(list) || list.length === 0) return (
            <div key={key as string} className="p-4 rounded-lg bg-gray-900/40 border border-yellow-500/10 opacity-60">
              <div className="text-xs text-gray-500 mb-2">{label}</div>
              <div className="text-sm text-gray-500 italic">No providers</div>
            </div>
          );
          return (
            <div key={key as string} className="p-4 rounded-lg bg-gray-900/40 border border-yellow-500/10">
              <div className="text-xs text-gray-500 mb-2">{label}</div>
              <div className="flex flex-wrap gap-2">
                {list.map((p) => (
                  <ProviderPill key={`${p.provider_id}-${p.provider_name}`} p={p} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-500 mt-3">Data via TMDB watch providers (availability may vary)</p>
    </div>
  );
}

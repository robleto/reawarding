"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";

export type ReadyMadeTab = "all" | "directors" | "actors" | "genres" | "decades";

type CategoryCounts = { ready?: number; almost?: number };

export default function ReadyMadeTabs(props: {
  counts?: {
    all?: number;
    directors?: CategoryCounts;
    actors?: CategoryCounts;
    genres?: CategoryCounts;
    decades?: CategoryCounts;
  };
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentPath = pathname ?? "";
  const current = (searchParams?.get("tab") as ReadyMadeTab | null) ?? "all";

  const makeHref = (tab: ReadyMadeTab) => {
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    if (tab === "all") {
      sp.delete("tab");
    } else {
      sp.set("tab", tab);
    }
    const qs = sp.toString();
    return qs ? `${currentPath}?${qs}` : currentPath;
  };

  const Tab = ({ tab, label, ready, almost }: { tab: ReadyMadeTab; label: string; ready?: number; almost?: number }) => (
    <Link
      href={makeHref(tab)}
      replace
      className={`px-2.5 sm:px-4 py-2.5 sm:py-3 text-sm font-medium transition-colors relative whitespace-nowrap flex-shrink-0 ${
        current === tab
          ? "text-gold-400 border-b-2 border-gold-400"
          : "text-gray-400 hover:text-gray-300"
      }`}
    >
      {label}
      {typeof ready === "number" && (
        <span className="ml-1.5 font-mono text-xs text-gray-500">({ready})</span>
      )}
      {typeof almost === "number" && almost > 0 && (
        <span className="ml-1.5 font-mono text-xs text-gold-500/70">+{almost} almost</span>
      )}
    </Link>
  );

  return (
    <div className="mb-6 flex gap-1 sm:gap-2 border-b border-gray-700 overflow-x-auto [scrollbar-width:none]">
      <Tab tab="all" label="All" ready={props.counts?.all} />
      <Tab tab="directors" label="Directors" ready={props.counts?.directors?.ready} almost={props.counts?.directors?.almost} />
      <Tab tab="actors" label="Actors" ready={props.counts?.actors?.ready} almost={props.counts?.actors?.almost} />
      <Tab tab="genres" label="Genres" ready={props.counts?.genres?.ready} almost={props.counts?.genres?.almost} />
      <Tab tab="decades" label="Decades" ready={props.counts?.decades?.ready} almost={props.counts?.decades?.almost} />
    </div>
  );
}

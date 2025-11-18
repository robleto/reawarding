"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";

export type ReadyMadeTab = "all" | "directors" | "actors" | "genres" | "decades";

export default function ReadyMadeTabs(props: {
  counts?: { all?: number; directors?: number; actors?: number; genres?: number; decades?: number };
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const current = (searchParams.get("tab") as ReadyMadeTab | null) ?? "all";

  const makeHref = (tab: ReadyMadeTab) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (tab === "all") {
      sp.delete("tab");
    } else {
      sp.set("tab", tab);
    }
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const Tab = ({ tab, label, highlight }: { tab: ReadyMadeTab; label: string; highlight?: string }) => (
    <Link
      href={makeHref(tab)}
      replace
      className={`px-4 py-3 text-sm font-medium transition-colors relative ${
        current === tab
          ? `${highlight ?? "text-yellow-400 border-yellow-400"} text-yellow-400 border-b-2`
          : "text-gray-400 hover:text-gray-300"
      }`}
    >
      {label}
    </Link>
  );

  const fmt = (n?: number) => (typeof n === "number" ? ` (${n})` : "");

  return (
    <div className="mb-6 flex gap-2 border-b border-gray-700">
      <Tab tab="all" label={`All${fmt(props.counts?.all)}`} />
      <Tab tab="directors" label={`Directors${fmt(props.counts?.directors)}`} />
      <Tab tab="actors" label={`Actors${fmt(props.counts?.actors)}`} />
      <Tab tab="genres" label={`Genres${fmt(props.counts?.genres)}`} />
      <Tab tab="decades" label={`Decades${fmt(props.counts?.decades)}`} />
    </div>
  );
}

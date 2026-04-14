"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { normalizeImageUrl } from "@/utils/imageUrl";

export type HomePosterLookup = {
  key: string;
  title: string;
  year: number;
  fallbackUrl: string;
};

const loadedYears = new Set<number>();
const posterCache = new Map<string, string>();
const posterLeafCache = new Map<string, string>();

function canonicalizeTitle(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['".,:;!?()-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function movieKey(year: number, title: string): string {
  return `${year}:${canonicalizeTitle(title)}`;
}

function imageLeaf(input: string | null | undefined): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    const part = url.pathname.split("/").pop() || "";
    return part.toLowerCase();
  } catch {
    const part = trimmed.split("/").pop() || "";
    return part.toLowerCase();
  }
}

export function useHomePanelPosters(lookups: HomePosterLookup[]) {
  const [revision, setRevision] = useState(0);

  const yearsKey = useMemo(
    () =>
      Array.from(new Set(lookups.map((lookup) => lookup.year)))
        .sort((a, b) => a - b)
        .join(","),
    [lookups]
  );

  useEffect(() => {
    let cancelled = false;

    const years = Array.from(new Set(lookups.map((lookup) => lookup.year)));
    const missingYears = years.filter((year) => !loadedYears.has(year));
    if (!missingYears.length) return;

    (async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("title, release_year, poster_url, thumb_url")
        .in("release_year", missingYears);

      if (cancelled) return;
      if (error) return;

      for (const row of data ?? []) {
        const releaseYear = Number(row.release_year);
        const resolvedPoster = normalizeImageUrl(row.poster_url || "");
        if (!releaseYear || !resolvedPoster) continue;
        const key = movieKey(releaseYear, row.title ?? "");
        if (!posterCache.has(key)) {
          posterCache.set(key, resolvedPoster);
        }

        const thumbLeaf = imageLeaf(row.thumb_url);
        if (thumbLeaf && !posterLeafCache.has(thumbLeaf)) {
          posterLeafCache.set(thumbLeaf, resolvedPoster);
        }

        const posterLeaf = imageLeaf(row.poster_url);
        if (posterLeaf && !posterLeafCache.has(posterLeaf)) {
          posterLeafCache.set(posterLeaf, resolvedPoster);
        }
      }

      missingYears.forEach((year) => loadedYears.add(year));
      setRevision((v) => v + 1);
    })();

    return () => {
      cancelled = true;
    };
  }, [lookups, yearsKey]);

  return useMemo(() => {
    const resolved = new Map<string, string>();
    for (const lookup of lookups) {
      const leafMatch = posterLeafCache.get(imageLeaf(lookup.fallbackUrl));
      const cached = posterCache.get(movieKey(lookup.year, lookup.title));
      resolved.set(
        lookup.key,
        leafMatch || cached || normalizeImageUrl(lookup.fallbackUrl) || lookup.fallbackUrl
      );
    }
    return resolved;
  }, [lookups, revision]);
}

"use client";

import { useEffect, useState } from "react";
import type { Movie } from "@/types/types";

interface PublicProfile {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  preferred_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  signature_picks?: (string | number)[] | null;
  created_at: string;
}

interface ProfileStats {
  rated: number;
  seen: number;
  awards: number;
  films: number;
}

export interface PublicAward {
  year: number;
  winner_id: string | number | null;
  nominee_ids: (string | number)[];
  category: string;
}

interface UsePublicProfileResult {
  profile: PublicProfile | null;
  movies: Movie[];
  stats: ProfileStats;
  awards: PublicAward[];
  loading: boolean;
  error: string | null;
  notFound: boolean;
}

type PublicProfileData = Omit<UsePublicProfileResult, "loading">;

const EMPTY_DATA: PublicProfileData = {
  profile: null,
  movies: [],
  stats: { rated: 0, seen: 0, awards: 0, films: 0 },
  awards: [],
  error: null,
  notFound: false,
};

/**
 * PERF-1 (docs/audits/2026-08-22-launch-readiness-round4.md): every
 * `/[username]/*` page calls this hook independently — layout.tsx for the
 * header/tabs, then the child page again for the same username — so every
 * profile visit issued 2+ full `/api/users/[username]` round trips (movies +
 * rankings + awards for that user) instead of 1. Mirrors the fetch-once/
 * share-the-in-flight-promise/TTL pattern already used for movie data (see
 * `movieCache`/`loadMoviesForKey` in sharedMovieUtils.ts) rather than
 * inventing a new caching approach. 30s TTL matches the API route's own
 * `Cache-Control: max-age=30` (src/app/api/users/[username]/route.ts).
 *
 * Like the movies cache, this doesn't invalidate on writes that bypass this
 * hook (e.g. editing Signature Picks writes `profiles.signature_picks`
 * directly via Supabase, not through this fetch) — the TTL bounds that
 * staleness to at most 30s rather than requiring every write path to know
 * about this cache, the same tradeoff sharedMovieUtils.ts already accepts.
 */
const CACHE_STALE_MS = 30_000;

interface PublicProfileCacheEntry {
  promise: Promise<void>;
  data: PublicProfileData;
  /** Set once the fetch resolves; null while still in flight (never treated as stale). */
  fetchedAt: number | null;
}

const publicProfileCache = new Map<string, PublicProfileCacheEntry>();

function loadPublicProfileForUsername(username: string): PublicProfileCacheEntry {
  const existing = publicProfileCache.get(username);
  if (existing) {
    const isStale =
      existing.fetchedAt !== null && Date.now() - existing.fetchedAt > CACHE_STALE_MS;
    if (!isStale) return existing;
    publicProfileCache.delete(username);
  }

  const entry: PublicProfileCacheEntry = {
    data: EMPTY_DATA,
    promise: null as unknown as Promise<void>,
    fetchedAt: null,
  };

  entry.promise = (async () => {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}`);

      if (res.status === 404) {
        entry.data = { ...EMPTY_DATA, notFound: true };
        entry.fetchedAt = Date.now();
        return;
      }

      if (!res.ok) {
        let message = "Failed to load profile";
        try {
          const payload = await res.json();
          if (typeof payload?.error === "string" && payload.error.trim()) {
            message = payload.error.trim();
          }
        } catch {
          // Ignore JSON parse failures and keep default message.
        }
        entry.data = { ...EMPTY_DATA, error: message };
        entry.fetchedAt = Date.now();
        // Don't cache a hard failure — let the next mount retry.
        if (publicProfileCache.get(username) === entry) {
          publicProfileCache.delete(username);
        }
        return;
      }

      const json = await res.json();
      entry.data = {
        profile: json.profile,
        movies: json.movies || [],
        stats: json.stats || { rated: 0, seen: 0, awards: 0, films: 0 },
        awards: json.awards || [],
        error: null,
        notFound: false,
      };
      entry.fetchedAt = Date.now();
    } catch (err) {
      entry.data = {
        ...EMPTY_DATA,
        error: err instanceof Error ? err.message : "Unknown error",
      };
      entry.fetchedAt = Date.now();
      if (publicProfileCache.get(username) === entry) {
        publicProfileCache.delete(username);
      }
    }
  })();

  publicProfileCache.set(username, entry);
  return entry;
}

export function usePublicProfile(username: string): UsePublicProfileResult {
  const [data, setData] = useState<PublicProfileData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;

    let cancelled = false;
    setLoading(true);

    const entry = loadPublicProfileForUsername(username);
    entry.promise.then(() => {
      if (cancelled) return;
      // Read entry.data fresh (not a value captured at promise-creation
      // time) so a mount that arrives after the fetch already resolved
      // still gets the real data, not a stale closure.
      setData(entry.data);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [username]);

  return { ...data, loading };
}

"use client";

import { useState, useEffect } from "react";
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

export function usePublicProfile(username: string): UsePublicProfileResult {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [stats, setStats] = useState<ProfileStats>({ rated: 0, seen: 0, awards: 0, films: 0 });
  const [awards, setAwards] = useState<PublicAward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;

    let mounted = true;

    async function fetchProfile() {
      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const res = await fetch(`/api/users/${encodeURIComponent(username)}`);

        if (res.status === 404) {
          if (mounted) setNotFound(true);
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

          if (mounted) {
            setError(message);
          }
          return;
        }

        const data = await res.json();
        if (mounted) {
          setProfile(data.profile);
          setMovies(data.movies || []);
          setStats(data.stats || { rated: 0, seen: 0, awards: 0, films: 0 });
          setAwards(data.awards || []);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchProfile();
    return () => {
      mounted = false;
    };
  }, [username]);

  return { profile, movies, stats, awards, loading, error, notFound };
}

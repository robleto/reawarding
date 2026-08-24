"use client";

import { useEffect, useState } from "react";
import { fetchOfficialAwardWinners } from "@/data/officialAwardWinners";
import { supabase } from "@/lib/supabaseBrowser";
import type { AcademyLedgerReference } from "@/components/home/AcademyLedger";
import type { Movie } from "@/types/types";

export interface AcademyPickForYear {
  reference: AcademyLedgerReference;
  /** Used to detect agreement against the visitor's own pick. */
  movieId: string | null;
}

/**
 * The Academy's Best Picture winner for a given year, shaped for `AcademyLedger`.
 *
 * **Gated on `year`.** Pass null and this never touches the network. That's the
 * point: the logged-out screen's first paint uses the `ACADEMY_REFERENCE`
 * constant precisely so a cold app open costs no round trip
 * (docs/design/logged-out-native-home.md). Only once the visitor has actually
 * rated something — and the ledger has to re-key to *their* year — is a fetch
 * worth a brief loading beat.
 *
 * `fetchOfficialAwardWinners()` returns every year in one module-cached
 * promise, so walking additional years later (Act 2) is free after this.
 *
 * Returns null while loading, and for any year with no matched winner. As of
 * 2026-08-24 all 98 Best Picture years (1927–2025) are `matched`, so the null
 * case is defensive rather than expected — callers should still handle it
 * instead of assuming coverage holds.
 */
export function useAcademyPickForYear(
  year: number | null,
  movies: Movie[]
): AcademyPickForYear | null {
  const [winner, setWinner] = useState<{
    year: number;
    filmTitle: string;
    movieId: string | null;
  } | null>(null);
  /** Poster for a winner that isn't in the client's movie window. */
  const [rescuedPoster, setRescuedPoster] = useState<string | null>(null);

  useEffect(() => {
    if (year == null) {
      setWinner(null);
      return;
    }
    let cancelled = false;
    void fetchOfficialAwardWinners().then((map) => {
      if (cancelled) return;
      const w = map.get(year);
      setWinner(
        w && w.matchStatus === "matched"
          ? { year: w.year, filmTitle: w.filmTitle, movieId: w.movieId }
          : null
      );
    });
    return () => {
      cancelled = true;
    };
  }, [year]);

  const inWindow = winner
    ? movies.find((m) => String(m.id) === String(winner.movieId))
    : undefined;

  // The client only holds 3000 of ~4400 movies, and the Academy's winner is
  // frequently outside that window — nothing guarantees it's in there, since
  // the window has no ORDER BY. Fetch the one row when it's missing.
  //
  // Do NOT try to construct the URL from the id instead: poster_url follows the
  // R2 `<base>/posters/<id>.jpg` pattern for most rows but 1,125 of 4,415
  // (~25%) deviate, so a constructed URL breaks for a quarter of the catalogue.
  useEffect(() => {
    const movieId = winner?.movieId;
    if (!movieId || inWindow) {
      setRescuedPoster(null);
      return;
    }
    let cancelled = false;
    void supabase
      .from("movies")
      .select("poster_url")
      .eq("id", movieId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setRescuedPoster(data?.poster_url ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [winner?.movieId, inWindow]);

  if (!winner) return null;

  const posterUrl = inWindow?.poster_url ?? rescuedPoster ?? "";
  return {
    reference: { year: winner.year, title: winner.filmTitle, posterUrl },
    movieId: winner.movieId,
  };
}

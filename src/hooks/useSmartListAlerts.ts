"use client";

import { useMemo } from "react";
import type { Movie } from "@/types/types";

export type SmartListAlertType = "director" | "genre" | "decade" | "actor";

export type SmartListAlert = {
  type: SmartListAlertType;
  label: string;        // e.g. "Wes Anderson", "Drama", "1990s", "Cate Blanchett"
  count: number;        // how many films the user has seen
  threshold: number;    // the unlock threshold
  nearMiss: boolean;    // true = within 3 of threshold (teaser); false = at/above (unlock offer)
  movieIds: string[];   // ids of matching films already seen
};

// Thresholds: [near-miss starts at, unlocks at]
//
// These mirror src/app/lists/ready-made/page.tsx exactly — director, actor and
// genre are "ready" at >=10 with an "almost" band of 6-9; decade is ready at
// >=12 with an "almost" band of 7-11. The previous comment claimed alignment
// while the numbers disagreed, which broke both directions:
//   - director/actor unlocked here at 8, but the page still filed those under
//     "almost", so home promised a list the page wouldn't offer;
//   - the near-miss floor of 5 sat below the page's "almost" floor of 6, so a
//     user at 5 got a home teaser pointing at a page that rendered nothing.
// If the page's numbers change, change these with them.
const THRESHOLDS: Record<SmartListAlertType, [number, number]> = {
  director: [6, 10],
  actor:    [6, 10],
  genre:    [6, 10],
  decade:   [7, 12],
};

function decadeLabel(year: number): string {
  const d = Math.floor(year / 10) * 10;
  return `${d}s`;
}

/**
 * Computes smart list alerts from the user's watched films.
 * Works entirely from the movies array already loaded client-side — no DB queries.
 *
 * Returns alerts sorted by: unlocked first, then near-misses, then by count desc.
 * Caps at 5 alerts to avoid overwhelming the UI.
 */
export function useSmartListAlerts(movies: Movie[]): SmartListAlert[] {
  return useMemo(() => {
    const seenMovies = movies.filter((m) => m.rankings?.[0]?.seen_it === true);

    if (seenMovies.length < THRESHOLDS.director[0]) return [];

    const alerts: SmartListAlert[] = [];

    // ── Directors ──────────────────────────────────────────────────────────
    const byDirector = new Map<string, string[]>();
    for (const m of seenMovies) {
      if (!m.director) continue;
      const key = m.director.trim();
      if (!key) continue;
      if (!byDirector.has(key)) byDirector.set(key, []);
      byDirector.get(key)!.push(m.id);
    }
    const [dnear, dunlock] = THRESHOLDS.director;
    for (const [name, ids] of byDirector) {
      const count = ids.length;
      if (count >= dnear) {
        alerts.push({
          type: "director",
          label: name,
          count,
          threshold: dunlock,
          nearMiss: count < dunlock,
          movieIds: ids,
        });
      }
    }

    // ── Genres ─────────────────────────────────────────────────────────────
    const byGenre = new Map<string, string[]>();
    for (const m of seenMovies) {
      for (const g of m.genres ?? []) {
        const key = g.trim();
        if (!key) continue;
        if (!byGenre.has(key)) byGenre.set(key, []);
        byGenre.get(key)!.push(m.id);
      }
    }
    const [gnear, gunlock] = THRESHOLDS.genre;
    for (const [genre, ids] of byGenre) {
      const count = ids.length;
      if (count >= gnear) {
        alerts.push({
          type: "genre",
          label: genre,
          count,
          threshold: gunlock,
          nearMiss: count < gunlock,
          movieIds: ids,
        });
      }
    }

    // ── Decades ────────────────────────────────────────────────────────────
    const byDecade = new Map<string, string[]>();
    for (const m of seenMovies) {
      if (!m.release_year) continue;
      const label = decadeLabel(m.release_year);
      if (!byDecade.has(label)) byDecade.set(label, []);
      byDecade.get(label)!.push(m.id);
    }
    const [decnear, decunlock] = THRESHOLDS.decade;
    for (const [label, ids] of byDecade) {
      const count = ids.length;
      if (count >= decnear) {
        alerts.push({
          type: "decade",
          label,
          count,
          threshold: decunlock,
          nearMiss: count < decunlock,
          movieIds: ids,
        });
      }
    }

    // ── Actors ─────────────────────────────────────────────────────────────
    const byActor = new Map<string, string[]>();
    for (const m of seenMovies) {
      for (const a of m.cast_list ?? []) {
        const key = a.trim();
        if (!key) continue;
        if (!byActor.has(key)) byActor.set(key, []);
        byActor.get(key)!.push(m.id);
      }
    }
    const [anear, aunlock] = THRESHOLDS.actor;
    for (const [name, ids] of byActor) {
      const count = ids.length;
      if (count >= anear) {
        alerts.push({
          type: "actor",
          label: name,
          count,
          threshold: aunlock,
          nearMiss: count < aunlock,
          movieIds: ids,
        });
      }
    }

    // Priority order within each lock-status group:
    //   directors → actors → decades → genres
    // Genres expand so quickly (Drama/Thriller hit 12+ fast) that without this
    // they crowd out the more distinctive director/actor/decade signals.
    const TYPE_PRIORITY: Record<SmartListAlertType, number> = {
      director: 0,
      actor:    1,
      decade:   2,
      genre:    3,
    };

    alerts.sort((a, b) => {
      // Unlocked lists before near-misses
      if (a.nearMiss !== b.nearMiss) return a.nearMiss ? 1 : -1;
      // Directors/actors/decades before genres
      const pa = TYPE_PRIORITY[a.type];
      const pb = TYPE_PRIORITY[b.type];
      if (pa !== pb) return pa - pb;
      // Within same type: more seen = higher signal
      return b.count - a.count;
    });

    // Cap at 6 — enough to fill a horizontal row at any viewport
    return alerts.slice(0, 6);
  }, [movies]);
}

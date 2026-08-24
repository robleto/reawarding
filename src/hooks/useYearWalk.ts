"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useGuestRankingStore from "@/hooks/useGuestRankingStore";
import {
  CONTESTED_YEARS,
  WALK_MAX_YEARS,
  WALK_SKIP_LIMIT,
} from "@/data/contestedYears";

/** Skips are intentionally ephemeral — see `SKIP_KEY` below. */
const SKIP_KEY = "reawarding-walk-skipped";

function readSkipped(): number[] {
  try {
    const raw = window.sessionStorage.getItem(SKIP_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

export interface YearWalkState {
  /** The year to ask about, or null when the walk is over. */
  currentYear: number | null;
  /** Years the visitor has given a verdict on, newest first. */
  decidedYears: number[];
  /** True once the walk has ended — hand off to the save step. */
  finished: boolean;
  skip: (year: number) => void;
}

/**
 * Drives the guest year-walk (Act 2 of docs/design/first-rating-payoff.md).
 *
 * Position is **derived, not stored**. A year counts as decided when the guest
 * store holds an award for it, which is also how a pick is recorded (Fork B:
 * `setAward(year, id, [id], 'seed_pick')` — a preference, not a rating). That
 * means a reload resumes the walk exactly where it left off, with no cursor to
 * keep in sync with the data.
 *
 * Skips are the one thing not derivable, and they live in `sessionStorage`
 * rather than the persisted store on purpose: "haven't seen enough of 1994" is
 * a statement about right now, not a permanent verdict. Coming back tomorrow
 * should offer the year again; the same visit shouldn't nag.
 *
 * Ends on whichever comes first — `WALK_SKIP_LIMIT` consecutive skips, or
 * `WALK_MAX_YEARS` decided. Agreement counts as a decision, not a skip: it's
 * engagement and should extend the walk rather than end it.
 */
export function useYearWalk(): YearWalkState {
  const awards = useGuestRankingStore((s) => s.awards);
  const [skipped, setSkipped] = useState<number[]>([]);
  const [consecutiveSkips, setConsecutiveSkips] = useState(0);

  // sessionStorage is client-only; read after mount so SSR and hydration agree.
  useEffect(() => {
    setSkipped(readSkipped());
  }, []);

  const skip = useCallback((year: number) => {
    setSkipped((prev) => {
      if (prev.includes(year)) return prev;
      const next = [...prev, year];
      try {
        window.sessionStorage.setItem(SKIP_KEY, JSON.stringify(next));
      } catch {
        // Private mode — the skip still applies for this render pass.
      }
      return next;
    });
    setConsecutiveSkips((n) => n + 1);
  }, []);

  const decidedYears = useMemo(
    () =>
      Object.keys(awards)
        .map(Number)
        .filter((y) => Number.isFinite(y))
        .sort((a, b) => b - a),
    [awards]
  );

  // A decision anywhere resets the skip streak — the visitor is engaged again.
  const decidedCount = decidedYears.length;
  useEffect(() => {
    setConsecutiveSkips(0);
  }, [decidedCount]);

  const finished =
    consecutiveSkips >= WALK_SKIP_LIMIT || decidedCount >= WALK_MAX_YEARS;

  const currentYear = useMemo(() => {
    if (finished) return null;
    const decided = new Set(decidedYears);
    const skippedSet = new Set(skipped);
    const next = CONTESTED_YEARS.find(
      (c) => !decided.has(c.year) && !skippedSet.has(c.year)
    );
    return next?.year ?? null;
  }, [finished, decidedYears, skipped]);

  return { currentYear, decidedYears, finished, skip };
}

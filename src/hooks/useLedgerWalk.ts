"use client";

import { useState } from "react";
import { useYearWalk } from "@/hooks/useYearWalk";
import { useAcademyPickForYear } from "@/hooks/useAcademyPickForYear";
import { useYearCandidates } from "@/hooks/useYearCandidates";
import { useGuestPicksSummary } from "@/hooks/useGuestPicksSummary";
import type { AcademyLedgerPick } from "@/components/home/AcademyLedger";
import type { Movie } from "@/types/types";

export interface LedgerState {
  academy: { year: number; title: string; posterUrl: string };
  yours: AcademyLedgerPick | null;
  agreed: boolean;
}

/**
 * Drives Acts 1–3 of docs/design/first-rating-payoff.md — fill the ledger,
 * walk the contested years, then the save summary — for whichever surface
 * renders it.
 *
 * Extracted out of the native screen's `FirstOpen` so the web hero can run
 * the identical flow rather than a re-implementation that drifts from it.
 * Callers own all copy and layout; this hook owns only state and the guest
 * data reads/writes underneath it.
 */
export function useLedgerWalk(
  ledger: LedgerState,
  movies: Movie[],
  onPickForYear: (pick: { id: string; title: string; year: number }) => void
) {
  const walk = useYearWalk();
  // Holds a just-decided verdict so the visitor sees their pick land before
  // anything advances. Without it the walk would swallow its own payoff — the
  // award is recorded instantly, so the next year would replace the filled
  // ledger in the same frame.
  const [result, setResult] = useState<LedgerState | null>(null);
  /** The caller-supplied first pick (from the general search flow) needs the
   *  same one-tap acknowledgment before the walk starts asking. */
  const [ackedFirst, setAckedFirst] = useState(false);

  // Precedence matters and is easy to get backwards. The summary is checked
  // first because `ledger.yours` is non-null for *any* award — including all
  // eight from a finished walk — so a "first result" test that ran first would
  // swallow Act 3 and show a single year instead of the stack.
  const showSummary = walk.done && !result;
  const showFirstResult =
    !showSummary && ledger.yours !== null && !ackedFirst && !result;
  // The walk must not ask anything before Act 1's own fill has happened at
  // least once — a real bug, caught only when web's cold open (truly zero
  // rankings, zero awards) was tested for the first time, something native's
  // own tests never happened to exercise: they always seeded a rating, which
  // masked it via showFirstResult. Without this gate, `walk.currentYear`
  // defaults to CONTESTED_YEARS[0] on mount regardless of whether the visitor
  // has done anything at all, so a brand-new guest opened straight into "What
  // about 1994?" instead of "Start with a film you've seen." `ledger.yours`
  // covers the ledger's own year having been filled; `walk.decidedYears`
  // covers every render after the first walk verdict, once `ledger.yours`
  // itself may no longer be the reason (it's a different, page-level year).
  const hasActed = ledger.yours !== null || walk.decidedYears.length > 0;
  const askingYear =
    hasActed && !showSummary && !showFirstResult && !result
      ? walk.currentYear
      : null;
  const summary = useGuestPicksSummary();

  const walkAcademy = useAcademyPickForYear(askingYear, movies);
  const candidates = useYearCandidates(askingYear, walkAcademy?.movieId ?? null);

  // What the ledger renders right now: a fresh verdict, the year being asked
  // about, or the caller's own ledger before the walk has started.
  const shownLedger: LedgerState =
    result ??
    (askingYear && walkAcademy
      ? { academy: walkAcademy.reference, yours: null, agreed: false }
      : ledger);

  const filled = shownLedger.yours !== null;

  const decide = (pick: AcademyLedgerPick & { id: string }, agreed: boolean) => {
    if (askingYear == null || !walkAcademy) return;
    onPickForYear({ id: pick.id, title: pick.title, year: askingYear });
    setResult({
      academy: walkAcademy.reference,
      yours: { title: pick.title, posterUrl: pick.posterUrl },
      agreed,
    });
  };

  const advance = () => {
    setResult(null);
    setAckedFirst(true);
  };

  return {
    walk,
    showSummary,
    askingYear,
    walkAcademy,
    candidates,
    shownLedger,
    filled,
    summary,
    decide,
    advance,
  };
}

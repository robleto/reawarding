"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@supabase/auth-helpers-react";
import { Check, PenLine, Star, Trophy, X } from "lucide-react";
import { getRatingStyle } from "@/utils/getRatingStyle";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import { normalizeImageUrl } from "@/utils/imageUrl";
import { slugifyTitle } from "@/utils/slug";

// ─── Timing constants ─────────────────────────────────────────────────────────
const DWELL_MS        = 500;  // confirmation visible before fade begins
const INVITE_DWELL_MS = 2200; // longer beat for any 7+ rating — the ballot link (and, for logged-in users, the take invite) needs time to be read and acted on
const FADE_MS         = 200;  // modal fade-out animation duration

// ─── Data ─────────────────────────────────────────────────────────────────────
const RATING_OPTIONS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as const;
const RATING_LABELS: Record<number, string> = {
  10: "Masterpiece",
  9:  "Outstanding",
  8:  "Great",
  7:  "Very Good",
  6:  "Good",
  5:  "Mixed",
  4:  "Weak",
  3:  "Poor",
  2:  "Bad",
  1:  "Awful",
};

// ─── State machine ────────────────────────────────────────────────────────────
// idle      → user sees full rating list
// confirmed → selection locked; header switches to confirmation; list collapses to one row
// closing   → modal fades out (DWELL_MS has elapsed); onClose fires after FADE_MS
type Phase = "idle" | "confirmed" | "closing";

interface Props {
  isOpen: boolean;
  movieTitle: string;
  posterUrl: string | null;
  currentRating: number | null;
  movieYear?: number | null;
  /** When set (and the user is logged in), a 7+ rating's confirmation offers
   *  "Add your take" — the post-rate beat is peak motivation for expression. */
  movieId?: string;
  onRate: (value: number | null) => void;
  onClose: () => void;
}

export default function RatingModal({
  isOpen,
  movieTitle,
  posterUrl,
  currentRating,
  movieYear,
  movieId,
  onRate,
  onClose,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useUser();
  const panelRef    = useRef<HTMLDivElement>(null);
  const dwellTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phase, setPhase]               = useState<Phase>("idle");
  const [selectedRating, setSelected]   = useState<number | null>(null);
  // The film page is a server component that fetches on navigation — there's
  // a real gap between tapping "Add your take" and the new page appearing.
  // Without this, the tap closes RatingModal instantly with nothing else
  // visibly happening in that gap, which reads as broken.
  const [navigatingToTake, setNavigatingToTake] = useState(false);
  // Separate from navigatingToTake: rating and take are different followups
  // (write a review vs. check the year's race) and can both be offered, so
  // each needs its own loading state.
  const [navigatingToBallot, setNavigatingToBallot] = useState(false);

  // Reset on every open — including navigatingToTake/navigatingToBallot,
  // since this component stays mounted across close/reopen (visibility is
  // gated by `isOpen` below, not by unmounting) rather than clearing its
  // own state on close.
  useEffect(() => {
    if (isOpen) {
      setPhase("idle");
      setSelected(null);
      setNavigatingToTake(false);
      setNavigatingToBallot(false);
    }
  }, [isOpen]);

  // Clean up timers on unmount
  useEffect(() => () => {
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  // The take invite only appears for logged-in users when the caller
  // supplied a movie id; guests land on the film page's entry panel, not
  // the editor. The ballot link has no such requirement — checking whether
  // a film just became a nominee (or the frontrunner) doesn't need an
  // account, so it's offered to everyone on a 7+ rating.
  const canInvite = !!movieId && !!user;
  const isNominee = selectedRating != null && selectedRating >= 7;
  // Computed early (not in the render tail below) so handleViewBallot can
  // depend on it.
  const confirmYear = movieYear ?? new Date().getFullYear();

  // Skip the remaining dwell and close now — used when the extended beat
  // (take invite and/or ballot link) is showing and the user wants to keep
  // moving.
  const dismissEarly = useCallback(() => {
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setPhase("closing");
    closeTimer.current = setTimeout(onClose, FADE_MS);
  }, [onClose]);

  // Escape — during idle closes immediately; during the extended beat it
  // dismisses early (the short standard confirmation finishes naturally)
  useEffect(() => {
    if (!isOpen) return;
    const inExtendedBeat = phase === "confirmed" && isNominee;
    if (phase !== "idle" && !inExtendedBeat) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (phase === "idle") onClose();
      else dismissEarly();
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [isOpen, phase, isNominee, onClose, dismissEarly]);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // ── Tap handler ──────────────────────────────────────────────────────────────
  // Sequence:
  //   0 ms  — onRate fires, selection locks, header switches to confirmation
  // 500 ms  — phase → "closing", modal fade begins
  // 700 ms  — onClose fires
  const handleRate = useCallback((num: number) => {
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);

    // 7+ is the emergence moment — the film becomes a nominee (firmer thunk).
    void (num >= 7 ? hapticMedium() : hapticLight());
    onRate(num);
    setSelected(num);
    setPhase("confirmed");

    // Nominee ratings hold the beat longer so the ballot link (and, when
    // offered, the take invite) can actually be read and acted on;
    // everything else keeps the fast-loop rhythm.
    const dwell = num >= 7 ? INVITE_DWELL_MS : DWELL_MS;
    dwellTimer.current = setTimeout(() => setPhase("closing"), dwell);
    closeTimer.current = setTimeout(onClose, dwell + FADE_MS);
  }, [onRate, onClose]);

  // Navigate to the film page's Your Take editor. Deliberately does NOT call
  // onClose() — the film page is a server component with its own data fetch,
  // so there's a real gap before it appears. Staying mounted (with a loading
  // state) through that gap means something is always visibly happening;
  // the whole modal unmounts naturally once the new route takes over.
  const handleAddTake = useCallback(() => {
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setNavigatingToTake(true);
    router.push(`/films/${slugifyTitle(movieTitle)}/${movieId}`);
  }, [router, movieTitle, movieId]);

  // Navigate to that year's ballot — same "stay mounted through the gap"
  // reasoning as handleAddTake. No login/movieId requirement: this is the
  // one followup available to guests too.
  //
  // Ratings often happen from inside that year's own page already (e.g. the
  // discovery grid below the ballot) — pushing to the URL you're already on
  // is a no-op navigation, so the modal would sit on "Opening…" forever
  // with nothing to unmount it. Just close instead when there's nowhere to go.
  const handleViewBallot = useCallback(() => {
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const target = `/year/${confirmYear}`;
    if (pathname === target) {
      onClose();
      return;
    }
    setNavigatingToBallot(true);
    router.push(target);
  }, [router, pathname, confirmYear, onClose]);

  if (!isOpen) return null;

  const normalized = normalizeImageUrl(posterUrl ?? "");
  const hasPoster  = normalized && (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    (normalized.startsWith("/") && normalized.length > 1)
  );

  const isConfirming = phase !== "idle";
  const showInvite   = isNominee && canInvite;

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Rate ${movieTitle}`}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close rating"
        disabled={isConfirming && !isNominee}
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm motion-reduce:animate-none ${
          phase === "closing"
            ? "animate-out fade-out duration-200"
            : "animate-in fade-in duration-200"
        }`}
        onClick={
          phase === "idle"
            ? onClose
            : phase === "confirmed" && isNominee
            ? dismissEarly
            : undefined
        }
      />

      {/* Panel — bottom sheet on phones (iOS convention for a quick action),
          centered dialog at md+. See docs/IPHONE_FEEL_AUDIT.md item 12. */}
      <div
        ref={panelRef}
        className={`relative z-10 w-full max-h-[88vh] overflow-hidden rounded-t-2xl border border-b-0 border-gray-700/60 bg-charcoal-900 shadow-2xl pb-[env(safe-area-inset-bottom)] md:w-[340px] md:max-w-[92vw] md:rounded-2xl md:border-b md:pb-0 motion-reduce:animate-none ${
          phase === "closing"
            ? "animate-out fade-out slide-out-to-bottom-full duration-300 md:slide-out-to-bottom-0 md:zoom-out-95 md:duration-200"
            : "animate-in fade-in slide-in-from-bottom-full duration-300 md:slide-in-from-bottom-0 md:zoom-in-95 md:duration-200"
        }`}
      >
        {/* Sheet grabber — phones only */}
        <div className="md:hidden pt-2.5 pb-1 flex justify-center" aria-hidden="true">
          <div className="h-1 w-9 rounded-full bg-gray-600/80" />
        </div>
        {/* ── Header ──────────────────────────────────────────────────────── */}
        {isConfirming ? (
          // Confirmation header — header switches first, before anything else
          <div
            className={`px-4 py-4 border-b border-gray-800 animate-in fade-in duration-100 ${
              isNominee ? "bg-gold-500/[0.07]" : ""
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {isNominee
                ? <Star  className="w-4 h-4 text-gold-400 flex-shrink-0" />
                : <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              }
              <span className={`text-sm font-semibold ${isNominee ? "text-gold-300" : "text-emerald-300"}`}>
                Done
              </span>
            </div>
            <p className={`text-sm leading-snug ${isNominee ? "text-gold-200/80" : "text-gray-300"}`}>
              {isNominee
                ? `Rated ${selectedRating} — added to your ${confirmYear} nominees.`
                : `Rated ${selectedRating}. Keep rating to build the field.`
              }
            </p>
            {/* Ballot link — no login/movieId gate, unlike "Add your take"
                below: checking whether this just became a nominee (or the
                frontrunner) is core to the app's loop for every user. */}
            {isNominee && (
              <button
                type="button"
                onClick={handleViewBallot}
                disabled={navigatingToBallot}
                className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-gold-300 hover:text-gold-200 transition-colors animate-in fade-in duration-300 disabled:opacity-70"
              >
                {navigatingToBallot ? (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-gold-300/30 border-t-gold-300 animate-spin" />
                ) : (
                  <Trophy className="w-3.5 h-3.5" />
                )}
                {navigatingToBallot ? "Opening…" : `View ${confirmYear} ballot`}
              </button>
            )}
            {showInvite && (
              <button
                type="button"
                onClick={handleAddTake}
                disabled={navigatingToTake}
                className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-gold-300 hover:text-gold-200 transition-colors animate-in fade-in duration-300 disabled:opacity-70"
              >
                {navigatingToTake ? (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-gold-300/30 border-t-gold-300 animate-spin" />
                ) : (
                  <PenLine className="w-3.5 h-3.5" />
                )}
                {navigatingToTake ? "Opening…" : "Add your take"}
              </button>
            )}
          </div>
        ) : (
          // Default header
          <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-800">
            <div className="relative w-12 h-[72px] flex-shrink-0 overflow-hidden rounded-lg bg-gray-800">
              {hasPoster ? (
                <Image
                  src={normalized}
                  alt={movieTitle}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-800">
                  <span className="text-[8px] text-gray-500 text-center leading-tight px-1">
                    {movieTitle}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-white truncate">{movieTitle}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {currentRating ? `Currently rated ${currentRating}` : "Not yet rated"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Threshold hint — always visible before a pick is made ─────── */}
        {!isConfirming && (
          <p className="px-4 pt-2.5 pb-0 text-sm text-gray-400 text-center">
            Rate 7 or higher to nominate
          </p>
        )}

        {/* ── Rating list ─────────────────────────────────────────────────── */}
        {/* During confirmation: only the selected row is rendered            */}
        {/* During idle: full list, fully interactive                         */}
        <div
          className="overflow-y-auto overscroll-contain px-3 py-3 space-y-1.5"
          style={{ maxHeight: "calc(88vh - 120px)" }}
          aria-hidden={isConfirming}
        >
          {(isConfirming
            ? RATING_OPTIONS.filter((n) => n === selectedRating)
            : RATING_OPTIONS
          ).map((num) => {
            const style      = getRatingStyle(num);
            const isSelected = isConfirming
              ? num === selectedRating
              : currentRating === num;

            return (
              <button
                key={num}
                type="button"
                onClick={isConfirming ? undefined : () => handleRate(num)}
                disabled={isConfirming}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                  isConfirming
                    ? "cursor-default pointer-events-none ring-2 ring-gold-400/70 shadow-md"
                    : isSelected
                    ? "ring-2 ring-gold-400/70 shadow-md hover:scale-[1.01] active:scale-[0.99]"
                    : "ring-1 ring-gray-700/50 hover:ring-gray-600 hover:scale-[1.01] active:scale-[0.99]"
                }`}
                style={{ backgroundColor: style.background, color: style.text }}
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-black/15 text-lg font-bold flex-shrink-0">
                  {num}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="text-sm font-semibold">{RATING_LABELS[num]}</span>
                  {num >= 7 && (
                    <span className="block text-xs opacity-70 mt-0.5">
                      Earns a nomination
                    </span>
                  )}
                </span>
                {isSelected && !isConfirming && (
                  <span className="text-xs font-bold opacity-80">Current</span>
                )}
              </button>
            );
          })}

          {/* Clear rating — hidden during confirmation */}
          {!isConfirming && currentRating && (
            <button
              type="button"
              onClick={() => { onRate(null); onClose(); }}
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors mt-2"
            >
              Clear rating
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

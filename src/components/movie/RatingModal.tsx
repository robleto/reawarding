"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Check, Star, X } from "lucide-react";
import { getRatingStyle } from "@/utils/getRatingStyle";
import { normalizeImageUrl } from "@/utils/imageUrl";

// ─── Timing constants ─────────────────────────────────────────────────────────
const DWELL_MS = 500; // confirmation visible before fade begins
const FADE_MS  = 200; // modal fade-out animation duration

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
  onRate: (value: number | null) => void;
  onClose: () => void;
}

export default function RatingModal({
  isOpen,
  movieTitle,
  posterUrl,
  currentRating,
  movieYear,
  onRate,
  onClose,
}: Props) {
  const panelRef    = useRef<HTMLDivElement>(null);
  const dwellTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phase, setPhase]               = useState<Phase>("idle");
  const [selectedRating, setSelected]   = useState<number | null>(null);

  // Reset on every open
  useEffect(() => {
    if (isOpen) {
      setPhase("idle");
      setSelected(null);
    }
  }, [isOpen]);

  // Clean up timers on unmount
  useEffect(() => () => {
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  // Escape — only during idle (confirmation phase should finish naturally)
  useEffect(() => {
    if (!isOpen || phase !== "idle") return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [isOpen, phase, onClose]);

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

    onRate(num);
    setSelected(num);
    setPhase("confirmed");

    dwellTimer.current = setTimeout(() => setPhase("closing"), DWELL_MS);
    closeTimer.current = setTimeout(onClose, DWELL_MS + FADE_MS);
  }, [onRate, onClose]);

  if (!isOpen) return null;

  const normalized = normalizeImageUrl(posterUrl ?? "");
  const hasPoster  = normalized && (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    (normalized.startsWith("/") && normalized.length > 1)
  );

  const isConfirming = phase !== "idle";
  const isNominee    = selectedRating != null && selectedRating >= 7;
  const confirmYear  = movieYear ?? new Date().getFullYear();

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Rate ${movieTitle}`}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close rating"
        disabled={isConfirming}
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm ${
          phase === "closing"
            ? "animate-out fade-out duration-200"
            : "animate-in fade-in duration-200"
        }`}
        onClick={phase === "idle" ? onClose : undefined}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`relative z-10 w-[340px] max-w-[92vw] max-h-[88vh] overflow-hidden rounded-2xl border border-gray-700/60 bg-gray-900 shadow-2xl ${
          phase === "closing"
            ? "animate-out fade-out zoom-out-95 duration-200"
            : "animate-in fade-in zoom-in-95 duration-200"
        }`}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        {isConfirming ? (
          // Confirmation header — header switches first, before anything else
          <div
            className={`px-4 py-4 border-b border-gray-800 animate-in fade-in duration-100 ${
              isNominee ? "bg-yellow-500/[0.07]" : ""
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {isNominee
                ? <Star  className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                : <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              }
              <span className={`text-sm font-semibold ${isNominee ? "text-yellow-300" : "text-emerald-300"}`}>
                Done
              </span>
            </div>
            <p className={`text-sm leading-snug ${isNominee ? "text-yellow-200/80" : "text-gray-300"}`}>
              {isNominee
                ? `Rated ${selectedRating} — added to your ${confirmYear} nominees.`
                : `Rated ${selectedRating}. Keep rating to build the field.`
              }
            </p>
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
                  unoptimized
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
              <p className="text-xs text-gray-500 mt-0.5">
                {currentRating ? `Currently rated ${currentRating}` : "Not yet rated"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Rating list ─────────────────────────────────────────────────── */}
        {/* During confirmation: only the selected row is rendered            */}
        {/* During idle: full list, fully interactive                         */}
        <div
          className="overflow-y-auto px-3 py-3 space-y-1.5"
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
                    ? "cursor-default pointer-events-none ring-2 ring-yellow-400/70 shadow-md"
                    : isSelected
                    ? "ring-2 ring-yellow-400/70 shadow-md hover:scale-[1.01] active:scale-[0.99]"
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
                    <span className="block text-[10px] opacity-70 mt-0.5">
                      Scores 7+ become nominees
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

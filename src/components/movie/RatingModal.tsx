"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, Check, Star } from "lucide-react";
import { getRatingStyle } from "@/utils/getRatingStyle";
import { normalizeImageUrl } from "@/utils/imageUrl";

const RATING_OPTIONS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as const;
const RATING_LABELS: Record<number, string> = {
  10: "Masterpiece",
  9: "Outstanding",
  8: "Great",
  7: "Very Good",
  6: "Good",
  5: "Mixed",
  4: "Weak",
  3: "Poor",
  2: "Bad",
  1: "Awful",
};

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
  const panelRef = useRef<HTMLDivElement>(null);
  const [confirmedRating, setConfirmedRating] = useState<number | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset confirmation state when modal opens
  useEffect(() => {
    if (isOpen) setConfirmedRating(null);
  }, [isOpen]);

  // Clear any pending close timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const normalized = normalizeImageUrl(posterUrl ?? "");
  const hasPoster =
    normalized &&
    (normalized.startsWith("http://") ||
      normalized.startsWith("https://") ||
      (normalized.startsWith("/") && normalized.length > 1));

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
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative z-10 w-[340px] max-w-[92vw] max-h-[88vh] overflow-hidden rounded-2xl border border-gray-700/60 bg-gray-900 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header: poster + title */}
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
            <h3 className="text-base font-semibold text-white truncate">
              {movieTitle}
            </h3>
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

        {/* Post-rating confirmation flash */}
        {confirmedRating !== null && (
          <div className="px-4 py-3 border-t border-gray-800 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {confirmedRating >= 7 ? (
              <div className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                <p className="text-sm text-yellow-300 font-medium">
                  Rated {confirmedRating} — added to your {movieYear ?? new Date().getFullYear()} nominees.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <p className="text-sm text-gray-300">
                  Rated {confirmedRating}. Keep rating to build your field.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Rating list */}
        <div className="overflow-y-auto px-3 py-3 space-y-1.5" style={{ maxHeight: "calc(88vh - 120px)" }}>
          {RATING_OPTIONS.map((num) => {
            const style = getRatingStyle(num);
            const isSelected = currentRating === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => {
                  onRate(num);
                  setConfirmedRating(num);
                  if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
                  closeTimerRef.current = setTimeout(onClose, 900);
                }}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${
                  isSelected
                    ? "ring-2 ring-yellow-400/70 shadow-md"
                    : "ring-1 ring-gray-700/50 hover:ring-gray-600"
                }`}
                style={{
                  backgroundColor: style.background,
                  color: style.text,
                }}
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-black/15 text-lg font-bold flex-shrink-0">
                  {num}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="text-sm font-semibold">
                    {RATING_LABELS[num]}
                  </span>
                  {num >= 7 && (
                    <span className="block text-[10px] opacity-70 mt-0.5">
                      Scores 7+ become nominees
                    </span>
                  )}
                </span>
                {isSelected && (
                  <span className="text-xs font-bold opacity-80">Current</span>
                )}
              </button>
            );
          })}

          {/* Clear rating */}
          {currentRating && (
            <button
              type="button"
              onClick={() => {
                onRate(null);
                onClose();
              }}
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

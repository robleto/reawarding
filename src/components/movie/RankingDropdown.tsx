import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getRatingStyle } from "@/utils/getRatingStyle";
import { hapticLight, hapticMedium } from "@/lib/haptics";

interface RankingDropdownProps {
  ranking: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}

const RANKING_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);
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

export default function RankingDropdown({ ranking, onChange, disabled = false }: RankingDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const style = getRatingStyle(ranking ?? 0);

  // This control sets ratings without going through RatingModal, so it needs
  // its own haptics — same vocabulary as the modal: 7+ is the emergence
  // moment (firmer thunk), everything else is a light tick.
  const commitRating = (value: number | null) => {
    void (value !== null && value >= 7 ? hapticMedium() : hapticLight());
    onChange(value);
    setShowDropdown(false);
  };

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // Close on outside click or Escape
  useEffect(() => {
    if (!showDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDropdown(false);
    };
    if (!isMobile) {
      document.addEventListener('mousedown', handleClick, true);
    }
    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('mousedown', handleClick, true);
      document.removeEventListener('keydown', handleKey, true);
    };
  }, [showDropdown, isMobile]);

  return (
    <div className="relative z-30" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setShowDropdown(!showDropdown)}
        className={`font-bold px-3 py-1 min-h-[44px] rounded-lg border border-gray-700 bg-charcoal-900/80 text-white ${ranking ? 'text-base min-w-[44px]' : 'text-xs min-w-[48px]'}`}
        style={{ backgroundColor: style.background, color: style.text }}
      >
        {ranking ?? "Rate"}
      </button>
      {showDropdown && !disabled && !isMobile && (
        <div
          className="absolute right-[-16px] z-50 w-16 mb-1 overflow-y-auto bg-gray-800 rounded shadow-gray-700 bottom-full max-h-60 flex flex-col items-center"
          style={{ minWidth: '3.5rem' }}
        >
          {/* Clear ranking option */}
          <div
            onClick={e => {
              e.stopPropagation();
              commitRating(null);
            }}
            className="mx-auto my-2 text-sm font-semibold text-center cursor-pointer hover:bg-gray-700 text-gray-400 border border-gray-600 rounded w-8 h-8 flex items-center justify-center"
          >
            --
          </div>
          <div className="flex flex-col items-center gap-1">
            {RANKING_OPTIONS.map((num) => {
              const optionStyle = getRatingStyle(num);
              return (
                <div
                  key={num}
                  onClick={e => {
                    e.stopPropagation();
                    commitRating(num);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-sm font-semibold text-center cursor-pointer hover:brightness-110 rounded"
                  style={{ backgroundColor: optionStyle.background, color: optionStyle.text }}
                >
                  {num}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {showDropdown && !disabled && isMobile &&
        createPortal(
          <div className="fixed inset-0 z-[210]" role="dialog" aria-modal="true" aria-label="Select rating">
            <button
              type="button"
              aria-label="Close rating picker"
              className="absolute inset-0 bg-black/55"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-gray-700 bg-charcoal-900 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-600" />
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Set rating</h3>
                <button
                  type="button"
                  onClick={() => setShowDropdown(false)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-sm text-gray-400 hover:text-gray-200"
                >
                  Close
                </button>
              </div>
              <div className="max-h-[52vh] overflow-y-auto space-y-1.5 pb-2">
                {RANKING_OPTIONS.slice().reverse().map((num) => {
                  const optionStyle = getRatingStyle(num);
                  const isSelected = ranking === num;
                  return (
                    <button
                      type="button"
                      key={num}
                      onClick={() => commitRating(num)}
                      className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${
                        isSelected ? "ring-2 ring-gold-400/70" : "ring-1 ring-gray-700"
                      }`}
                      style={{ backgroundColor: optionStyle.background, color: optionStyle.text }}
                    >
                      <span className="inline-flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/20 text-base font-bold">
                          {num}
                        </span>
                        <span className="text-sm font-semibold">{RATING_LABELS[num]}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => commitRating(null)}
                className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm font-medium text-gray-200 hover:bg-gray-700"
              >
                Clear rating
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

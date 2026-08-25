"use client";

import React from "react";

export type AwardsTabKey =
  | "best-picture"
  | "best-animated"
  | "best-comedy"
  | "best-blockbuster";

// Shared with ShareSheet/the OG image route so a shared card's category label
// always matches the ballot it was actually generated from.
export const CATEGORY_LABELS: Record<AwardsTabKey, string> = {
  "best-picture": "Best Picture",
  "best-animated": "Best Animated",
  "best-comedy": "Best Comedy",
  "best-blockbuster": "Best Blockbuster",
};

export function AwardsTabs({ value, onChange }: { value: AwardsTabKey; onChange: (v: AwardsTabKey) => void }) {
  // Re-enabled 2026-08-23 — see docs/FEATURE-STATUS.md for the known,
  // still-open gaps (no dedicated add-film flow for this category, no
  // per-category homepage maturity state, Alternate Oscar History still
  // best-picture-only). Shipping as-is: derived nominees, editing/saving,
  // and sharing all work correctly, it's just not feature-complete yet.
  const tabs: { key: AwardsTabKey; label: string; separator?: boolean }[] = [
    { key: "best-picture", label: "Best Picture" },
    { key: "best-animated", label: "Best Animated" },
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 rounded-xl bg-black/30 border border-gold-500/20 p-1 w-fit">
        {tabs.map((t) => {
          const active = value === t.key;
          return (
            <React.Fragment key={t.key}>
              <button
                type="button"
                onClick={() => onChange(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-gold-500/20 text-gold-300 border border-gold-500/30"
                    : "text-gray-300 hover:text-gold-200"
                }`}
              >
                {t.label}
              </button>
              {t.separator && <div className="h-8 w-px bg-gold-500/30" />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

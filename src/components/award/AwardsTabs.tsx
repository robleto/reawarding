"use client";

import React from "react";

export type AwardsTabKey =
  | "best-picture"
  | "best-animated"
  | "best-comedy"
  | "best-blockbuster";

export function AwardsTabs({ value, onChange }: { value: AwardsTabKey; onChange: (v: AwardsTabKey) => void }) {
  const tabs: { key: AwardsTabKey; label: string; separator?: boolean }[] = [
    { key: "best-picture", label: "Best Picture" },
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 rounded-xl bg-white/5 dark:bg-black/30 border border-gold-500/20 p-1 w-fit">
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

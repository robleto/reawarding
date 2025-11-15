"use client";

import React from "react";

export type AwardsTabKey =
  | "best-picture"
  | "best-animated"
  | "best-comedy"
  | "best-drama";

export function AwardsTabs({ value, onChange }: { value: AwardsTabKey; onChange: (v: AwardsTabKey) => void }) {
  const tabs: { key: AwardsTabKey; label: string }[] = [
    { key: "best-picture", label: "Best Picture" },
    { key: "best-animated", label: "Best Animated" },
    { key: "best-comedy", label: "Best Comedy" },
    { key: "best-drama", label: "Best Drama" },
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 rounded-xl bg-white/5 dark:bg-black/30 border border-yellow-500/20 p-1 w-fit">
        {tabs.map((t) => {
          const active = value === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                  : "text-gray-300 hover:text-yellow-200"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

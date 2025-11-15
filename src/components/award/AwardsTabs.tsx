"use client";

import React from "react";

type TabKey = "best-picture"; // extendable for future tabs

export function AwardsTabs({ value, onChange }: { value: TabKey; onChange: (v: TabKey) => void }) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: "best-picture", label: "Best Picture" },
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

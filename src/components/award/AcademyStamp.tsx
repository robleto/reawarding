import React from "react";
import type { AcademyStatusResult } from "@/data/officialAwardWinners";

/**
 * AcademyStamp — circular ink-stamp treatment for the Upheld/Reawarded
 * verdict, meant for a card's open corner (e.g. the empty space beneath a
 * short nominee grid). Deliberately does not render for "unscreened": even
 * though it's a real state, the user's own award still stands regardless of
 * whether they've seen the Academy's pick, so there's nothing to stamp here.
 */
export default function AcademyStamp({ academyStatus }: { academyStatus: AcademyStatusResult | null | undefined }) {
  if (!academyStatus || academyStatus.status === "unscreened") return null;

  const isUpheld = academyStatus.status === "upheld";
  const ringColor = isUpheld ? "border-emerald-400/70" : "border-amber-400/70";
  const textColor = isUpheld ? "text-emerald-300" : "text-amber-300";

  return (
    <div
      role="status"
      aria-label={isUpheld ? "Upheld: your winner matches the Academy's" : `Reawarded: you overruled the Academy's pick, ${academyStatus.officialTitle}`}
      className="pointer-events-none select-none -rotate-6 opacity-70"
    >
      <div className={`relative flex h-32 w-32 items-center justify-center rounded-full border-[3px] ${ringColor}`}>
        <div className={`absolute inset-2 rounded-full border ${ringColor} opacity-70`} />
        <div className="flex flex-col items-center justify-center text-center leading-none px-2.5">
          <span className={`font-unbounded text-base font-extrabold uppercase tracking-wide ${textColor}`}>
            {isUpheld ? "Upheld" : "Reawarded"}
          </span>
          {!isUpheld && (
            <span className="mt-1 max-w-[92px] truncate text-[9px] uppercase tracking-wider text-gray-400">
              Over {academyStatus.officialTitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

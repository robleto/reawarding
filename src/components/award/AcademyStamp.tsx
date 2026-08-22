import React from "react";
import type { AcademyStatusResult } from "@/data/officialAwardWinners";

/**
 * AcademyStamp — circular ink-stamp treatment for the Upheld/Reawarded
 * verdict, meant for a card's open corner (e.g. the empty space beneath a
 * short nominee grid). Deliberately does not render for "unscreened": even
 * though it's a real state, the user's own award still stands regardless of
 * whether they've seen the Academy's pick, so there's nothing to stamp here.
 *
 * Just the verdict word, no film name — the Academy's actual pick now shows
 * as a small caption under the winner's own title (see AwardCard) instead
 * of crammed into the stamp itself.
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
      <div className={`relative flex h-40 w-40 items-center justify-center rounded-full border-[3px] ${ringColor}`}>
        <div className={`absolute inset-2 rounded-full border ${ringColor} opacity-70`} />
        <span className={`font-unbounded text-lg font-extrabold uppercase tracking-wide ${textColor}`}>
          {isUpheld ? "Upheld" : "Reawarded"}
        </span>
      </div>
    </div>
  );
}

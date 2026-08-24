"use client";

import { NATIVE_LEDGER } from "@/copy/loggedOutHome";

export interface AcademyLedgerReference {
  year: number;
  title: string;
  posterUrl: string;
}

interface AcademyLedgerProps {
  academy: AcademyLedgerReference;
}

/**
 * The open ledger — the Academy's real pick beside an empty slot, never a
 * fabricated one for the visitor. Originally the native first-open screen's
 * proof slot (see NATIVE_LEDGER in src/copy/loggedOutHome.ts for the two
 * rules it follows); shared here because the web hero had the same failure
 * mode NATIVE_LEDGER's own doc comment describes — a single AwardCard
 * showing one film with nothing to have won against, dominating the screen
 * and outweighing the search box above it.
 */
export default function AcademyLedger({ academy }: AcademyLedgerProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between font-mono text-[9px] uppercase tracking-[0.19em] text-gray-500">
        <span>{NATIVE_LEDGER.category}</span>
        <span className="font-semibold text-gold-300">{academy.year}</span>
      </div>

      {/* The two slots are a matched pair, so both are built the same way
          rather than one being a MovieCard and the other a dashed box —
          the comparison only reads if they're visually twins. */}
      <div className="mt-3 grid grid-cols-2 items-start gap-3">
        <div className="min-w-0">
          <span className="mb-1.5 block font-mono text-[8.5px] uppercase tracking-[0.16em] text-gray-500">
            {NATIVE_LEDGER.academyLabel}
          </span>
          <div className="aspect-[2/3] w-full overflow-hidden rounded-md border border-white/10 bg-charcoal-900">
            <img
              src={academy.posterUrl}
              alt={`${academy.title} — the Academy's Best Picture winner for ${academy.year}`}
              className="h-full w-full object-cover"
            />
          </div>
          <p className="mt-1.5 text-[11px] font-medium leading-snug text-gray-300">
            {academy.title}
          </p>
        </div>

        {/* The empty half. Never pre-filled: the visitor hasn't picked
            anything, so nothing here may imply they have. Oxblood rather
            than gold on purpose — gold in this app reads as the Academy's,
            and it's already the colour of the whole screen, so the slot
            that belongs to the user has to sit outside it.
            Two tones, and the split is a contrast requirement, not taste:
            #B3452F is 3.58:1 on the canvas — fine for a border (WCAG UI
            needs 3:1) but a fail for text (needs 4.5:1). Text uses #D9694E
            at 5.72:1. Keep that split if either value is ever retuned. */}
        <div className="min-w-0">
          <span className="mb-1.5 block font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#D9694E]">
            {NATIVE_LEDGER.yoursLabel}
          </span>
          <div
            className="flex aspect-[2/3] w-full items-center justify-center rounded-md border-[1.5px] border-dashed border-[#B3452F]/55"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, rgba(179,69,47,0.05) 0 7px, transparent 7px 14px)",
            }}
            aria-hidden="true"
          >
            <span className="font-mono text-xl text-[#D9694E]">?</span>
          </div>
          <p className="mt-1.5 text-[11px] italic leading-snug text-[#D9694E]">
            {NATIVE_LEDGER.emptyPrompt}
          </p>
        </div>
      </div>

      <p className="mt-2.5 text-[10px] leading-relaxed text-gray-500">
        {NATIVE_LEDGER.foot}
      </p>
    </div>
  );
}

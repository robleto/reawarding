"use client";

import React from 'react';
import Image from 'next/image';
import { normalizeImageUrl } from '@/utils/imageUrl';
import Link from 'next/link';
import { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

export type ReadyMadeCardProps = {
  title: string;
  count: number;
  asterisk?: boolean;
  subtitle: ReactNode;
  meta?: ReactNode; // small disclaimer (e.g. rating-chip filter badge) or progress viz, shown in the card body
  /** True once this suggestion has cleared the threshold and is ready to
   * save — shows a "ready to save" note in the card body instead of the
   * Almost-ready progress viz (`meta`). */
  ready?: boolean;
  posterUrls: string[];
  /** The one primary action for this suggestion — Save button, locked-progress
   * pill, or premium upsell. Rendered full-width at the bottom of the card. */
  primaryAction?: ReactNode;
  viewHref: string;
  dismissForm?: ReactNode; // form node rendering the Dismiss action
  /** When provided, a plain click opens this in-place (the Ready-Made
   * overlay, mirroring ListCard's identical prop) instead of navigating to
   * the routed detail page — the underlying href stays intact for cmd/
   * middle-click, keyboard, and no-JS fallback. */
  onOpen?: () => void;
  /** Stretch to fill the height of a flex-column ancestor instead of the
   * default fixed min-height — see ListCard's identical prop. Also switches
   * the fan-of-posters zone from a fixed 56px inset to a proportional ~1/3
   * of the card's own height, with a wider fan reaching toward the edges. */
  fillHeight?: boolean;
  /** Only meaningful alongside fillHeight — see ListCard's identical prop. */
  focused?: boolean;
};

const FAN_SLOTS = 5;

export default function ReadyMadeCard({
  title,
  count,
  asterisk,
  subtitle,
  meta,
  ready,
  posterUrls,
  primaryAction,
  viewHref,
  dismissForm,
  onOpen,
  fillHeight,
  focused,
}: ReadyMadeCardProps) {
  const handleOpenClick = (e: React.MouseEvent) => {
    if (!onOpen) return;
    // Let cmd/ctrl/shift/middle-click through to the browser's normal
    // open-in-new-tab/new-window behavior instead of hijacking it.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onOpen();
  };

  const fanSlots: (string | null)[] = Array.from({ length: FAN_SLOTS }, (_, i) => posterUrls[i] ?? null);
  const center = (FAN_SLOTS - 1) / 2;

  // fillHeight uses a bigger poster + wider per-slot offset so the fan
  // reaches nearer the card's edges (matches ListCard's identical logic).
  const posterW = fillHeight ? 80 : 64;
  const posterH = fillHeight ? 120 : 96;
  const slotOffset = fillHeight ? 48 : 32;

  const renderFanSlot = (url: string | null, i: number) => (
    <div
      key={i}
      className={`absolute rounded-xl overflow-hidden border-2 ${
        url ? "shadow-lg border-gray-800" : "border-charcoal-900 bg-gray-800"
      }`}
      style={{
        width: posterW,
        height: posterH,
        left: `calc(50% + ${(i - center) * slotOffset}px - ${posterW / 2}px)`,
        zIndex: FAN_SLOTS - Math.abs(i - center),
        transform: `rotate(${(i - 2) * 7}deg)`,
      }}
    >
      {(() => {
        const src = url ? normalizeImageUrl(url) : null;
        return src ? (
          <Image src={src} alt="Movie poster" fill className="object-cover" sizes={`${posterW}px`} />
        ) : url ? (
          <div className="w-full h-full bg-gray-700" />
        ) : null;
      })()}
    </div>
  );

  // Header — category + seen-count promoted above the title (was a cramped
  // footer row) so there's real air between the fan of posters and the name.
  const header = (
    <div className="flex-shrink-0 flex items-start justify-between gap-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-500 truncate">{subtitle}</p>
      <div
        className="flex-shrink-0 flex items-center gap-1 text-gold-300 bg-gold-500/10 px-2.5 py-1 rounded-full text-xs font-mono font-medium"
        title="Films you've seen"
      >
        {count}{asterisk ? "∗" : ""} seen
      </div>
    </div>
  );

  const titleBlock = (
    <h3
      className="flex-shrink-0 mt-2 text-2xl font-bold text-white leading-tight line-clamp-2 group-hover:text-gold-400 transition-colors"
      title={title}
    >
      {title}
    </h3>
  );

  // Body — the space that used to sit empty between the title and the footer
  // stats. Ready suggestions get a note pointing at the actions below;
  // Almost-ready ones get `meta` (the progress viz) instead — both centered
  // in the same space.
  const hasBody = !!meta || !!ready;
  const body = hasBody ? (
    <div className="flex-1 min-h-0 flex flex-col justify-center gap-4 py-2">
      {meta}
      {ready && (
        <div className="flex flex-col items-center gap-2.5 text-center">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gold-500/10 border border-gold-500/20">
            <Sparkles className="w-4 h-4 text-gold-400" />
          </div>
          <p className="text-sm text-gray-300">
            This list is ready.
            <span className="block mt-0.5 text-xs text-gray-500">View it below, or save it to your lists.</span>
          </p>
        </div>
      )}
    </div>
  ) : null;

  // Footer — real buttons now (44px+ tall) instead of small text links, with
  // the primary action (Save / locked-progress / premium upsell) promoted to
  // its own full-width row instead of a small corner pill.
  const footer = (
    <div className="flex-shrink-0 pt-4 space-y-2.5">
      <div className="flex items-center gap-2">
        <Link
          href={viewHref}
          onClick={handleOpenClick}
          className="flex-1 inline-flex items-center justify-center h-10 rounded-full border border-white/10 bg-white/5 text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-white transition-colors"
        >
          View list
        </Link>
        {dismissForm}
      </div>
      {primaryAction}
    </div>
  );

  // Everything except the footer is one tap target (matches ListCard's
  // whole-card Link) — Save/Dismiss are real <form>/<button> elements, which
  // can't validly nest inside an <a>, so the footer stays a separate strip
  // rather than swallowing the card into one anchor.
  const content = (
    <>
      <Link href={viewHref} onClick={handleOpenClick} className="flex-1 min-h-0 flex flex-col" aria-label={title}>
        {header}
        {titleBlock}
        {body}
      </Link>
      {footer}
    </>
  );

  return (
    <div
      className={`group relative transition-all duration-300 ease-out ${fillHeight ? "h-full flex flex-col" : "pt-14"} ${
        focused === true ? "scale-105" : focused === false ? "scale-95 grayscale opacity-50" : ""
      }`}
    >
      {fillHeight ? (
        <>
          {/* Fan zone — ~1/3 of the card's own height via a 1:2 flex-grow
              ratio against the glass body below, transparent, no border.
              No z-index, and the glass body comes after it in DOM order —
              so the card paints over the posters' lower portion (behind
              the card's translucent glass), with only the upper portion
              of each poster visible above the card's rounded top edge. */}
          <div className="relative flex-1 min-h-0">
            <Link href={viewHref} onClick={handleOpenClick} className="absolute inset-0 flex items-end justify-center pb-5 select-none" aria-label={title}>
              {fanSlots.map((url, i) => renderFanSlot(url, i))}
            </Link>
          </div>
          <div className="rounded-xl shadow-md flex flex-col overflow-hidden bg-charcoal-900/60 border border-gray-700/40 hover:border-gray-600/60 transition-colors flex-[2_2_0%] min-h-0 -mt-8">
            <div className="flex-1 min-h-0 flex flex-col px-6 pt-8 pb-6">{content}</div>
          </div>
        </>
      ) : (
        <>
          {/* Same fan-of-posters treatment as ListCard — dashed placeholder slots
              keep the silhouette stable even before any posters are known. */}
          <Link href={viewHref} onClick={handleOpenClick} className="absolute top-0 left-0 right-0 h-20 flex items-center justify-center z-10 select-none" aria-label={title}>
            {fanSlots.map((url, i) => renderFanSlot(url, i))}
          </Link>
          <div className="rounded-xl shadow-md flex flex-col overflow-hidden min-h-[260px] bg-charcoal-900/60 border border-gray-700/40 hover:border-gray-600/60 transition-colors">
            <div className="flex-1 min-h-0 flex flex-col px-6 pt-12 pb-6">{content}</div>
          </div>
        </>
      )}
    </div>
  );
}

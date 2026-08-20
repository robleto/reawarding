"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { ReactNode } from "react";
import { normalizeImageUrl } from "@/utils/imageUrl";
import ReadyMadeDetailClient, { type ReadyMadeMovie } from "@/components/lists/ReadyMadeDetailClient";

export type ReadyMadeSuggestionDetailProps = {
  category: ReactNode;
  title: string;
  count: number;
  asterisk?: boolean;
  meta?: ReactNode; // rating-chip disclaimer, or the Almost-ready progress viz
  /** Full movie data — only ready-to-save suggestions have it. */
  movies?: ReadyMadeMovie[];
  /** Poster-only fallback for Almost-ready suggestions, which don't carry
   * full movie data. */
  posterUrls?: string[];
  primaryAction?: ReactNode;
  dismissForm?: ReactNode;
  /** Injected by ReadyMadeExpandOverlay via cloneElement once mounted. */
  onRequestClose?: () => void;
};

export default function ReadyMadeSuggestionDetail({
  category,
  title,
  count,
  asterisk,
  meta,
  movies,
  posterUrls,
  primaryAction,
  dismissForm,
  onRequestClose,
}: ReadyMadeSuggestionDetailProps) {
  return (
    <div className="max-w-screen-xl py-6 pb-28 md:py-10 md:pb-10 mx-auto">
      {/* Same glass-chip close affordance as ListDetailView's overlay variant —
          this is a dismissible sheet, not a routed page, so no "Back to
          Ready-Made" button here; closing/swiping down returns to the
          carousel it came from. */}
      <button
        type="button"
        onClick={onRequestClose}
        aria-label="Close"
        className="flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="mt-5 mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-gray-500">{category}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-unbounded uppercase tracking-wide text-white" title={title}>
            {title}
          </h1>
          <span className="flex-shrink-0 flex items-center gap-1 text-gold-300 bg-gold-500/10 px-2.5 py-1 rounded-full text-xs font-mono font-medium">
            {count}{asterisk ? "∗" : ""} seen
          </span>
        </div>
        {meta && <div className="mt-3">{meta}</div>}
      </div>

      {primaryAction && <div className="mb-8 max-w-xs">{primaryAction}</div>}

      {movies && movies.length > 0 ? (
        <ReadyMadeDetailClient movies={movies} />
      ) : posterUrls && posterUrls.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 max-w-md">
          {posterUrls.map((url, i) => {
            const src = normalizeImageUrl(url);
            return (
              <div key={i} className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 border border-gray-700/40">
                {src && <Image src={src} alt="" fill className="object-cover" sizes="120px" />}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-400">Not enough seen films yet to preview this list.</p>
      )}

      {dismissForm && <div className="mt-8 max-w-xs">{dismissForm}</div>}
    </div>
  );
}

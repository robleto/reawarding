/**
 * FilmEntryPanel — Logged-out onboarding entry panel for film detail pages.
 *
 * Shown only to unauthenticated users. Replaces the old thin amber banner with
 * a visually rich panel that communicates the year's competitive context and
 * invites the user to enter the award workspace in one click.
 *
 * Animation: fade + slide-up using inline styles + IntersectionObserver
 * (via useMotionReveal). Deliberately avoids the global .motion-reveal CSS
 * class, which is scoped to home-shell panels and would cause style leakage
 * on film detail pages that don't carry that context.
 */

"use client";

import { useRef } from "react";
import Image from "next/image";
import { Trophy } from "lucide-react";
import { normalizeImageUrl } from "@/utils/imageUrl";
import { useMotionReveal } from "@/hooks/useMotionReveal";

interface FilmEntryPanelProps {
  film: { id: number; title: string };
  year: number;
  /** Top acclaimed films from the same year (excluding this film) — shown as decorative previews */
  peerMovies: Array<{
    id: number;
    title: string;
    cached_poster_url?: string | null;
    poster_url?: string | null;
  }>;
}

export default function FilmEntryPanel({ film, year, peerMovies }: FilmEntryPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  // useMotionReveal fires once when ≥15% of the panel enters the viewport.
  // Passing reducedMotion=false here; the OS preference is handled at layout
  // level — film pages don't have a reducedMotion prop chain yet.
  const isVisible = useMotionReveal(false, panelRef);

  return (
    <div
      ref={panelRef}
      className="mb-8"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 780ms cubic-bezier(0.22,1,0.36,1), transform 780ms cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <div className="rounded-2xl border border-yellow-500/20 bg-gray-900/80 backdrop-blur-sm shadow-xl overflow-hidden">

        {/* Gold gradient accent line across the top */}
        <div className="h-px bg-gradient-to-r from-yellow-500/70 via-yellow-400/30 to-transparent" />

        <div className="px-6 py-8">

          {/* Year + category badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-yellow-500/15 border border-yellow-500/20 text-yellow-400 text-xs font-semibold mb-4">
            <Trophy className="w-3 h-3" />
            {year} Best Picture
          </div>

          {/* Headline */}
          <h2 className="text-2xl font-unbounded font-bold text-white mb-3 leading-tight">
            Step into {year}.
          </h2>

          {/* Supporting text */}
          <p className="text-sm text-gray-300 leading-relaxed max-w-lg mb-6">
            <span className="text-yellow-400/90 font-medium">{film.title}</span>{" "}
            competed alongside the year&apos;s most acclaimed films. Explore the nominees,
            rate what you&apos;ve seen, and choose your winner.
          </p>

          {/* CTA + reassurance line */}
          <div className="flex flex-col items-start gap-2 mb-8">
            <a
              href={`/?movie=${film.id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-yellow-400/20 hover:-translate-y-px active:translate-y-0 active:shadow-md"
            >
              Enter {year} Awards
              <span aria-hidden="true">→</span>
            </a>
            <span className="text-xs text-gray-500">No account required to begin.</span>
          </div>

          {/* Peer film thumbnails — decorative preview of year peers */}
          {peerMovies.length > 0 && (
            <div
              className="flex gap-2"
              aria-hidden="true"
              role="presentation"
            >
              {peerMovies.slice(0, 5).map((peer) => {
                const posterSrc = normalizeImageUrl(peer.cached_poster_url ?? peer.poster_url ?? null);
                return (
                  <div
                    key={peer.id}
                    className="w-14 h-20 rounded-md overflow-hidden bg-gray-800 shrink-0 opacity-60"
                  >
                    {posterSrc ? (
                      <Image
                        src={posterSrc}
                        alt=""
                        width={56}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-700" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

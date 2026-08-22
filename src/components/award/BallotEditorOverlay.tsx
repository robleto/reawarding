"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface BallotEditorOverlayProps {
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * BallotEditorOverlay — the shared dismissible-overlay shell for ballot
 * editing (used by both My Awards' explicit-save editor and Home's
 * auto-saving workshop editor). z-[45]: above ordinary page content and the
 * mobile tab bar (z-40), but strictly below the sticky header, MovieDetailModal,
 * and RatingModal (z-50 / z-[220]). That ordering matters — a prior version of
 * this overlay sat at z-[80], *above* MovieDetailModal, so a poster tap inside
 * it opened a detail modal that rendered invisibly behind the overlay's own
 * backdrop. Keeping this below 50 guarantees anything opened from inside
 * (MovieDetailModal, RatingModal) renders on top instead.
 *
 * Escape here is best-effort: if a modal opened from inside this overlay is
 * also open, Escape may close both at once rather than just the top layer.
 * Acceptable — the bug this replaces was about visual stacking, not Escape
 * semantics.
 */
export default function BallotEditorOverlay({ onClose, children }: BallotEditorOverlayProps) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[45]">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none"
      />
      <div
        className="relative h-full overflow-y-auto animate-in slide-in-from-bottom duration-300 sm:zoom-in-95 sm:fade-in sm:slide-in-from-bottom-0 motion-reduce:animate-none"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* No horizontal/vertical padding below sm — the panel's own p-4
            below is the only margin from the true screen edge on mobile
            (16px, matching AppShell's own px-4 convention used everywhere
            else). The previous px-3 py-4 here on top of the panel's p-4
            stacked to ~28px of dead space on each side. */}
        <div className="mx-auto w-full max-w-screen-lg sm:px-6 sm:py-12 md:py-20">
          <div className="relative rounded-none sm:rounded-2xl bg-charcoal-900 sm:border sm:border-gray-700/50 sm:shadow-2xl min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] sm:min-h-0 p-4 sm:p-6 md:p-8">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close ballot editor"
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex items-center justify-center w-11 h-11 rounded-full bg-gray-800/80 text-gray-300 hover:text-white hover:bg-gray-700 active:scale-[0.98] transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

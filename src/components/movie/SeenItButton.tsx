"use client";

import React from "react";
import { Eye, EyeOff, Bookmark } from "lucide-react";

interface SeenItButtonProps {
  seenIt: boolean;
  onClick: () => void;
  /** Called only when transitioning to seen (unseen→seen or watchlist→seen) */
  onJustSeen?: () => void;
  // ── 3-state watchlist extension (backward-compatible) ──────────────────
  /** Whether the film is on the user's watchlist. Enables 3-state mode when provided. */
  isOnWatchlist?: boolean;
  /**
   * Called when the watchlist membership should change.
   * - unseen → watchlist: called once (adds to watchlist)
   * - watchlist → seen: called once (removes from watchlist) + onClick called too
   * When absent, button behaves as the original 2-state seen/unseen toggle.
   */
  onWatchlistToggle?: () => void;
  // ── display ────────────────────────────────────────────────────────────
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "compact";
  className?: string;
}

export default function SeenItButton({
  seenIt,
  onClick,
  onJustSeen,
  isOnWatchlist,
  onWatchlistToggle,
  showText = true,
  size = "md",
  variant = "default",
  className = "",
}: SeenItButtonProps) {
  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const baseVariant =
    variant === "compact"
      ? "flex items-center justify-center p-2.5 rounded transition-colors focus:outline-none"
      : "flex items-center gap-1 text-sm font-medium focus:outline-none";

  // Derive current watch-state
  const isThreeState = onWatchlistToggle !== undefined;
  const watchState: "seen" | "watchlist" | "unseen" = seenIt
    ? "seen"
    : isThreeState && isOnWatchlist
    ? "watchlist"
    : "unseen";

  // Colours per state
  const colorClass =
    watchState === "seen"
      ? "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
      : watchState === "watchlist"
      ? "text-amber-400 hover:text-amber-300"
      : "text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300";

  const compactHoverClass =
    variant === "compact"
      ? watchState === "seen"
        ? "hover:bg-blue-50 dark:hover:bg-blue-900/20"
        : watchState === "watchlist"
        ? "hover:bg-amber-50 dark:hover:bg-amber-900/20"
        : "hover:bg-gray-50 dark:hover:bg-gray-800"
      : "";

  const titles = {
    seen: "Mark as unseen",
    watchlist: "Mark as seen",
    unseen: isThreeState ? "Want to see" : "Track this film",
  };

  const labels = {
    seen: "Seen",
    watchlist: "Want to See",
    unseen: "Unseen",
  };

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (watchState === "unseen") {
      if (isThreeState) {
        // unseen → watchlist: add to watchlist only
        onWatchlistToggle!();
      } else {
        // 2-state fallback: mark as seen
        onClick();
        onJustSeen?.();
      }
    } else if (watchState === "watchlist") {
      // watchlist → seen: mark seen + remove from watchlist
      onClick();
      onJustSeen?.();
      onWatchlistToggle!();
    } else {
      // seen → unseen
      onClick();
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${baseVariant} ${colorClass} ${compactHoverClass} ${className}`}
      title={titles[watchState]}
    >
      {watchState === "seen" ? (
        <>
          <Eye className={iconSizes[size]} />
          {showText && <span>{labels.seen}</span>}
        </>
      ) : watchState === "watchlist" ? (
        <>
          <Bookmark className={`${iconSizes[size]} fill-current`} />
          {showText && <span>{labels.watchlist}</span>}
        </>
      ) : (
        <>
          <EyeOff className={iconSizes[size]} />
          {showText && <span>{labels.unseen}</span>}
        </>
      )}
    </button>
  );
}

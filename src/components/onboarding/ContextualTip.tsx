"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import useOnboardingState from "@/hooks/useOnboardingState";
import type { ContextualTipId } from "@/hooks/useOnboardingState";

interface TipDefinition {
  id: ContextualTipId;
  title: string;
  message: string;
}

/**
 * Registry of all contextual tips. Each is shown once, at the right moment.
 */
export const CONTEXTUAL_TIPS: Record<ContextualTipId, TipDefinition> = {
  "first-rating": {
    id: "first-rating",
    title: "Ratings are your starting signal",
    message:
      "They help us estimate how strongly you feel about each film. These are a first signal, not a permanent verdict.",
  },
  "first-comparison": {
    id: "first-comparison",
    title: "Settling a close call",
    message:
      "These two films are close in your current rankings. A quick head-to-head choice helps place them more confidently.",
  },
  "incomplete-year": {
    id: "incomplete-year",
    title: "This year is still early",
    message:
      "A few more ratings will make your contenders and rankings much more reliable. You can always come back to add more.",
  },
  disagreement: {
    id: "disagreement",
    title: "Your race, your rules",
    message:
      "Interesting \u2014 your current leader isn\u2019t the usual favorite. That\u2019s the point: this race reflects your taste, not consensus.",
  },
  "category-unlock": {
    id: "category-unlock",
    title: "New category available",
    message:
      "You\u2019ve rated enough films to start shaping additional award categories like Best Director or Best Actress.",
  },
};

interface ContextualTipProps {
  tipId: ContextualTipId;
  /** Only show if this condition is true */
  show?: boolean;
  /** Position relative to the trigger element */
  position?: "above" | "below" | "inline";
  /** Auto-dismiss after ms (0 = manual dismiss only) */
  autoDismissMs?: number;
  className?: string;
}

export default function ContextualTip({
  tipId,
  show = true,
  position = "inline",
  autoDismissMs = 0,
  className = "",
}: ContextualTipProps) {
  const { tipsSeen, markTipSeen } = useOnboardingState();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const alreadySeen = tipsSeen.includes(tipId);
  const tip = CONTEXTUAL_TIPS[tipId];

  useEffect(() => {
    if (show && !alreadySeen && !dismissed) {
      // Small delay so the tip feels contextual, not instant
      const timer = setTimeout(() => setVisible(true), 400);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [show, alreadySeen, dismissed]);

  useEffect(() => {
    if (visible && autoDismissMs > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [visible, autoDismissMs]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setVisible(false);
    markTipSeen(tipId);
  }, [markTipSeen, tipId]);

  if (!visible || !tip) return null;

  const positionClasses = {
    above: "mb-3",
    below: "mt-3",
    inline: "",
  }[position];

  return (
    <div
      className={`contextual-tip ${positionClasses} ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 rounded-xl border border-yellow-500/15 bg-gray-900/80 backdrop-blur-sm px-4 py-3 shadow-lg">
        {/* Gold accent bar */}
        <div className="mt-0.5 h-8 w-0.5 flex-shrink-0 rounded-full bg-yellow-400/60" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-yellow-300/90 mb-0.5">
            {tip.title}
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">
            {tip.message}
          </p>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-gray-600 hover:text-gray-400 transition-colors"
          aria-label="Dismiss tip"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Hook to check if a contextual tip should be shown.
 * Returns { shouldShow, markSeen } for imperative usage.
 */
export function useContextualTip(tipId: ContextualTipId) {
  const { tipsSeen, markTipSeen } = useOnboardingState();
  const alreadySeen = tipsSeen.includes(tipId);

  return {
    shouldShow: !alreadySeen,
    markSeen: () => markTipSeen(tipId),
  };
}

"use client";

import { useEffect, useRef } from "react";
import { Award, Trophy, X } from "lucide-react";

interface Props {
  year: number;
  milestone: 5 | 10;
  winnerTitle: string;
  onClose: () => void;
}

export default function BallotMilestoneOverlay({
  year,
  milestone,
  winnerTitle,
  onClose,
}: Props) {
  const confettiPromiseRef = useRef<Promise<any> | null>(null);

  useEffect(() => {
    confettiPromiseRef.current ??= import("canvas-confetti");
    void confettiPromiseRef.current
      .then(({ default: confetti }) => {
        const end = Date.now() + 1400;
        const fire = () => {
          confetti({
            particleCount: 70,
            spread: 70,
            startVelocity: 38,
            origin: { x: 0.25, y: 0.2 },
            colors: ["#facc15", "#fbbf24", "#f59e0b", "#d97706", "#ffffff"],
            disableForReducedMotion: true,
          });
          confetti({
            particleCount: 70,
            spread: 70,
            startVelocity: 38,
            origin: { x: 0.75, y: 0.2 },
            colors: ["#facc15", "#fbbf24", "#f59e0b", "#d97706", "#ffffff"],
            disableForReducedMotion: true,
          });
          if (Date.now() < end) {
            requestAnimationFrame(fire);
          }
        };
        fire();
      })
      .catch(() => {
        // Non-critical enhancement.
      });
  }, [onClose]);

  const heading = milestone === 10 ? "Your full ballot is complete." : "You just built a standard ballot.";
  const body =
    milestone === 10
      ? `${winnerTitle} is holding Best Picture with all 10 nominee slots filled for ${year}.`
      : `${winnerTitle} is your current Best Picture winner, and ${year} now has a real five-film ballot.`;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-24 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-xl rounded-2xl border border-yellow-500/40 bg-gray-950/92 shadow-2xl shadow-yellow-500/10 backdrop-blur-md">
        <div className="flex items-start gap-4 px-5 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-yellow-500/15 text-yellow-300">
            {milestone === 10 ? <Trophy className="h-5 w-5" /> : <Award className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-yellow-400/70">
              {year} ballot milestone
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">{heading}</h3>
            <p className="mt-1 text-sm leading-6 text-gray-300">{body}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Dismiss celebration"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

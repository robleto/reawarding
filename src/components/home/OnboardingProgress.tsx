"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { OnboardingProgress } from "@/hooks/useOnboardingProgress";

interface OnboardingProgressProps {
  progress: OnboardingProgress;
  onboardingMessage: {
    title: string;
    message: string;
    cta: string;
    ctaLink: string;
  };
}

export default function OnboardingProgressComponent({ progress, onboardingMessage }: OnboardingProgressProps) {
  const { nextMilestone, percentToNextMilestone, totalRanked } = progress;

  // Show full onboarding for users with 0-24 ratings
  if (totalRanked >= 25) return null;

  return (
    <div className="mb-8">
      <div className="bg-gray-900/60 border border-yellow-500/20 backdrop-blur-sm rounded-2xl p-6 shadow-md">
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl font-bold text-white">
            {onboardingMessage.title}
          </h2>
          <p className="text-gray-300">
            {onboardingMessage.message}
          </p>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-gray-800 text-gray-200 border border-gray-700">Try 1994</span>
            <span className="px-2 py-1 rounded-full bg-gray-800 text-gray-200 border border-gray-700">Or 2019</span>
            <span className="px-2 py-1 rounded-full bg-gray-800 text-gray-200 border border-gray-700">Any year you know well</span>
          </div>

          {nextMilestone && (
            <div className="pt-1">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>{nextMilestone.title}</span>
                <span>{nextMilestone.current}/{nextMilestone.threshold}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, percentToNextMilestone)}%` }}
                />
              </div>
            </div>
          )}

          <div>
            <Link
              href={onboardingMessage.ctaLink}
              className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30 rounded-lg font-medium transition-colors"
            >
              {onboardingMessage.cta}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Star, List, Trophy, Award, ArrowRight, Lock } from "lucide-react";
import Link from "next/link";
import type { OnboardingProgress, OnboardingMilestone } from "@/hooks/useOnboardingProgress";

interface OnboardingProgressProps {
  progress: OnboardingProgress;
  onboardingMessage: {
    title: string;
    message: string;
    cta: string;
    ctaLink: string;
  };
}

const iconMap = {
  star: Star,
  list: List,
  trophy: Trophy,
  award: Award,
};

export default function OnboardingProgressComponent({ progress, onboardingMessage }: OnboardingProgressProps) {
  const { milestones, nextMilestone, percentToNextMilestone, totalRanked } = progress;

  // Show full onboarding for users with 0-24 ratings
  if (totalRanked >= 25) return null;

  return (
    <div className="mb-8">
      {/* Main Message Card */}
      <div className="bg-charcoal-900/60 border border-gold-500/20 backdrop-blur-sm rounded-2xl p-6 mb-6 shadow-md hover:shadow-lg transition-all duration-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">
              {onboardingMessage.title}
            </h2>
            <p className="text-gray-300 mb-4">
              {onboardingMessage.message}
            </p>
            <Link
              href={onboardingMessage.ctaLink}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500/20 hover:bg-gold-500/30 text-gold-300 border border-gold-500/30 rounded-lg font-medium transition-colors"
            >
              {onboardingMessage.cta}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Progress Circle */}
          {nextMilestone && (
            <div className="hidden sm:flex flex-col items-center">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-gray-700"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - percentToNextMilestone / 100)}`}
                    className="text-gold-400 transition-all duration-500"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">
                    {nextMilestone.current}/{nextMilestone.threshold}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center max-w-[100px]">
                {nextMilestone.title}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Milestones Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {milestones.map((milestone) => {
          const Icon = iconMap[milestone.icon];
          const isNext = nextMilestone?.id === milestone.id;

          return (
            <div
              key={milestone.id}
              className={`
                bg-charcoal-900/60 border backdrop-blur-sm relative p-4 rounded-xl shadow-md transition-all
                ${milestone.isUnlocked
                  ? 'border-green-500/30 ring-2 ring-green-500/20'
                  : isNext
                  ? 'border-gold-500/30 ring-2 ring-gold-500/30'
                  : 'border-gray-700/40 opacity-60'
                }
              `}
            >
              <div className="flex items-start justify-between mb-2">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${milestone.isUnlocked
                      ? 'bg-green-500/20'
                      : isNext
                      ? 'bg-gold-500/20'
                      : 'bg-gray-700/50'
                    }
                  `}
                >
                  {milestone.isUnlocked ? (
                    <Icon className="w-5 h-5 text-green-400" />
                  ) : (
                    <Lock className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                {milestone.isUnlocked && (
                  <span className="text-xs font-semibold text-green-400">
                    ✓ Done
                  </span>
                )}
              </div>

              <h3 className="font-semibold text-sm text-white mb-1">
                {milestone.title}
              </h3>
              <p className="text-xs text-gray-400 mb-2">
                {milestone.description}
              </p>

              {!milestone.isUnlocked && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>{milestone.current}/{milestone.threshold}</span>
                    <span>{Math.round((milestone.current / milestone.threshold) * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isNext
                          ? 'bg-gold-400'
                          : 'bg-gray-600'
                      }`}
                      style={{ width: `${Math.min(100, (milestone.current / milestone.threshold) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {milestone.isUnlocked && (
                <p className="text-xs text-green-300 mt-2">
                  🎉 {milestone.unlocks}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

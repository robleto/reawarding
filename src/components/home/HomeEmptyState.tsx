"use client";

import { Trophy, Star, ArrowRight, Calendar, Award, List, Lock } from "lucide-react";
import Link from "next/link";
import type { OnboardingProgress } from "@/hooks/useOnboardingProgress";

interface HomeEmptyStateProps {
  progress?: OnboardingProgress;
}

const iconMap = {
  star: Star,
  list: List,
  trophy: Trophy,
  award: Award,
};

export default function HomeEmptyState({ progress }: HomeEmptyStateProps) {
  const nextMilestone = progress?.nextMilestone;
  const Icon = nextMilestone ? iconMap[nextMilestone.icon] : Star;
  
  return (
    <div className="mb-8">
      <div className="text-center pt-8 pb-4 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Compact Hero */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <img 
              src="/oscarworthy-logomark.svg" 
              alt="Golden Envelope" 
              className="w-12 h-12" 
            />
            <h1 className="text-2xl font-unbounded uppercase text-gray-900 dark:text-white">
              Welcome to Reawarding
            </h1>
          </div>
          <p className="text-base text-gray-600 dark:text-gray-300 mb-6">
            Rate movies, create your awards ceremony, and discover your next favorite film.
          </p>

          {/* Next Milestone - Compact Single Card */}
          {nextMilestone && (
            <div className="max-w-3xl mx-auto mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 backdrop-blur-sm border border-blue-200 dark:border-blue-800 rounded-xl p-4 md:p-3 shadow-md">
                {/* Mobile: Stacked Layout */}
                <div className="flex md:hidden items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                      Next: {nextMilestone.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {nextMilestone.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 mb-1.5">
                      <span className="font-medium">{nextMilestone.current} / {nextMilestone.threshold}</span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">{Math.round((nextMilestone.current / nextMilestone.threshold) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500"
                        style={{ width: `${Math.min(100, (nextMilestone.current / nextMilestone.threshold) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Desktop: Single Line Layout */}
                <div className="hidden md:flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-shrink-0">
                    <h4 className="font-semibold text-xs text-gray-900 dark:text-white leading-tight">
                      Next: {nextMilestone.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                      {nextMilestone.description}
                    </p>
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500"
                        style={{ width: `${Math.min(100, (nextMilestone.current / nextMilestone.threshold) * 100)}%` }}
                      />
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                      <span className="font-medium">{nextMilestone.current}/{nextMilestone.threshold}</span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">{Math.round((nextMilestone.current / nextMilestone.threshold) * 100)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Compact Action */}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            Start by{' '}
            <Link href="/films" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              browsing films
            </Link>
            {' '}below or explore{' '}
            <Link href="/films/collections" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              curated collections
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

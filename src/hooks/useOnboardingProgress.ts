import { useMemo } from 'react';
import type { Movie } from '@/types/types';

export interface OnboardingMilestone {
  id: string;
  title: string;
  description: string;
  threshold: number;
  unlocks: string;
  isUnlocked: boolean;
  current: number;
  icon: 'star' | 'list' | 'trophy' | 'award';
}

export interface OnboardingProgress {
  totalRanked: number;
  yearBreakdown: Record<number, number>; // year -> count of ranked movies
  maxInYear: number;
  yearsWithMovies: number;
  milestones: OnboardingMilestone[];
  nextMilestone: OnboardingMilestone | null;
  percentToNextMilestone: number;
}

/**
 * Calculate onboarding progress from user's ranked movies
 * Works for both guest (localStorage) and authenticated users
 */
export function useOnboardingProgress(movies: Movie[]): OnboardingProgress {
  return useMemo(() => {
    // Count movies with rankings (rating 1-10)
    const rankedMovies = movies.filter(m => {
      const ranking = m.rankings?.[0]?.ranking;
      return ranking !== null && ranking !== undefined && ranking >= 1 && ranking <= 10;
    });

    const totalRanked = rankedMovies.length;

    // Count ranked movies per year
    const yearBreakdown: Record<number, number> = {};
    rankedMovies.forEach(movie => {
      if (movie.release_year) {
        yearBreakdown[movie.release_year] = (yearBreakdown[movie.release_year] || 0) + 1;
      }
    });

    const maxInYear = Math.max(0, ...Object.values(yearBreakdown));
    const yearsWithMovies = Object.keys(yearBreakdown).length;

    // Define milestones
    const milestones: OnboardingMilestone[] = [
      {
        id: 'first-rating',
        title: 'First Steps',
        description: 'Rate your first movie',
        threshold: 1,
        unlocks: 'Journey begins',
        isUnlocked: totalRanked >= 1,
        current: totalRanked,
        icon: 'star',
      },
      {
        id: 'unlock-rankings',
        title: 'Rankings Unlocked',
        description: 'Rate 5 movies to unlock Rankings page',
        threshold: 5,
        unlocks: 'Rankings feature',
        isUnlocked: totalRanked >= 5,
        current: totalRanked,
        icon: 'list',
      },
      {
        id: 'unlock-awards',
        title: 'Awards Ready',
        description: 'Rate 10 movies in the same year to create awards',
        threshold: 10,
        unlocks: 'Awards ceremony',
        isUnlocked: maxInYear >= 10,
        current: maxInYear,
        icon: 'trophy',
      },
      {
        id: 'experienced',
        title: 'Film Critic',
        description: 'Rate 25 movies across multiple years',
        threshold: 25,
        unlocks: 'Advanced features',
        isUnlocked: totalRanked >= 25,
        current: totalRanked,
        icon: 'award',
      },
    ];

    // Find next milestone
    const nextMilestone = milestones.find(m => !m.isUnlocked) || null;

    // Calculate progress to next milestone
    let percentToNextMilestone = 100;
    if (nextMilestone) {
      percentToNextMilestone = Math.min(
        100,
        Math.round((nextMilestone.current / nextMilestone.threshold) * 100)
      );
    }

    return {
      totalRanked,
      yearBreakdown,
      maxInYear,
      yearsWithMovies,
      milestones,
      nextMilestone,
      percentToNextMilestone,
    };
  }, [movies]);
}

/**
 * Get user-friendly message about what to do next
 */
export function getOnboardingMessage(progress: OnboardingProgress): {
  title: string;
  message: string;
  cta: string;
  ctaLink: string;
} {
  const { totalRanked, maxInYear, nextMilestone } = progress;

  // Brand new user (0 ratings)
  if (totalRanked === 0) {
    return {
      title: 'Welcome to ReAwarding!',
      message: 'Start by rating a few movies to unlock personalized rankings and awards.',
      cta: 'Browse Curated Collections',
      ctaLink: '/films/collections',
    };
  }

  // 1-4 ratings (working toward Rankings unlock)
  if (totalRanked < 5) {
    return {
      title: `Great start! ${5 - totalRanked} more to unlock Rankings`,
      message: 'Keep rating movies to see your personalized rankings page.',
      cta: 'Continue Rating',
      ctaLink: '/films/collections',
    };
  }

  // 5-9 ratings (Rankings unlocked, working toward Awards)
  if (totalRanked >= 5 && maxInYear < 10) {
    return {
      title: 'Rankings unlocked! 🎉',
      message: `Rate ${10 - maxInYear} more movies from the same year to create your first awards ceremony.`,
      cta: 'View My Rankings',
      ctaLink: '/rankings',
    };
  }

  // 10+ in a year (Awards unlocked)
  if (maxInYear >= 10) {
    return {
      title: 'Awards unlocked! 🏆',
      message: 'You can now create custom award ceremonies for years with 10+ rated movies.',
      cta: 'Create Awards',
      ctaLink: '/awards',
    };
  }

  // Fallback
  return {
    title: 'Keep going!',
    message: nextMilestone?.description || 'Rate more movies to unlock features.',
    cta: 'Browse Films',
    ctaLink: '/films',
  };
}

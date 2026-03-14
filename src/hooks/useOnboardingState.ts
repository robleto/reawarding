import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Onboarding state — persisted to localStorage.
 * Tracks intro completion, guided setup progress, contextual tips seen,
 * and session count for return-visit coaching.
 */

export type OnboardingStage =
  | 'intro'          // hasn't seen intro slides yet
  | 'year-selection' // saw intro, picking a year
  | 'rating'         // picked a year, rating films
  | 'payoff'         // enough ratings to show first payoff
  | 'complete';      // onboarding flow finished

export type ContextualTipId =
  | 'first-rating'
  | 'first-comparison'
  | 'incomplete-year'
  | 'disagreement'
  | 'category-unlock';

interface OnboardingState {
  // Core flow
  hasSeenIntro: boolean;
  stage: OnboardingStage;
  firstYearSelected: number | null;
  starterRatingsCount: number;
  hasSeenPayoff: boolean;
  hasDismissedOnboarding: boolean;

  // Contextual tips
  tipsSeen: ContextualTipId[];

  // Session tracking
  sessionCount: number;
  lastSessionDate: string | null; // ISO date string (date only, e.g. "2026-03-12")

  // Actions
  completeIntro: () => void;
  selectFirstYear: (year: number) => void;
  incrementStarterRatings: () => void;
  setStarterRatingsCount: (count: number) => void;
  markPayoffSeen: () => void;
  advanceStage: (stage: OnboardingStage) => void;
  markTipSeen: (tipId: ContextualTipId) => void;
  hasTipBeenSeen: (tipId: ContextualTipId) => boolean;
  dismissOnboarding: () => void;
  recordSession: () => void;
  resetOnboarding: () => void;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const useOnboardingState = create<OnboardingState>()(
  persist(
    (set, get) => ({
      hasSeenIntro: false,
      stage: 'intro',
      firstYearSelected: null,
      starterRatingsCount: 0,
      hasSeenPayoff: false,
      hasDismissedOnboarding: false,
      tipsSeen: [],
      sessionCount: 1,
      lastSessionDate: todayISO(),

      completeIntro: () =>
        set({ hasSeenIntro: true, stage: 'year-selection' }),

      selectFirstYear: (year: number) =>
        set({ firstYearSelected: year, stage: 'rating' }),

      incrementStarterRatings: () =>
        set((state) => {
          const next = state.starterRatingsCount + 1;
          const newStage = next >= 3 && state.stage === 'rating' ? 'payoff' : state.stage;
          return { starterRatingsCount: next, stage: newStage };
        }),

      setStarterRatingsCount: (count: number) =>
        set((state) => {
          const newStage = count >= 3 && state.stage === 'rating' ? 'payoff' : state.stage;
          return { starterRatingsCount: count, stage: newStage };
        }),

      markPayoffSeen: () =>
        set({ hasSeenPayoff: true, stage: 'complete' }),

      advanceStage: (stage: OnboardingStage) => set({ stage }),

      markTipSeen: (tipId: ContextualTipId) =>
        set((state) => ({
          tipsSeen: state.tipsSeen.includes(tipId)
            ? state.tipsSeen
            : [...state.tipsSeen, tipId],
        })),

      hasTipBeenSeen: (tipId: ContextualTipId) =>
        get().tipsSeen.includes(tipId),

      dismissOnboarding: () =>
        set({ hasDismissedOnboarding: true, stage: 'complete' }),

      recordSession: () =>
        set((state) => {
          const today = todayISO();
          if (state.lastSessionDate === today) return state;
          return {
            sessionCount: state.sessionCount + 1,
            lastSessionDate: today,
          };
        }),

      resetOnboarding: () =>
        set({
          hasSeenIntro: false,
          stage: 'intro',
          firstYearSelected: null,
          starterRatingsCount: 0,
          hasSeenPayoff: false,
          hasDismissedOnboarding: false,
          tipsSeen: [],
          sessionCount: 1,
          lastSessionDate: todayISO(),
        }),
    }),
    {
      name: 'reawarding-onboarding',
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch {
          // Fallback for SSR / Safari private
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
      }),
      partialize: (state) => ({
        hasSeenIntro: state.hasSeenIntro,
        stage: state.stage,
        firstYearSelected: state.firstYearSelected,
        starterRatingsCount: state.starterRatingsCount,
        hasSeenPayoff: state.hasSeenPayoff,
        hasDismissedOnboarding: state.hasDismissedOnboarding,
        tipsSeen: state.tipsSeen,
        sessionCount: state.sessionCount,
        lastSessionDate: state.lastSessionDate,
      }),
    }
  )
);

export default useOnboardingState;

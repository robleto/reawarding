import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import type { Database } from '@/types/supabase';
import { clearAllGuestData, updateGuestRanking } from '@/utils/guestMode';

interface GuestRanking {
  movieId: string;
  ranking: number | null;
  seenIt: boolean;
  timestamp: number;
}

/**
 * Guest award — v1 simplification: keyed by year, category always "best-picture".
 */
export interface GuestAward {
  year: number;
  category: 'best-picture';
  winnerId: string;
  nomineeIds: string[];
  source: 'seed_pick' | 'ranking_calc' | 'manual';
  revisionNumber: number;
  timestamp: number;
}

interface GuestRankingStore {
  rankings: Record<string, GuestRanking>;
  awards: Record<number, GuestAward>;
  hasInteracted: boolean;

  // Ranking actions
  setRanking: (movieId: string, ranking: number | null) => void;
  setSeenIt: (movieId: string, seenIt: boolean) => void;
  updateRanking: (movieId: string, updates: { ranking?: number | null; seenIt?: boolean }) => void;
  getRanking: (movieId: string) => GuestRanking | null;
  clearAllData: () => void;
  getAllRankings: () => GuestRanking[];
  getInteractionCount: () => number;
  hasGuestInteracted: () => boolean;

  // Award actions
  setAward: (year: number, winnerId: string, nomineeIds: string[], source: GuestAward['source']) => void;
  getAward: (year: number) => GuestAward | null;
  getAllAwards: () => GuestAward[];
  getAwardCount: () => number;
  removeAward: (year: number) => void;
}

/**
 * Detect localStorage availability (Safari private browsing, storage full, etc.)
 * Falls back to in-memory-only mode if unavailable.
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__reawarding_ls_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const localStorageAvailable = typeof window !== 'undefined' ? isLocalStorageAvailable() : true;
const STORAGE_WARNING_SESSION_KEY = "reawarding_storage_warning_shown";

const useGuestRankingStore = create<GuestRankingStore>()(
  persist(
    (set, get) => ({
      rankings: {},
      awards: {},
      hasInteracted: false,
      
      setRanking: (movieId: string, ranking: number | null) => {
        set((state) => {
          const existing = state.rankings[movieId] || { movieId, ranking: null, seenIt: false, timestamp: Date.now() };
          const updated = {
            rankings: {
              ...state.rankings,
              [movieId]: {
                ...existing,
                ranking,
                timestamp: Date.now(),
              }
            },
            hasInteracted: true,
          };
          
          // Also update the guestMode utility for banner tracking
          updateGuestRanking(movieId, { ranking });
          
          return updated;
        });
      },
      
      setSeenIt: (movieId: string, seenIt: boolean) => {
        set((state) => {
          const existing = state.rankings[movieId] || { movieId, ranking: null, seenIt: false, timestamp: Date.now() };
          const updated = {
            rankings: {
              ...state.rankings,
              [movieId]: {
                ...existing,
                seenIt,
                timestamp: Date.now(),
              }
            },
            hasInteracted: true,
          };
          
          // Also update the guestMode utility for banner tracking
          updateGuestRanking(movieId, { seenIt });
          
          return updated;
        });
      },
      
      updateRanking: (movieId: string, updates: { ranking?: number | null; seenIt?: boolean }) => {
        set((state) => {
          const existing = state.rankings[movieId] || { movieId, ranking: null, seenIt: false, timestamp: Date.now() };
          const updated = {
            rankings: {
              ...state.rankings,
              [movieId]: {
                ...existing,
                ...updates,
                timestamp: Date.now(),
              }
            },
            hasInteracted: true,
          };
          
          // Also update the guestMode utility for banner tracking
          updateGuestRanking(movieId, updates);
          
          return updated;
        });
      },
      
      getRanking: (movieId: string) => {
        const state = get();
        return state.rankings[movieId] || null;
      },

      clearAllData: () => {
        set({
          rankings: {},
          awards: {},
          hasInteracted: false,
        });
        if (typeof window !== "undefined") {
          clearAllGuestData();
          localStorage.removeItem("reawarding-save-prompt-dismissed");
        }
      },

      getAllRankings: () => {
        const state = get();
        return Object.values(state.rankings);
      },

      getInteractionCount: () => {
        const state = get();
        return Object.keys(state.rankings).length;
      },

      hasGuestInteracted: () => {
        const state = get();
        return state.hasInteracted;
      },

      // Award actions
      setAward: (year: number, winnerId: string, nomineeIds: string[], source: GuestAward['source']) => {
        set((state) => {
          const existing = state.awards[year];
          const revisionNumber = existing ? existing.revisionNumber + 1 : 1;
          return {
            awards: {
              ...state.awards,
              [year]: {
                year,
                category: 'best-picture' as const,
                winnerId,
                nomineeIds,
                source,
                revisionNumber,
                timestamp: Date.now(),
              },
            },
            hasInteracted: true,
          };
        });
      },

      getAward: (year: number) => {
        const state = get();
        return state.awards[year] || null;
      },

      getAllAwards: () => {
        const state = get();
        return Object.values(state.awards);
      },

      getAwardCount: () => {
        const state = get();
        return Object.keys(state.awards).length;
      },

      removeAward: (year: number) => {
        set((state) => {
          const { [year]: _, ...rest } = state.awards;
          return { awards: rest };
        });
      },
    }),
    {
      name: 'reawarding-guest-rankings',
      storage: localStorageAvailable
        ? createJSONStorage(() => localStorage)
        : createJSONStorage(() => ({
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          })),
    }
  )
);

export default useGuestRankingStore;
export { localStorageAvailable };

export function shouldShowStorageWarningOnce(): boolean {
  if (typeof window === "undefined" || localStorageAvailable) return false;
  return sessionStorage.getItem(STORAGE_WARNING_SESSION_KEY) !== "true";
}

export function markStorageWarningShown(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_WARNING_SESSION_KEY, "true");
}

// Hook that provides the migration functionality with Supabase access
/** Prevents concurrent migration runs (e.g., auth listener double-emit). */
let migrationInFlight: Promise<{ success: boolean; migratedCount: number; error?: string }> | null = null;

export function useGuestRankingStoreWithMigration() {
  const supabase = useSupabaseClient<Database>();
  const store = useGuestRankingStore();

  const migrateToSupabase = async (userId: string) => {
    // If a migration is already running, return its result instead of starting another
    if (migrationInFlight) {
      return migrationInFlight;
    }

    const doMigrate = async () => {
    try {
      const rankings = store.getAllRankings();
      const awards = store.getAllAwards();
      
      // Convert guest rankings to database format
      const rankingsToInsert = rankings.map((ranking) => ({
        user_id: userId,
        movie_id: ranking.movieId,
        ranking: ranking.ranking,
        seen_it: ranking.seenIt,
        created_at: new Date(ranking.timestamp || Date.now()).toISOString(),
        updated_at: new Date().toISOString(),
      }));

      if (rankingsToInsert.length > 0) {
        // Insert rankings into the database
        const { error, status } = await supabase
          .from('rankings')
          .upsert(rankingsToInsert, {
            onConflict: 'user_id,movie_id',
            ignoreDuplicates: false,
          });

        if (error) {
          console.error('[GuestMigration] Error migrating guest data:', error, {
            status,
            payload: rankingsToInsert,
          });
          return { success: false, migratedCount: 0, error: error.message };
        }

      }

      // Migrate guest awards
      let awardsMigrated = 0;
      for (const award of awards) {
        try {
          const res = await fetch('/api/awards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              year: award.year,
              category: award.category,
              nominee_ids: award.nomineeIds,
              winner_id: award.winnerId,
              source: award.source,
              revision_number: award.revisionNumber,
            }),
          });
          if (res.ok) {
            awardsMigrated++;
          } else {
            console.warn('[GuestMigration] Failed to migrate award for year', award.year);
          }
        } catch (e) {
          console.warn('[GuestMigration] Error migrating award for year', award.year, e);
        }
      }
      // Clear guest data after successful migration
      store.clearAllData();

      return { success: true, migratedCount: rankingsToInsert.length + awardsMigrated };
    } catch (error) {
      console.error('[GuestMigration] Unexpected error migrating guest data:', error);
      return {
        success: false,
        migratedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    }; // end doMigrate

    migrationInFlight = doMigrate().finally(() => {
      migrationInFlight = null;
    });
    return migrationInFlight;
  };

  return {
    ...store,
    migrateToSupabase,
  };
}

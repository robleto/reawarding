import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import type { Database } from '@/types/supabase';
import { updateGuestRanking } from '@/utils/guestMode';

interface GuestRanking {
  movieId: number;
  ranking: number | null;
  seenIt: boolean;
  timestamp: number;
}

interface GuestRankingStore {
  rankings: Record<number, GuestRanking>;
  hasInteracted: boolean;
  
  // Actions
  setRanking: (movieId: number, ranking: number | null) => void;
  setSeenIt: (movieId: number, seenIt: boolean) => void;
  updateRanking: (movieId: number, updates: { ranking?: number | null; seenIt?: boolean }) => void;
  getRanking: (movieId: number) => GuestRanking | null;
  clearAllData: () => void;
  getAllRankings: () => GuestRanking[];
  getInteractionCount: () => number;
  hasGuestInteracted: () => boolean;
}

const useGuestRankingStore = create<GuestRankingStore>()(
  persist(
    (set, get) => ({
      rankings: {},
      hasInteracted: false,
      
      setRanking: (movieId: number, ranking: number | null) => {
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
      
      setSeenIt: (movieId: number, seenIt: boolean) => {
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
      
      updateRanking: (movieId: number, updates: { ranking?: number | null; seenIt?: boolean }) => {
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
      
      getRanking: (movieId: number) => {
        const state = get();
        return state.rankings[movieId] || null;
      },
      
      clearAllData: () => {
        set({
          rankings: {},
          hasInteracted: false,
        });
        // Also clear the save prompt dismissal when rankings are cleared
        if (typeof window !== "undefined") {
          localStorage.removeItem("oscarworthy-save-prompt-dismissed");
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
    }),
    {
      name: 'oscarworthy-guest-rankings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useGuestRankingStore;

// Hook that provides the migration functionality with Supabase access
export function useGuestRankingStoreWithMigration() {
  const supabase = useSupabaseClient<Database>();
  const store = useGuestRankingStore();
  
  const migrateToSupabase = async (userId: string) => {
    try {
      const rankings = store.getAllRankings();
      
      if (rankings.length === 0) {
        return { success: true, migratedCount: 0 };
      }
      
      // Convert guest rankings to database format
      const rankingsToInsert = rankings.map((ranking) => ({
        user_id: userId,
        movie_id: ranking.movieId,
        ranking: ranking.ranking,
        seen_it: ranking.seenIt,
      }));
      
      // Insert rankings into the database
      const { error } = await supabase
        .from('user_rankings')
        .upsert(rankingsToInsert, {
          onConflict: 'user_id,movie_id',
          ignoreDuplicates: false,
        });
      
      if (error) {
        console.error('Error migrating guest data:', error);
        return { success: false, migratedCount: 0, error: error.message };
      }
      
      // Clear guest data after successful migration
      store.clearAllData();
      
      return { success: true, migratedCount: rankingsToInsert.length };
    } catch (error) {
      console.error('Error migrating guest data:', error);
      return { 
        success: false, 
        migratedCount: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };
  
  return {
    ...store,
    migrateToSupabase,
  };
}

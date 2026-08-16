"use client";

import { createContext, useContext, useMemo } from "react";
import { useAuthState } from "@/hooks/useAuthState";
import { useWatchlist, type WatchlistMutationResult } from "@/hooks/useWatchlist";

interface WatchlistContextValue {
  watchlistMovieIds: Set<string>;
  toggle: (movieId: string) => Promise<WatchlistMutationResult>;
  removeIfWatched: (movieId: string) => Promise<WatchlistMutationResult>;
}

const WatchlistContext = createContext<WatchlistContextValue>({
  watchlistMovieIds: new Set(),
  toggle: async () => ({ success: true }),
  removeIfWatched: async () => ({ success: true }),
});

/**
 * WatchlistProvider — call useWatchlist exactly once at the app level.
 * Any component (including LargeCard) can read watchlist state from context
 * without prop threading.
 */
export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthState();
  const { watchlistMovieIds, toggle, removeIfWatched } = useWatchlist(user?.id ?? null);

  const value = useMemo<WatchlistContextValue>(
    () => ({ watchlistMovieIds, toggle, removeIfWatched }),
    [watchlistMovieIds, toggle, removeIfWatched]
  );

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlistContext() {
  return useContext(WatchlistContext);
}

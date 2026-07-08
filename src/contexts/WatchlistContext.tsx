"use client";

import { createContext, useContext } from "react";
import { useAuthState } from "@/hooks/useAuthState";
import { useWatchlist } from "@/hooks/useWatchlist";

interface WatchlistContextValue {
  watchlistMovieIds: Set<number>;
  toggle: (movieId: number) => Promise<void>;
  removeIfWatched: (movieId: number) => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextValue>({
  watchlistMovieIds: new Set(),
  toggle: async () => {},
  removeIfWatched: async () => {},
});

/**
 * WatchlistProvider — call useWatchlist exactly once at the app level.
 * Any component (including LargeCard) can read watchlist state from context
 * without prop threading.
 */
export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthState();
  const { watchlistMovieIds, toggle, removeIfWatched } = useWatchlist(user?.id ?? null);

  return (
    <WatchlistContext.Provider value={{ watchlistMovieIds, toggle, removeIfWatched }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlistContext() {
  return useContext(WatchlistContext);
}

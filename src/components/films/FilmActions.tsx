"use client";

import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabaseBrowser";
import SeenItButton from "@/components/movie/SeenItButton";
import RankingDropdown from "@/components/movie/RankingDropdown";
import useGuestRankingStore from "@/hooks/useGuestRankingStore";
import { useWatchlistContext } from "@/contexts/WatchlistContext";
import { getMovieCacheKey, invalidateMovieCache } from "@/utils/sharedMovieUtils";

type Props = {
  movieId: string;
};

export default function FilmActions({ movieId }: Props) {
  const { user } = useUser();
  const { watchlistMovieIds, toggle: toggleWatchlist, removeIfWatched } = useWatchlistContext();
  const isOnWatchlist = watchlistMovieIds.has(movieId);
  const [ranking, setRanking] = useState<number | null>(null);
  const [seenIt, setSeenIt] = useState(false);
  const [loading, setLoading] = useState(true);

  // Guest mode
  const getRanking = useGuestRankingStore((state) => state.getRanking);
  const updateGuestRankingStore = useGuestRankingStore((state) => state.updateRanking);

  useEffect(() => {
    if (!user) {
      // Guest mode - check localStorage
      const guestRanking = getRanking(movieId);
      setRanking(guestRanking?.ranking ?? null);
      setSeenIt(guestRanking?.seenIt ?? false);
      setLoading(false);
      return;
    }

    // Authenticated - fetch from database
    const fetchRanking = async () => {
      const { data, error } = await supabase
        .from("rankings")
        .select("ranking, seen_it")
        .eq("user_id", user.id)
        .eq("movie_id", movieId)
        .maybeSingle();

      if (!error && data) {
        setRanking(data.ranking);
        setSeenIt(data.seen_it ?? false);
      }
      setLoading(false);
    };

    fetchRanking();
  }, [user, movieId, getRanking]);

  const handleUpdate = async (updates: { seen_it?: boolean; ranking?: number | null }) => {
    if (!user) {
      // Guest mode
      updateGuestRankingStore(movieId, {
        ranking: updates.ranking !== undefined ? updates.ranking : ranking,
        seenIt: updates.seen_it !== undefined ? updates.seen_it : seenIt,
      });
      if (updates.ranking !== undefined) setRanking(updates.ranking);
      if (updates.seen_it !== undefined) setSeenIt(updates.seen_it);
      // This write bypasses useMovieDataWithGuest's updateMovieRanking, so the
      // shared movie cache (sharedMovieUtils.ts) never sees it. Invalidate the
      // guest entry so the next mount (e.g. navigating to /rankings) refetches
      // instead of showing a stale pre-rating snapshot for up to CACHE_STALE_MS.
      invalidateMovieCache(getMovieCacheKey(true, ""));
      return;
    }

    // Authenticated mode
    const { error } = await supabase
      .from("rankings")
      .upsert(
        {
          user_id: user.id,
          movie_id: movieId,
          ranking: updates.ranking !== undefined ? updates.ranking : ranking,
          seen_it: updates.seen_it !== undefined ? updates.seen_it : seenIt,
        },
        { onConflict: "user_id,movie_id" }
      );

    if (!error) {
      if (updates.ranking !== undefined) setRanking(updates.ranking);
      if (updates.seen_it !== undefined) setSeenIt(updates.seen_it);
      // Same bypass as above: this write goes straight to Supabase, not
      // through updateMovieRanking, so invalidate explicitly rather than
      // relying solely on the TTL — this is the highest-traffic bypass path
      // (global header search -> film detail page, reachable from every page).
      invalidateMovieCache(getMovieCacheKey(false, user.id));
    } else {
      console.error("Error updating ranking:", error);
    }
  };

  const handleSeenItClick = () => {
    const newSeenIt = !seenIt;
    handleUpdate({ seen_it: newSeenIt });
    if (newSeenIt) removeIfWatched(movieId).catch(() => {});
  };

  if (loading) {
    return <div className="flex gap-3 items-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="flex gap-3 items-center">
      <SeenItButton
        seenIt={seenIt}
        onClick={handleSeenItClick}
      />
      <RankingDropdown
        ranking={ranking}
        onChange={(value) => handleUpdate({ ranking: value })}
      />
      {!seenIt && (
        <button
          type="button"
          onClick={() => toggleWatchlist(movieId)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
            isOnWatchlist
              ? "bg-amber-800/40 text-amber-300 hover:bg-amber-700/40"
              : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
          }`}
          title={isOnWatchlist ? "Remove from watchlist" : "Add to watchlist"}
        >
          <Bookmark className={`w-4 h-4 ${isOnWatchlist ? "fill-current" : ""}`} />
          {isOnWatchlist ? "On Watchlist" : "Watchlist"}
        </button>
      )}
    </div>
  );
}

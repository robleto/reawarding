"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabaseBrowser";
import SeenItButton from "@/components/movie/SeenItButton";
import RankingDropdown from "@/components/movie/RankingDropdown";
import useGuestRankingStore from "@/hooks/useGuestRankingStore";

type Props = {
  movieId: number;
};

export default function FilmActions({ movieId }: Props) {
  const { user } = useUser();
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
        setSeenIt(data.seen_it);
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
    } else {
      console.error("Error updating ranking:", error);
    }
  };

  if (loading) {
    return <div className="flex gap-3 items-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="flex gap-3 items-center">
      <SeenItButton
        seenIt={seenIt}
        onClick={() => handleUpdate({ seen_it: !seenIt })}
      />
      <div className="flex flex-col items-center">
        <RankingDropdown
          ranking={ranking}
          onChange={(value) => handleUpdate({ ranking: value })}
        />
        {seenIt && ranking === null && (
          <span className="mt-0.5 text-[10px] leading-tight text-blue-400/70 whitespace-nowrap">
            7+ joins ballot
          </span>
        )}
      </div>
    </div>
  );
}

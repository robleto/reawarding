"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { Trophy, Star, Eye, UserPlus } from "lucide-react";
import Loader from "@/components/ui/Loading";
import useGuestRankingStore from "@/hooks/useGuestRankingStore";

type StatItem = {
  key: string;
  label: string;
  value: string | number;
  icon: ReactNode;
  hint?: string;
};

export default function StatsSummary({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "compact";
}) {
  const supabase = useSupabaseClient();
  const user = useUser();
  // Subscribe to guest rankings so UI updates after persist rehydration
  const guestRankingsMap = useGuestRankingStore((s) => s.rankings);
  const isGuest = !user;
  const currentYear = new Date().getFullYear();
  const [scope, setScope] = useState<"all" | "year">("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ ratedCount: number; avgRating: number | null; seenCount: number; awardsCount: number }>({
    ratedCount: 0,
    avgRating: null,
    seenCount: 0,
    awardsCount: 0,
  });
  const iconClassName = variant === "compact" ? "w-4 h-4" : "w-5 h-5";

  // Compute guest stats from local store
  const guestStatsAll = useMemo(() => {
    const all = Object.values(guestRankingsMap || {});
    const rated = all.filter((r) => typeof r.ranking === "number");
    const seen = all.filter((r) => r.seenIt);
    const avg = rated.length > 0 ? rated.reduce((sum, r) => sum + (r.ranking || 0), 0) / rated.length : null;
    return { ratedCount: rated.length, avgRating: avg, seenCount: seen.length, awardsCount: 0 };
  }, [guestRankingsMap]);

  // For guests: year-scoped stats require knowing which movie IDs are from current year
  const computeGuestYearStats = async () => {
    const { data: moviesYear } = await supabase
      .from("movies")
      .select("id", { count: "exact" })
      .eq("release_year", currentYear);
    const yearIds = new Set((moviesYear || []).map((m: any) => m.id));
    const all = Object.values(guestRankingsMap || {});
    const yearOnly = all.filter((r: any) => yearIds.has(r.movieId));
    const rated = yearOnly.filter((r) => typeof r.ranking === "number");
    const seen = yearOnly.filter((r) => r.seenIt);
    const avg = rated.length > 0 ? rated.reduce((sum, r) => sum + (r.ranking || 0), 0) / rated.length : null;
    return {
      ratedCount: rated.length,
      avgRating: avg,
      seenCount: seen.length,
    };
  };

  useEffect(() => {
    let mounted = true;
    async function fetchStats() {
      setLoading(true);
      setError(null);

      try {
        if (!user) {
          if (scope === "all") {
            if (mounted) setStats((prev) => ({ ...prev, ...guestStatsAll }));
          } else {
            const yearGuest = await computeGuestYearStats();
            if (mounted) setStats((prev) => ({ ...prev, ...yearGuest }));
          }
          return;
        }

        const userId = user.id;
        if (scope === "all") {
          const [rankingsResp, awardsYearsResp] = await Promise.all([
            supabase
              .from("rankings")
              .select("ranking, seen_it")
              .eq("user_id", userId),
            supabase
              .from("awards")
              .select("year")
              .eq("user_id", userId),
          ]);

          if (rankingsResp.error) throw rankingsResp.error;
          if (awardsYearsResp.error) throw awardsYearsResp.error;
          const rows = rankingsResp.data || [];
          const ratedRows = rows.filter((r: any) => typeof r.ranking === "number");
          const ratedCount = ratedRows.length;
          const avgRating = ratedCount > 0 ? ratedRows.reduce((sum: number, r: any) => sum + (r.ranking || 0), 0) / ratedCount : null;
          const seenCount = rows.filter((r: any) => r.seen_it).length;

          const awardsCount = new Set((awardsYearsResp.data || []).map((a: any) => a.year)).size;
          if (mounted) {
            setStats({ ratedCount, avgRating, seenCount, awardsCount });
          }
        } else {
          // This Year scope
          const [moviesYearResp, awardsYearCountResp] = await Promise.all([
            supabase
              .from("movies")
              .select(
                `id, release_year, rankings!left(ranking, seen_it, user_id)`
              )
              .eq("release_year", currentYear)
              .eq("rankings.user_id", userId),
            supabase
              .from("awards")
              .select("id", { count: "exact", head: true })
              .eq("user_id", userId)
              .eq("year", currentYear),
          ]);

          if (moviesYearResp.error) throw moviesYearResp.error;
          const moviesRows = moviesYearResp.data || [];
          const ratedCount = moviesRows.filter((m: any) => typeof m.rankings?.[0]?.ranking === "number").length;
          const seenCount = moviesRows.filter((m: any) => m.rankings?.[0]?.seen_it).length;
          const ratedRows = moviesRows.filter((m: any) => typeof m.rankings?.[0]?.ranking === "number");
          const avgRating = ratedRows.length > 0 ? ratedRows.reduce((sum: number, m: any) => sum + (m.rankings?.[0]?.ranking || 0), 0) / ratedRows.length : null;
          const awardsCount = awardsYearCountResp.count ? 1 : 0;

          if (mounted) {
            setStats({ ratedCount, avgRating, seenCount, awardsCount });
          }
        }
      } catch (err) {
        console.error("Failed to load stats:", err);
        if (mounted) setError(err instanceof Error ? err.message : "Failed to load stats");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchStats();
    return () => {
      mounted = false;
    };
  }, [supabase, user, guestStatsAll, scope, currentYear, guestRankingsMap]);

  const items: StatItem[] = [
    {
      key: "rated",
      label: "Movies Rated",
      value: stats.ratedCount,
      icon: <Star className={iconClassName} />,
      hint: isGuest ? "Save your ratings by signing up" : undefined,
    },
    {
      key: "avg",
      label: "Avg Rating",
      value: stats.avgRating !== null ? `${stats.avgRating.toFixed(1)}/10` : "—",
      icon: <Trophy className={iconClassName} />,
    },
    {
      key: "seen",
      label: "Movies Seen",
      value: stats.seenCount,
      icon: <Eye className={iconClassName} />,
    },
    {
      key: "awards",
      label: "Years Awarded",
      value: stats.awardsCount,
      icon: <Trophy className={iconClassName} />,
    },
  ];

  return (
    <section className={`max-w-screen-xl mx-auto ${className}`}>
      {variant === "compact" ? (
        <div className="dark-glass rounded-xl border border-gray-600/50 px-3 sm:px-4 py-2.5 sm:py-3">
          {loading ? (
            <div className="text-xs text-gray-300">
              Loading your stats...
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <span className="hidden sm:inline text-[11px] uppercase tracking-wide text-gray-400 font-semibold">
                Your Stats
              </span>
              <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4 md:gap-5 lg:gap-6 flex-1">
                {items.map((item) => (
                  <div key={item.key} className="flex items-center gap-1.5 sm:gap-2">
                    <div className="text-[#ba7a00] text-yellow-500 bg-yellow-500/10 p-1 sm:p-1.5 rounded flex-shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm font-semibold text-white leading-tight truncate">
                        {item.value}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wide leading-tight truncate">
                        {item.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {error && (
            <div className="mt-2 text-xs text-red-400">{error}</div>
          )}
        </div>
      ) : (
        <>
          {/* Scope toggle */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base sm:text-sm font-semibold text-gray-200">Your Stats</h3>
            <div className="inline-flex rounded-lg overflow-hidden border border-gray-600/60">
              <button
                className={`px-3 py-1 text-xs font-medium transition-colors ${scope === "all" ? "bg-blue-600 text-white" : "bg-transparent text-gray-300"}`}
                onClick={() => setScope("all")}
              >
                All-time
              </button>
              <button
                className={`px-3 py-1 text-xs font-medium transition-colors ${scope === "year" ? "bg-blue-600 text-white" : "bg-transparent text-gray-300"}`}
                onClick={() => setScope("year")}
              >
                This Year
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {loading ? (
              <div className="col-span-1 sm:col-span-2 lg:col-span-4">
                <div className="dark-glass rounded-xl border border-gray-600/50 p-3 sm:p-4">
                  <Loader message="Loading your stats..." />
                </div>
              </div>
            ) : (
              items.map((item) => {
                // Build links for specific cards
                let href: string | null = null;
                if (item.key === "awards") {
                  href = scope === "year" ? `/awards?year=${currentYear}` : "/awards";
                }

                const Card = (
                  <div
                    key={item.key}
                    className={`dark-glass rounded-xl border border-gray-600/50 p-3 sm:p-4 flex items-center justify-between ${href ? "hover:shadow-md transition-shadow" : ""}`}
                  >
                    <div>
                      <div className="text-[11px] sm:text-xs uppercase tracking-wide text-gray-400">{item.label}</div>
                      <div className="mt-1 text-xl sm:text-2xl font-semibold text-white">{item.value}</div>
                      {item.hint && (
                        <div className="mt-1 hidden sm:flex text-xs text-gray-400 items-center gap-1">
                          <UserPlus className="w-3.5 h-3.5" />
                          {item.hint}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-[#ba7a00] text-yellow-500 bg-yellow-500/10 p-1.5 sm:p-2 rounded-lg">
                      {item.icon}
                    </div>
                  </div>
                );

                return href ? (
                  <Link key={item.key} href={href} className="block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl">
                    {Card}
                  </Link>
                ) : (
                  <div key={item.key}>{Card}</div>
                );
              })
            )}
          </div>

          {error && (
            <div className="mt-3 text-xs text-red-400">{error}</div>
          )}
        </>
      )}
    </section>
  );
}

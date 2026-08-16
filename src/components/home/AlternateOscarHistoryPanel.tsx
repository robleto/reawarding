"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import type { Movie } from "@/types/types";
import { useAlternateOscarHistory } from "@/hooks/useAlternateOscarHistory";
import { useProfile } from "@/contexts/ProfileContext";
import { isNativeApp } from "@/lib/platform";
import MovieRowCard from "@/components/movie/MovieRowCard";

interface Props {
  movies: Movie[];
  currentUserId: string;
  onUpdateMovie: (movieId: string, updates: { seen_it?: boolean; ranking?: number | null }) => void;
}

/**
 * AlternateOscarHistoryPanel — lifetime aggregate of the per-year Upheld/
 * Reawarded/Unscreened verdict (PRODUCT_DECISION_LOG.md "Your Alternate
 * Oscar History"). Lives inside the homepage Canon section, Mature-tier only.
 *
 * Premium-gated: free users see the panel's shape and headline stat blurred
 * under an unlock CTA rather than not at all, per the decision log's
 * reflection/output-layer framing. useIsPremium() reads the Stripe-synced
 * subscription_status on profiles (see /api/stripe/webhook).
 */
export default function AlternateOscarHistoryPanel({ movies, currentUserId, onUpdateMovie }: Props) {
  const history = useAlternateOscarHistory(movies);
  const { isPremium } = useProfile();
  const isNative = isNativeApp();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError(data.error ?? "Checkout failed");
        setCheckoutLoading(false);
      }
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Checkout failed");
      setCheckoutLoading(false);
    }
  };

  if (history.loading || history.eligibleYears === 0) return null;

  const upheldPct = history.upheldRate != null ? Math.round(history.upheldRate * 100) : null;

  return (
    <div className="mt-8 border-t border-gray-700/30 pt-6 relative">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 mb-4">
        Your Alternate Oscar History
      </p>

      <div className={isPremium ? "" : "blur-md select-none pointer-events-none"}>
        {/* Headline stats */}
        <div className="flex items-start gap-4 sm:gap-8 mb-5 flex-wrap">
          <div>
            <p className="text-2xl font-semibold text-gray-200 tabular-nums leading-none font-mono">
              {upheldPct != null ? `${upheldPct}%` : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1.5">Upheld rate</p>
          </div>
          <div className="border-l border-gray-700/40 pl-4 sm:pl-8">
            <p className="text-2xl font-semibold text-emerald-300 tabular-nums leading-none font-mono">
              {history.upheld}
            </p>
            <p className="text-xs text-gray-500 mt-1.5">Upheld</p>
          </div>
          <div className="border-l border-gray-700/40 pl-4 sm:pl-8">
            <p className="text-2xl font-semibold text-amber-300 tabular-nums leading-none font-mono">
              {history.reawardedMild + history.reawardedLoud}
            </p>
            <p className="text-xs text-gray-500 mt-1.5">Reawarded</p>
          </div>
          <div className="border-l border-gray-700/40 pl-4 sm:pl-8">
            <p className="text-2xl font-semibold text-gray-500 tabular-nums leading-none font-mono">
              {history.unscreened}
            </p>
            <p className="text-xs text-gray-500 mt-1.5">Not yet comparable</p>
          </div>
        </div>

        {/* By decade */}
        {history.byDecade.length > 1 && (
          <div className="border-t border-gray-700/30 pt-4 mb-5">
            <p className="text-sm text-gray-400 mb-3">By decade</p>
            <div className="flex flex-wrap gap-2">
              {history.byDecade.map((d) => (
                <div
                  key={d.decade}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/40"
                >
                  <span className="text-xs font-medium text-gray-300">{d.decade}s</span>
                  <span className="text-xs text-gray-500 font-mono">
                    {d.upheldRate != null
                      ? `${Math.round(d.upheldRate * 100)}% upheld`
                      : `${d.unscreened} unscreened`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Most controversial calls */}
        {history.mostControversial.length > 0 && (
          <div className="border-t border-gray-700/30 pt-4">
            <p className="text-sm text-gray-400 mb-3">Most controversial calls</p>
            <div className="space-y-3">
              {history.mostControversial.map((call) => (
                <div key={call.year}>
                  <p className="text-xs text-gray-500 mb-1">
                    {call.year} · Reawarded over <span className="text-gray-400">{call.officialTitle}</span>{" "}
                    <span className="text-amber-300 font-mono">
                      ({call.yourRating.toFixed(0)} vs {call.officialRating.toFixed(0)})
                    </span>
                  </p>
                  <MovieRowCard
                    movie={call.yourWinner}
                    currentUserId={currentUserId}
                    ranking={call.yourRating}
                    seenIt
                    onUpdate={onUpdateMovie}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!isPremium && (
        <div className="absolute inset-0 top-8 flex items-start justify-center pt-10 px-4">
          <div className="flex flex-col items-center gap-2 px-6 py-4 rounded-xl bg-gray-900/90 border border-gray-700/60 shadow-lg text-center">
            <Lock className="w-4 h-4 text-gray-400" aria-hidden="true" />
            <p className="text-sm font-medium text-gray-200">Unlock your Alternate Oscar History</p>
            <p className="text-xs text-gray-500 max-w-[240px]">
              See your lifetime Upheld rate, decade trends, and your most controversial calls against the Academy.
            </p>
            {!isNative && (
              <button
                onClick={handleUpgrade}
                disabled={checkoutLoading}
                className="mt-1 px-4 py-1.5 text-xs font-medium text-black bg-gold-500 rounded hover:bg-gold-400 disabled:opacity-50"
              >
                {checkoutLoading ? "Redirecting…" : "Unlock Premium"}
              </button>
            )}
            {checkoutError && (
              <p className="text-xs text-red-400 max-w-[240px]">{checkoutError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

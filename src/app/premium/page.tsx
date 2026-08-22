"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { useAuthState } from "@/hooks/useAuthState";
import { useProfile } from "@/contexts/ProfileContext";
import { isNativeApp } from "@/lib/platform";
import { supabase } from "@/lib/supabaseBrowser";

export default function PremiumPage() {
  const { status, isAuthenticated, user } = useAuthState();
  const { isPremium } = useProfile();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false);
  const isNative = isNativeApp();

  useEffect(() => {
    if (!user?.id) {
      setHasStripeCustomer(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles_self")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled) {
          setHasStripeCustomer(Boolean(data?.stripe_customer_id));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      // A past_due/unpaid subscriber already has a Stripe customer (and a
      // live subscription) even though isPremium is false — route them to
      // the Billing Portal instead of Checkout, or they'd end up with a
      // second concurrent subscription (audit PAY-2).
      const endpoint = hasStripeCustomer ? "/api/stripe/portal" : "/api/stripe/checkout";
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Something went wrong");
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-400 mb-3">
          Reawarding Premium
        </p>
        <h1 className="text-3xl md:text-4xl font-unbounded font-semibold text-white mb-3">
          Bigger, not faster.
        </h1>
        <p className="text-gray-400 max-w-md mx-auto">
          Premium never skips a step the free tier already earns through your own ratings — it
          expands what you can reach.
        </p>
      </div>

      <div className="dark-glass rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-1">Your Alternate Oscar History</h2>
        <p className="text-sm text-gray-400 mb-3">
          Your per-year Upheld/Reawarded/Unscreened verdict against the Academy is free on every
          year card. Premium unlocks the lifetime picture: your overall Upheld rate, trends by
          decade, and your most controversial calls against real Oscar history.
        </p>
      </div>

      <div className="dark-glass rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-1">Automation</h2>
        <p className="text-sm text-gray-400 mb-3">
          Ready-Made Lists (auto-built collections by director, actor, genre, and decade) and
          importing your Letterboxd or IMDb history — both free to detect and preview, premium to
          actually save or import.
        </p>
      </div>

      {status === "loading" ? null : !isAuthenticated ? (
        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 text-black bg-gold-500 rounded-full border border-gold-300/40 shadow-lg shadow-gold-500/25 hover:bg-gold-400 hover:shadow-gold-400/35 font-medium transition-colors"
          >
            Sign in to unlock Premium
          </Link>
        </div>
      ) : isPremium ? (
        <div className="text-center">
          <p className="inline-flex items-center gap-2 text-emerald-300 font-medium mb-3">
            <Sparkles className="w-4 h-4" /> You&apos;re already Premium
          </p>
          <p className="text-sm text-gray-500">
            Manage your subscription anytime from{" "}
            <Link href="/settings" className="text-gold-300 underline">
              Settings
            </Link>
            .
          </p>
        </div>
      ) : isNative && !hasStripeCustomer ? null : (
        // PAY-4 (docs/audits/2026-08-21-launch-readiness-round3.md): a
        // native user who already has a Stripe customer (past_due/unpaid,
        // not a fresh purchase) still needs a way to reach the Billing
        // Portal to fix their card — hiding this entirely stranded them.
        <div className="text-center">
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 text-black bg-gold-500 rounded-full border border-gold-300/40 shadow-lg shadow-gold-500/25 hover:bg-gold-400 hover:shadow-gold-400/35 disabled:opacity-50 font-medium transition-colors"
          >
            <Lock className="w-4 h-4" />
            {loading ? "Redirecting…" : hasStripeCustomer ? "Manage billing" : "Unlock Premium — $19/yr"}
          </button>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}

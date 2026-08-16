"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { ArrowRight, Film, Sparkles } from "lucide-react";
import MovieSearchPicker from "@/components/home/MovieSearchPicker";
import Loader from "@/components/ui/Loading";
import { useAuthState } from "@/hooks/useAuthState";
import type { Movie } from "@/types/types";

// ── Constants ────────────────────────────────────────────────────────────────

const ERAS = [
  "1920s", "1930s", "1940s", "1950s", "1960s",
  "1970s", "1980s", "1990s", "2000s", "2010s", "2020s",
];

const GENRES = [
  "Drama", "Comedy", "Thriller", "Crime", "Horror",
  "Sci-Fi", "Action", "Romance", "Documentary", "Animation",
  "Mystery", "Fantasy", "History", "Music", "War",
];

const TOTAL_STEPS = 3;

// ── Step indicator ────────────────────────────────────────────────────────────

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? "w-6 h-1.5 bg-gold-400"
              : i < current
              ? "w-1.5 h-1.5 bg-gold-400/40"
              : "w-1.5 h-1.5 bg-gray-600"
          }`}
        />
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const { user, status: authStatus } = useAuthState();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Auth guard (AUTH-5): a signed-out guest must never see the wizard —
  // filling out all 3 steps only to have finishOnboarding() silently discard
  // everything is the bug this closes. Redirect to /login before rendering
  // any step, reusing the same next-param plumbing established for AUTH-1
  // (middleware.ts -> /login -> sign-in -> back here). Wait for authStatus to
  // resolve past "loading" so we don't bounce a legitimate signed-in user
  // whose session hasn't hydrated yet on first render.
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.replace("/login?next=" + encodeURIComponent("/onboarding"));
    }
  }, [authStatus, router]);

  // Guard: redirect away if already complete
  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", user.id)
        .single();
      if (data?.onboarding_complete) router.replace("/");
    })();
  }, [user, supabase, router]);

  // Step 1 — era
  const [selectedEra, setSelectedEra] = useState<string | null>(null);

  // Step 2 — first film
  const [firstFilm, setFirstFilm] = useState<Movie | null>(null);

  // Step 3 — genres
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const toggleGenre = useCallback((genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }, []);

  // Save to DB and mark onboarding complete
  const finishOnboarding = useCallback(async () => {
    // Dead code in the normal flow now that the auth-guard effect above (and
    // the render guard) keep a signed-out guest from ever reaching a wizard
    // step in the first place — kept as defense-in-depth in case the session
    // expires mid-wizard between renders, rather than silently discarding
    // picks against a stale/null user.
    if (!user) { router.push("/"); return; }
    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({
          preferred_era: selectedEra ?? null,
          preferred_genres: selectedGenres.length > 0 ? selectedGenres : null,
          onboarding_complete: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      // If user picked a first film, mark it as watched
      if (firstFilm) {
        await supabase.from("rankings").upsert(
          {
            user_id: user.id,
            movie_id: firstFilm.id,
            seen_it: true,
          },
          { onConflict: "user_id,movie_id" }
        );
      }
    } catch {
      // Non-blocking — proceed to homepage regardless
    } finally {
      setSaving(false);
      router.push("/");
    }
  }, [user, supabase, selectedEra, selectedGenres, firstFilm, router]);

  const nextStep = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      void finishOnboarding();
    }
  }, [step, finishOnboarding]);

  // ── Render ──────────────────────────────────────────────────────────────────

  // Never render a wizard step for a signed-out guest — even briefly while
  // the redirect above is in flight. Covers both "still resolving the
  // session" and "confirmed signed out, redirect queued" states.
  if (authStatus !== "authenticated") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
        <Loader message="Loading…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Step dots */}
        <div className="mb-10">
          <StepDots current={step} />
        </div>

        {/* ── Step 0: Era ── */}
        {step === 0 && (
          <div key="step-era" className="animate-fade-in">
            <div className="mb-6 flex justify-center">
              <Sparkles className="h-7 w-7 text-gold-400/80" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-unbounded text-white text-center leading-tight mb-3">
              What film era speaks to you?
            </h1>
            <p className="text-sm text-gray-500 text-center mb-8">
              We&apos;ll use this to tailor your discovery feed. You can change it later.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mb-10">
              {ERAS.map((era) => (
                <button
                  key={era}
                  type="button"
                  onClick={() => setSelectedEra((prev) => (prev === era ? null : era))}
                  className={`inline-flex items-center justify-center min-h-[44px] rounded-lg border px-4 py-2.5 font-unbounded text-sm font-semibold transition-all ${
                    selectedEra === era
                      ? "border-gold-500/60 bg-gold-500/10 text-gold-300"
                      : "border-gray-700/40 bg-charcoal-900/50 text-gray-400 hover:border-gold-500/30 hover:text-gray-200"
                  }`}
                >
                  {era}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => { setSelectedEra(null); nextStep(); }}
                className="inline-flex items-center min-h-[44px] px-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Skip this step
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-lg border border-gold-500/30 bg-gold-500/10 px-5 py-3 text-sm font-medium text-gold-300 hover:bg-gold-500/20 transition-all"
              >
                {selectedEra ? "Continue" : "Any era"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: First film ── */}
        {step === 1 && (
          <div key="step-film" className="animate-fade-in">
            <div className="mb-6 flex justify-center">
              <Film className="h-7 w-7 text-gold-400/80" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-unbounded text-white text-center leading-tight mb-3">
              Find a film you&apos;ve seen
            </h1>
            <p className="text-sm text-gray-500 text-center mb-8">
              This seeds your first Watch. You&apos;ll rate it on the next screen.
            </p>

            <div className="mb-4">
              <MovieSearchPicker
                onSelect={(movie) => setFirstFilm(movie)}
                placeholder="Search for a film…"
              />
            </div>

            {firstFilm && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-gold-500/20 bg-gold-500/5 px-4 py-3">
                <span className="text-gold-400">✓</span>
                <span className="text-sm text-gray-200 font-medium">{firstFilm.title}</span>
                <button
                  type="button"
                  onClick={() => setFirstFilm(null)}
                  className="ml-auto text-xs text-gray-600 hover:text-gray-400 transition-colors"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="mt-8 flex items-center justify-end">
              <button
                type="button"
                onClick={() => { if (!firstFilm) setFirstFilm(null); nextStep(); }}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-lg border border-gold-500/30 bg-gold-500/10 px-5 py-3 text-sm font-medium text-gold-300 hover:bg-gold-500/20 transition-all"
              >
                {firstFilm ? "Continue" : "Skip this step"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Genres ── */}
        {step === 2 && (
          <div key="step-genres" className="animate-fade-in">
            <div className="mb-6 flex justify-center">
              <Sparkles className="h-7 w-7 text-gold-400/80" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-unbounded text-white text-center leading-tight mb-3">
              What kinds of films excite you?
            </h1>
            <p className="text-sm text-gray-500 text-center mb-8">
              Pick as many as you like — or skip and we&apos;ll learn from your ratings.
            </p>

            <div className="flex flex-wrap gap-2 justify-center mb-10">
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  className={`inline-flex items-center justify-center min-h-[44px] rounded-full border px-4 py-2.5 text-sm font-medium transition-all ${
                    selectedGenres.includes(genre)
                      ? "border-gold-500/60 bg-gold-500/10 text-gold-300"
                      : "border-gray-700/40 bg-charcoal-900/50 text-gray-400 hover:border-gold-500/30 hover:text-gray-200"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center min-h-[44px] px-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void finishOnboarding()}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-lg border border-gold-500/30 bg-gold-500/10 px-5 py-3 text-sm font-medium text-gold-300 hover:bg-gold-500/20 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-gold-400/30 border-t-gold-400 animate-spin" />
                    Saving…
                  </span>
                ) : (
                  <>
                    Start ReAwarding
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Import shortcut — a low-friction alternative to the manual flow ──
            above. A brand-new user has zero data, so surfacing this here (the
            very first moments in the app) is the highest-leverage place to
            offer it. Does not block or replace any step — just an escape
            hatch. Note: clicking through as a non-premium user currently hits
            the import paywall (src/app/api/import/library/route.ts) — that's
            an existing, separately-flagged product question, not something
            fixed here. */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-600">
            Already on Letterboxd or IMDb?{" "}
            <Link
              href="/settings/import"
              className="font-medium text-gold-400 underline underline-offset-2 decoration-gold-400/30 hover:text-gold-300"
            >
              Bring your ratings in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

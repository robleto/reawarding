"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Trophy, ArrowRight, ArrowLeft, Check, Star } from "lucide-react";
import { useMovieDataWithGuest } from "@/utils/sharedMovieUtils";
import { useCreateAward } from "@/hooks/useCreateAward";
import OnboardingPickFlow from "@/components/onboarding/OnboardingPickFlow";
import { normalizeImageUrl } from "@/utils/imageUrl";
import { getRatingStyle } from "@/utils/getRatingStyle";
import { isCanonicalCandidate } from "@/utils/canonicalFilm";
import type { Movie } from "@/types/types";

// Onboarding continuation page — keeps a guest in the loop after their first
// rating by showing the year-scoped film grid + ballot progress + signup CTA.
// Reuses OnboardingPickFlow for the per-pick Watch → Rate → Form sequence,
// so taps inside this page feed the same modal the home page does.

const BALLOT_THRESHOLD = 5;
const MIN_YEAR = 1920;
const MAX_YEAR = 2030;

export default function OnboardingYearPage() {
  const router = useRouter();
  const params = useParams<{ year: string }>();
  const yearStr = params?.year ?? "";
  const year = parseInt(yearStr, 10);

  const { movies, loading, isGuest, updateMovieRanking } = useMovieDataWithGuest();
  const { createAward } = useCreateAward();
  const [pickedMovie, setPickedMovie] = useState<Movie | null>(null);

  // ── Films for this year, sorted by rating quality so the strongest
  //    contenders surface first. Already-rated films stay in the grid so the
  //    user can re-tap to adjust. Obscure long-tail films (low vote count) are
  //    excluded unless the user has already engaged with them.
  const yearFilms = useMemo(() => {
    if (!Number.isFinite(year)) return [];
    return movies
      .filter((m) => m.release_year === year)
      .filter(isCanonicalCandidate)
      .slice()
      .sort((a, b) => {
        const aR = parseFloat(String(a.tmdb_rating ?? 0)) || 0;
        const bR = parseFloat(String(b.tmdb_rating ?? 0)) || 0;
        if (aR !== bR) return bR - aR;
        return a.title.localeCompare(b.title);
      });
  }, [movies, year]);

  // ── Current nominee count (rated 7+) for this year
  const nomineeCount = useMemo(
    () =>
      yearFilms.filter((m) => {
        const r = m.rankings?.[0]?.ranking;
        return typeof r === "number" && r >= 7;
      }).length,
    [yearFilms]
  );

  // For the modal: count excluding the picked movie so the FormingPanel can
  // add back the new rating correctly regardless of refresh timing.
  const nomineeCountForModal = useMemo(() => {
    if (!pickedMovie) return nomineeCount;
    const r = pickedMovie.rankings?.[0]?.ranking;
    const wasNominee = typeof r === "number" && r >= 7;
    return Math.max(0, nomineeCount - (wasNominee ? 1 : 0));
  }, [nomineeCount, pickedMovie]);

  const isSet = nomineeCount >= BALLOT_THRESHOLD;
  const stillNeeded = Math.max(0, BALLOT_THRESHOLD - nomineeCount);

  // ── Mutation handlers — same wiring as homepage onboarding so the data
  //    flows through useMovieDataWithGuest + createAward consistently.
  const handleWatch = (movieId: string | number) => {
    void updateMovieRanking(movieId as unknown as number, { seen_it: true });
  };
  const handleRate = (movieId: string | number, rating: number) => {
    void updateMovieRanking(movieId as unknown as number, { ranking: rating });
    const m = movies.find((entry) => String(entry.id) === String(movieId));
    if (m) {
      void createAward({
        id: m.id,
        title: m.title,
        release_year: m.release_year,
      });
    }
  };

  // ── Invalid year — bounce to /films so the user can pick something else
  if (!Number.isFinite(year) || year < MIN_YEAR || year > MAX_YEAR) {
    if (typeof window !== "undefined") {
      router.replace("/films");
    }
    return null;
  }

  return (
    <div className={isGuest ? "pb-32" : "pb-12"}>
      {/* ─── Persistent progress header ─────────────────────────────────── */}
      <header className="mb-6 px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1 min-h-[44px] px-2 -ml-2 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-1"
          >
            <ArrowLeft className="w-3 h-3" aria-hidden="true" />
            Back home
          </Link>
          <div className="flex items-center gap-2 mb-2">
            {isSet ? (
              <Trophy className="w-5 h-5 text-gold-300" aria-hidden="true" />
            ) : null}
            <h1 className="text-xl sm:text-2xl font-bold text-white font-unbounded tracking-tight">
              {isSet ? `Your ${year} award is set` : `Your ${year} ballot`}
            </h1>
          </div>
          {/* Progress dots — 5 segments to the "set" threshold */}
          <div className="flex items-center gap-1.5 mb-2" aria-hidden="true">
            {Array.from({ length: BALLOT_THRESHOLD }).map((_, i) => (
              <span
                key={i}
                className={`block h-2 w-2 rounded-full transition-colors ${
                  i < Math.min(nomineeCount, BALLOT_THRESHOLD)
                    ? "bg-gold-400"
                    : "bg-gray-700"
                }`}
              />
            ))}
            <span className="ml-2 text-xs tabular-nums text-gray-400">
              {Math.min(nomineeCount, BALLOT_THRESHOLD)} / {BALLOT_THRESHOLD}
            </span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            {isSet ? (
              <>
                {year} is locked in.{" "}
                {nomineeCount < 10 ? (
                  <span>Keep going — fill all 10 slots and your ballot is canonical.</span>
                ) : (
                  <span>Your ballot is canonical at 10 nominees.</span>
                )}
              </>
            ) : (
              <>
                {stillNeeded} more {stillNeeded === 1 ? "rating" : "ratings"} of 7+ from {year} to set your award. Tap any film below to rate it.
              </>
            )}
          </p>
          {/* Once the year is set, offer a quiet path to the full Awards
              gallery so the guest can see what they've built before being
              asked to save it. The page is guest-accessible. */}
          {isSet && (
            <Link
              href="/awards"
              className="mt-3 inline-flex items-center gap-1.5 min-h-[44px] text-sm font-medium text-gold-300 hover:text-gold-200 transition-colors"
            >
              See your awards
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </header>

      {/* ─── Film grid ──────────────────────────────────────────────────── */}
      <main className="px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <PosterGridSkeleton />
          ) : yearFilms.length === 0 ? (
            <EmptyState year={year} />
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {yearFilms.map((m) => (
                <li key={m.id}>
                  <PosterTile movie={m} onPick={() => setPickedMovie(m)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {/* ─── Sticky bottom CTA — guests only ────────────────────────────── */}
      {isGuest && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-800 bg-charcoal-900/95 backdrop-blur-md">
          <div className="max-w-4xl mx-auto px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              {isSet ? (
                <p className="text-sm font-semibold text-gold-200">
                  🏆 Save your awards — they're gone if you leave.
                </p>
              ) : (
                <p className="text-sm text-gray-300">
                  Save your work — your awards travel with your account.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href="/login"
                className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  isSet
                    ? "bg-gold-500 text-black hover:bg-gold-400"
                    : "border border-gold-500/40 bg-gold-500/10 text-gold-200 hover:bg-gold-500/15"
                }`}
              >
                {isSet ? "Save my awards" : "Sign up"}
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── OnboardingPickFlow modal — fires when a poster is tapped ──── */}
      <OnboardingPickFlow
        isOpen={pickedMovie !== null}
        movie={pickedMovie}
        currentNomineeCountForYear={nomineeCountForModal}
        onConfirmWatch={handleWatch}
        onRate={handleRate}
        onRateAnother={() => setPickedMovie(null)}
        onTryAnotherYear={() => {
          router.push("/onboarding");
        }}
        onSignup={() => router.push("/login")}
        onPickAnother={() => setPickedMovie(null)}
        onClose={() => setPickedMovie(null)}
      />
    </div>
  );
}

// ── PosterTile ───────────────────────────────────────────────────────────────
// Compact tappable poster card. Shows the rating badge if the user has already
// rated this film, so progress is visible across the grid.

function PosterTile({ movie, onPick }: { movie: Movie; onPick: () => void }) {
  const rawPoster = movie.poster_url ?? movie.thumb_url ?? "";
  const normalizedPoster = normalizeImageUrl(rawPoster);
  const hasPoster =
    normalizedPoster &&
    (normalizedPoster.startsWith("http://") ||
      normalizedPoster.startsWith("https://") ||
      (normalizedPoster.startsWith("/") && normalizedPoster.length > 1));

  const rating = movie.rankings?.[0]?.ranking;
  const seenIt = movie.rankings?.[0]?.seen_it === true;
  const isNominee = typeof rating === "number" && rating >= 7;
  const ratingStyle = typeof rating === "number" ? getRatingStyle(rating) : null;

  return (
    <button
      type="button"
      onClick={onPick}
      className={`group w-full text-left rounded-xl overflow-hidden border transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60 ${
        isNominee
          ? "border-gold-500/50 shadow-[0_0_16px_rgba(212,175,55,0.20)]"
          : "border-gray-700/40 hover:border-gold-500/30"
      }`}
      aria-label={`Rate ${movie.title}`}
    >
      <div className="relative aspect-[2/3] bg-gray-800">
        {hasPoster ? (
          <Image
            src={normalizedPoster}
            alt=""
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, 20vw"
            className="object-cover"
            unoptimized
          />
        ) : null}

        {/* Rating badge — bottom-right, mirrors the in-app card overlay */}
        {typeof rating === "number" && ratingStyle && (
          <span
            className="absolute bottom-2 right-2 inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-bold shadow-sm"
            style={{ backgroundColor: ratingStyle.background, color: ratingStyle.text }}
          >
            <Star className="w-3 h-3 fill-current" aria-hidden="true" />
            {rating}
          </span>
        )}

        {/* Seen badge — bottom-left, quieter than the rating */}
        {seenIt && typeof rating !== "number" && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 h-6 px-1.5 rounded-md text-[10px] font-semibold bg-charcoal-900/70 text-gray-200 border border-gray-700/40">
            <Check className="w-3 h-3" aria-hidden="true" />
            Seen
          </span>
        )}
      </div>
      <div className="px-2 py-2">
        <p className="text-xs font-medium text-white leading-snug line-clamp-2">
          {movie.title}
        </p>
      </div>
    </button>
  );
}

// ── Skeleton + empty states ──────────────────────────────────────────────────

function PosterGridSkeleton() {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <li key={i}>
          <div className="rounded-xl overflow-hidden border border-gray-700/40">
            <div className="aspect-[2/3] bg-gray-800 animate-pulse" />
            <div className="px-2 py-2">
              <div className="h-3 w-3/4 bg-gray-800 rounded animate-pulse" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ year }: { year: number }) {
  return (
    <div className="rounded-2xl border border-gray-700/40 bg-charcoal-900/40 px-6 py-10 text-center">
      <p className="text-base text-gray-200 font-medium">
        No films from {year} in your catalog yet.
      </p>
      <p className="mt-2 text-sm text-gray-400">
        Try a different year, or head back to search for one you've seen.
      </p>
      <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
        <Link
          href="/films"
          className="inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg border border-gold-500/40 bg-gold-500/10 px-4 py-2 text-sm font-medium text-gold-200 hover:bg-gold-500/15 transition-colors"
        >
          Pick a different year
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center min-h-[44px] px-3 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Check, X, ArrowLeft, Bookmark, Star, Trophy, ArrowRight, Loader2 } from "lucide-react";
import type { Movie } from "@/types/types";
import { getRatingStyle } from "@/utils/getRatingStyle";
import { normalizeImageUrl } from "@/utils/imageUrl";
import SeenItButton from "@/components/movie/SeenItButton";

// Replaces the old "drop user into YearExplorer with an auto-seeded rating + tour"
// flow. The new sequence teaches the loop in three visible steps:
//   1. Watch — tap the Unseen icon to mark it watched
//   2. Rate  — tap the empty rating slot, then pick 1–10
//   3. Form  — show eligibility, ballot progress, and next actions (including
//              signup) so the loop doesn't drop off after the first rating
// See PRODUCT_DECISION_LOG (May 2026) for context on why the seed/tour was retired.

const RATING_OPTIONS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as const;
const RATING_LABELS: Record<number, string> = {
  10: "Masterpiece",
  9: "Outstanding",
  8: "Great",
  7: "Very Good",
  6: "Good",
  5: "Mixed",
  4: "Weak",
  3: "Poor",
  2: "Bad",
  1: "Awful",
};

type Step = "watch" | "rate" | "forming";

interface Props {
  isOpen: boolean;
  movie: Movie | null;
  /** Count of nominees (rated 7+) for this movie's year BEFORE this rating. */
  currentNomineeCountForYear: number;
  onConfirmWatch: (movieId: string | string) => void;
  onRate: (movieId: string | string, rating: number) => void;
  /** Close + take the user to a year-filtered films page for more ratings. */
  onRateAnother: () => void;
  /** Close + take the user to the unfiltered films page (pick any year). */
  onTryAnotherYear: () => void;
  /** Navigate to signup so the user can save their guest progress. */
  onSignup: () => void;
  /** Close + take the user to this year's ballot workspace to see the current standing. */
  onSeeStanding: () => void;
  onPickAnother: () => void;
  onClose: () => void;
}

export default function OnboardingPickFlow({
  isOpen,
  movie,
  currentNomineeCountForYear,
  onConfirmWatch,
  onRate,
  onRateAnother,
  onTryAnotherYear,
  onSignup,
  onSeeStanding,
  onPickAnother,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>("watch");
  const [watchConfirmed, setWatchConfirmed] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  // The 1-10 picker only appears once the user taps the Rate badge on the card.
  // Until then, step 2 just shows the pulsing badge and an inviting prompt.
  const [ratingPickerOpen, setRatingPickerOpen] = useState(false);
  // When a forming-step CTA triggers full-page navigation, hold the modal open
  // with a loading view until the new page replaces it — otherwise the user
  // sees a flash of the underlying home page during the navigation gap.
  const [navigatingLabel, setNavigatingLabel] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    // Initialize from the movie's current rankings so re-opening an
    // already-rated film doesn't visually wipe the rating. Reported by Greg:
    // tapping a previously-rated tile showed the modal as if the film were
    // untouched ("lost its rating and is back to blank") even though the
    // ranking was still persisted in the DB.
    const r = movie?.rankings?.[0];
    const hasRating = typeof r?.ranking === "number";
    const isSeen = r?.seen_it === true;
    if (hasRating) {
      // Already rated — show the forming view with the existing rating.
      setStep("forming");
      setWatchConfirmed(true);
      setSelectedRating(r.ranking ?? null);
      setRatingPickerOpen(false);
    } else if (isSeen) {
      // Seen but not yet rated — skip Watch, land on Rate.
      setStep("rate");
      setWatchConfirmed(true);
      setSelectedRating(null);
      setRatingPickerOpen(false);
    } else {
      setStep("watch");
      setWatchConfirmed(false);
      setSelectedRating(null);
      setRatingPickerOpen(false);
    }
    setNavigatingLabel(null);
  }, [isOpen, movie?.id, movie?.rankings]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [isOpen, onClose]);

  const handleSeenItToggle = useCallback(() => {
    if (!movie) return;
    setWatchConfirmed(true);
    onConfirmWatch(movie.id);
  }, [movie, onConfirmWatch]);

  const handleJustSeen = useCallback(() => {
    // Dwell so the Seen state registers visually before advancing to Rate
    window.setTimeout(() => setStep("rate"), 480);
  }, []);

  const handleRateSubmit = useCallback(
    (rating: number) => {
      if (!movie) return;
      setSelectedRating(rating);
      onRate(movie.id, rating);
      // Advance to the forming step instead of closing — the user needs to see
      // eligibility, ballot progress, and a path forward (rate more, try a new
      // year, or save their work by signing up).
      window.setTimeout(() => setStep("forming"), 520);
    },
    [movie, onRate]
  );

  if (!isOpen || !movie) return null;

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-pick-flow-title"
      className="fixed inset-0 z-[300] flex items-center justify-center px-4 py-6 sm:py-10"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-sm rounded-2xl border border-gray-700/60 bg-charcoal-900 shadow-2xl shadow-black/60 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close affordance */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step indicator */}
        <div className="px-5 pt-5 pb-3 flex items-center gap-2">
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider ${
              step === "watch" ? "text-gold-400" : "text-gray-500"
            }`}
          >
            1 · Watch
          </span>
          <div className="flex-1 h-px bg-gray-700/60" />
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider ${
              step === "rate" ? "text-gold-400" : "text-gray-500"
            }`}
          >
            2 · Rate
          </span>
          <div className="flex-1 h-px bg-gray-700/60" />
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider ${
              step === "forming" ? "text-gold-400" : "text-gray-500"
            }`}
          >
            3 · Form
          </span>
        </div>

        <div className="px-5 pb-5">
          {/* Movie card — same shape across both steps. Action affordances on the
              card itself, so the user learns where Seen + Rate live in the app. */}
          <OnboardingMovieCard
            movie={movie}
            step={step}
            seenIt={watchConfirmed}
            onSeenItToggle={handleSeenItToggle}
            onJustSeen={handleJustSeen}
            selectedRating={selectedRating}
            ratingPickerOpen={ratingPickerOpen}
            onOpenRatePicker={() => setRatingPickerOpen(true)}
          />

          {/* Step-specific guidance lives BELOW the card so the eye lands on the
              card first. Tooltip-style microcopy, not heavy instructions. */}
          {step === "watch" ? (
            <WatchGuidance
              movieTitle={movie.title}
              confirmed={watchConfirmed}
              onPickAnother={() => {
                onPickAnother();
                onClose();
              }}
            />
          ) : step === "rate" ? (
            <RatePicker
              movieTitle={movie.title}
              selectedRating={selectedRating}
              pickerOpen={ratingPickerOpen}
              onSelect={handleRateSubmit}
              onBack={() => {
                setStep("watch");
                setSelectedRating(null);
                setRatingPickerOpen(false);
              }}
            />
          ) : navigatingLabel ? (
            <NavigatingPanel label={navigatingLabel} />
          ) : (
            <FormingPanel
              movie={movie}
              rating={selectedRating ?? 0}
              currentNomineeCountForYear={currentNomineeCountForYear}
              onRateAnother={() => {
                setNavigatingLabel(
                  movie.release_year
                    ? `Loading ${movie.release_year} films…`
                    : "Loading films…"
                );
                onRateAnother();
              }}
              onTryAnotherYear={() => {
                setNavigatingLabel("Loading films…");
                onTryAnotherYear();
              }}
              onSignup={() => {
                setNavigatingLabel("Taking you to sign up…");
                onSignup();
              }}
              onSeeStanding={() => {
                setNavigatingLabel(
                  movie.release_year
                    ? `Loading your ${movie.release_year} race…`
                    : "Loading your race…"
                );
                onSeeStanding();
              }}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}

// ── The card — actions live here, matching real in-app card layout ──────────

// Mirrors the real interactive grid card (MovieCard `interactive` variant):
// poster on top with an action overlay at the bottom (SeenItButton on the left,
// Rate badge on the right), then title + year below the poster. By using the
// same shape, the user learns where these controls live everywhere else.
function OnboardingMovieCard({
  movie,
  step,
  seenIt,
  onSeenItToggle,
  onJustSeen,
  selectedRating,
  ratingPickerOpen,
  onOpenRatePicker,
}: {
  movie: Movie;
  step: Step;
  seenIt: boolean;
  onSeenItToggle: () => void;
  onJustSeen: () => void;
  selectedRating: number | null;
  ratingPickerOpen: boolean;
  onOpenRatePicker: () => void;
}) {
  const posterSrc = normalizeImageUrl(movie.poster_url ?? null);
  const ratingStyle = selectedRating ? getRatingStyle(selectedRating) : null;
  const pulseOnSeen = step === "watch" && !seenIt;
  // Pulse the Rate badge only while step 2 is waiting for the user to OPEN
  // the picker. Once it's open, the attention shifts down to the 1-10 list.
  const pulseOnRate = step === "rate" && selectedRating === null && !ratingPickerOpen;
  const rateClickable = step === "rate" && selectedRating === null && !ratingPickerOpen;

  return (
    <div className="mx-auto mb-4 w-full max-w-[220px]">
      <div className="overflow-hidden rounded-xl bg-gray-800 shadow-lg border border-gray-700/60">
        {/* Poster + action overlay */}
        <div className="relative aspect-[2/3] bg-charcoal-900">
          {posterSrc ? (
            <Image
              src={posterSrc}
              alt={movie.title}
              fill
              className="object-cover"
              unoptimized
              sizes="220px"
            />
          ) : null}

          {/* Bookmark icon — present but inert; matches real card top-right slot */}
          <button
            type="button"
            disabled
            aria-hidden
            className="absolute top-2 right-2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-black/40 border border-gray-600/40 text-gray-400 cursor-default"
          >
            <Bookmark className="w-4 h-4" />
          </button>

          {/* Action overlay — same shape and classes as the live MovieCard
              interactive overlay, so the muscle memory transfers. */}
          <div
            className="absolute left-0 right-0 bottom-0 flex items-end justify-between px-2.5 py-2 z-20"
            style={{
              background:
                "linear-gradient(to top, rgba(18,18,20,0.70) 55%, rgba(18,18,20,0.0) 100%)",
              minHeight: "30%",
            }}
          >
            {/* Left: Seen / Unseen — real SeenItButton with the in-app classes */}
            <div className={`relative ${pulseOnSeen ? "tour-pulse-ring rounded-lg" : ""}`}>
              <SeenItButton
                seenIt={seenIt}
                onClick={onSeenItToggle}
                onJustSeen={onJustSeen}
                showText={true}
                size="sm"
                className="min-h-[44px] px-2.5 rounded-lg border border-gray-600/40 bg-black/40 hover:bg-black/60 text-xs font-semibold gap-1"
              />
            </div>

            {/* Right: Rate — clickable button in step 2 (opens the 1-10 picker),
                static span once a rating is selected. Same visual shape as the
                live MovieCard Rate button. */}
            <div className={`relative ${pulseOnRate ? "tour-pulse-ring rounded-lg" : ""}`}>
              {rateClickable ? (
                <button
                  type="button"
                  onClick={onOpenRatePicker}
                  className="flex items-center gap-1 min-h-[44px] px-2.5 rounded-lg border border-always-white/15 text-xs font-semibold transition-colors hover:border-always-gold-400/60 active:scale-95"
                  style={{ backgroundColor: "rgba(30,30,34,0.75)", color: "#fde68a" }}
                  aria-label="Open rating picker"
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>Rate</span>
                </button>
              ) : (
                <span
                  className={`flex items-center gap-1 h-9 px-2.5 rounded-lg border font-semibold transition-colors ${
                    selectedRating
                      ? "text-sm border-always-white/25"
                      : "text-xs border-always-white/15"
                  }`}
                  style={
                    selectedRating && ratingStyle
                      ? { backgroundColor: ratingStyle.background, color: ratingStyle.text }
                      : { backgroundColor: "rgba(30,30,34,0.75)", color: "#9ca3af" }
                  }
                >
                  <Star
                    className={`w-3.5 h-3.5 ${selectedRating ? "fill-current" : ""}`}
                  />
                  <span>{selectedRating ?? "Rate"}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Title + year — below the poster, matching the real card */}
        <div className="px-3 py-2.5">
          <h2
            id="onboarding-pick-flow-title"
            className="text-sm font-semibold text-white leading-snug line-clamp-2"
          >
            {movie.title}
          </h2>
          {movie.release_year && (
            <p className="text-xs text-gray-500 mt-0.5">{movie.release_year}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Watch — guidance below the card ─────────────────────────────────

function WatchGuidance({
  movieTitle,
  confirmed,
  onPickAnother,
}: {
  movieTitle: string;
  confirmed: boolean;
  onPickAnother: () => void;
}) {
  return (
    <div>
      <p className="text-sm text-gray-300 leading-relaxed">
        {confirmed ? (
          <>
            <Check className="inline-block w-4 h-4 text-emerald-400 mr-1 -mt-0.5" />
            Marked as watched. Next: rate it.
          </>
        ) : (
          <>
            Tap <span className="font-semibold text-gray-100">Unseen</span> on the card to mark <span className="text-gold-300">{movieTitle}</span> as watched. That's how Reawarding learns this is part of your taste.
          </>
        )}
      </p>

      {!confirmed && (
        <button
          type="button"
          onClick={onPickAnother}
          className="mt-4 inline-flex items-center min-h-[44px] px-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Haven't seen it? Pick another →
        </button>
      )}
    </div>
  );
}

// ── Step 2: Rate — picker below the card ────────────────────────────────────

function RatePicker({
  movieTitle,
  selectedRating,
  pickerOpen,
  onSelect,
  onBack,
}: {
  movieTitle: string;
  selectedRating: number | null;
  pickerOpen: boolean;
  onSelect: (rating: number) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <p className="text-sm text-gray-300 leading-relaxed mb-3">
        {selectedRating ? (
          <>
            <Check className="inline-block w-4 h-4 text-emerald-400 mr-1 -mt-0.5" />
            You rated <span className="text-gold-300">{movieTitle}</span> a {selectedRating}.
          </>
        ) : pickerOpen ? (
          <>
            Pick a score for <span className="text-gold-300">{movieTitle}</span>. Rating 7 or higher means &ldquo;this belongs on my ballot.&rdquo;
          </>
        ) : (
          <>
            Tap <span className="font-semibold text-gray-100">Rate</span> on the card to score <span className="text-gold-300">{movieTitle}</span>. Rating 7 or higher means &ldquo;this belongs on my ballot.&rdquo;
          </>
        )}
      </p>

      {/* 1-10 list only renders once the user taps Rate. Keeps step 2 quiet
          until they engage the affordance, mirroring step 1's pattern. */}
      {pickerOpen && (
        <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
          {RATING_OPTIONS.map((num) => {
            const style = getRatingStyle(num);
            const isSelected = selectedRating === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => onSelect(num)}
                disabled={selectedRating !== null}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-all ${
                  isSelected
                    ? "ring-2 ring-gold-400 scale-[1.02]"
                    : selectedRating !== null
                    ? "opacity-30"
                    : "hover:scale-[1.01] active:scale-[0.99]"
                }`}
                style={{
                  backgroundColor: style.background,
                  color: style.text,
                }}
                aria-pressed={isSelected}
              >
                <span className="w-7 text-base font-bold tabular-nums">{num}</span>
                <span className="text-sm font-semibold flex-1">{RATING_LABELS[num]}</span>
                {isSelected && <Check className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={onBack}
        disabled={selectedRating !== null}
        className="mt-3 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-30"
      >
        <ArrowLeft className="w-3 h-3" />
        Back
      </button>
    </div>
  );
}

// ── Navigating overlay — held while a forming-step CTA loads the next page.
// Keeps the modal in place so the user never sees a flash of the underlying
// home screen during the navigation gap.

function NavigatingPanel({ label }: { label: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-10 text-center"
      aria-live="polite"
    >
      <Loader2 className="h-7 w-7 text-gold-400 animate-spin" aria-hidden="true" />
      <p className="mt-4 text-sm text-gray-300">{label}</p>
    </div>
  );
}

// ── Step 3: Form — eligibility, progress, next actions ──────────────────────
// The loop's emotional payoff lives here. Don't drop the user back to a blank
// homepage after their first rating — show them the ballot beginning to form
// and give them a clear path forward (rate more, switch years, save & sign up).

const BALLOT_THRESHOLD = 5; // min nominees to "set" the year's award

function FormingPanel({
  movie,
  rating,
  currentNomineeCountForYear,
  onRateAnother,
  onTryAnotherYear,
  onSignup,
  onSeeStanding,
  onClose,
}: {
  movie: Movie;
  rating: number;
  currentNomineeCountForYear: number;
  onRateAnother: () => void;
  onTryAnotherYear: () => void;
  onSignup: () => void;
  onSeeStanding: () => void;
  onClose: () => void;
}) {
  const year = movie.release_year;
  const qualifies = rating >= 7;
  const newCount = currentNomineeCountForYear + (qualifies ? 1 : 0);
  const justSetTheAward = qualifies && newCount === BALLOT_THRESHOLD;
  const stillNeeded = Math.max(0, BALLOT_THRESHOLD - newCount);
  const progressDots = Math.min(BALLOT_THRESHOLD, newCount);

  // ── Branch A: rating below 7 — saved as taste, not a nominee ──────────────
  if (!qualifies) {
    return (
      <div>
        <p className="text-sm text-gray-300 leading-relaxed">
          Rated {rating}. <span className="text-gray-400">Saved as part of your taste — but a 7+ is needed to nominate.</span>
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onRateAnother}
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg border border-gold-500/30 bg-gold-500/10 px-4 py-2.5 text-sm font-medium text-gold-200 hover:bg-gold-500/15 transition-colors"
          >
            Pick another film
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onSignup}
            className="inline-flex items-center justify-center min-h-[44px] text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Save your taste with an account →
          </button>
        </div>
      </div>
    );
  }

  // ── Branch B: rating ≥ 7, just crossed the 5-nominee threshold ───────────
  if (justSetTheAward) {
    return (
      <div aria-live="polite">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-5 h-5 text-gold-300" aria-hidden="true" />
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-300">
            Award set
          </p>
        </div>
        <p className="text-sm text-gray-200 leading-relaxed">
          Your <span className="font-semibold text-white">{year}</span> ballot is set with {BALLOT_THRESHOLD} nominees. <span className="text-gray-400">Save it before you leave — your awards travel with your account.</span>
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onSignup}
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-gold-400 transition-colors"
          >
            Save my awards
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center min-h-[44px] text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Keep going as guest →
          </button>
        </div>
      </div>
    );
  }

  // ── Branch C: rating ≥ 7, still building toward 5 (or past it) ───────────
  return (
    <div>
      <p className="text-sm text-gray-200 leading-relaxed">
        <span className="text-gold-300 font-medium">{movie.title}</span> just joined your <span className="font-semibold text-white">{year}</span> ballot.
      </p>
      {/* Progress dots — visible at-a-glance signal */}
      <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: BALLOT_THRESHOLD }).map((_, i) => (
          <span
            key={i}
            className={`block h-2 w-2 rounded-full ${
              i < progressDots ? "bg-gold-400" : "bg-gray-700"
            }`}
          />
        ))}
        <span className="ml-2 text-xs tabular-nums text-gray-400">
          {newCount} / {BALLOT_THRESHOLD}
        </span>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        {stillNeeded > 0
          ? `${stillNeeded} more ${stillNeeded === 1 ? "rating" : "ratings"} of 7+ from ${year} to set your award.`
          : `Your ${year} ballot is set — keep rating to fill all 10 nominee slots.`}
      </p>
      <button
        type="button"
        onClick={onSeeStanding}
        className="mt-3 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
      >
        See your {year} race so far
        <ArrowRight className="w-3 h-3" aria-hidden="true" />
      </button>
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onRateAnother}
          className="inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg border border-gold-500/40 bg-gold-500/10 px-4 py-2.5 text-sm font-medium text-gold-200 hover:bg-gold-500/15 transition-colors"
        >
          {stillNeeded > 0 ? `Rate another ${year} film` : `Add another nominee`}
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onTryAnotherYear}
          className="inline-flex items-center justify-center min-h-[44px] text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          Try a different year →
        </button>
        <button
          type="button"
          onClick={onSignup}
          className="inline-flex items-center justify-center min-h-[44px] text-xs text-gold-300 hover:text-gold-200 transition-colors"
        >
          Save my work — sign up →
        </button>
      </div>
    </div>
  );
}

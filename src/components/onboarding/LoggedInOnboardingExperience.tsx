"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import MovieSearchPicker from "@/components/home/MovieSearchPicker";
import type { Movie } from "@/types/types";
import type { LoggedInOnboardingStage } from "@/hooks/useLoggedInOnboarding";

const STORAGE_KEY = "reawarding-guide-collapsed";

interface LoggedInOnboardingExperienceProps {
  // Note: `movies` and `awards` are no longer used by this component
  // directly — keeping them in the interface would couple consumers to a
  // contract we don't honor. The parent owns the onboarding metrics now
  // and passes the derived `stage` directly.
  stage: LoggedInOnboardingStage;
  suggestedQuery?: string;
  onSelectMovie: (movie: Movie) => void;
  onSuggestedQuery: (query: string) => void;
  onShowHowItWorks: () => void;
  onDismiss: () => void;
}

interface StageCopy {
  eyebrow: string;
  headline: string;
  body: string;        // one sentence — shown directly under headline
  searchHint: string;  // one sentence — shown under search input
}

const EXAMPLE_FILMS = ["The Dark Knight", "Titanic", "Get Out", "La La Land"];

const STAGE_COPY: Record<LoggedInOnboardingStage, StageCopy> = {
  welcome: {
    eyebrow: "First-time setup",
    headline: "Start with one film you know.",
    body: "Rate something you remember clearly and ReAwarding places it in its year — your first winner begins to emerge from there.",
    searchHint: "Rate one film to give ReAwarding its first signal.",
  },
  "first-rating": {
    eyebrow: "Your first signal is in",
    headline: "Keep rating what you know best.",
    body: "A few more films from the same year are enough for nominees to start sorting themselves out.",
    searchHint: "Two or three more ratings in the same year will make the pattern obvious.",
  },
  "year-taking-shape": {
    eyebrow: "The field is forming",
    headline: "Your first year is starting to take shape.",
    body: "Strong ratings rise toward nominees — lower ratings still help define what stays out.",
    searchHint: "Ratings of 7 or higher rise into nominees for that year.",
  },
  "winner-emerging": {
    eyebrow: "A leader is emerging",
    headline: "You can already feel the winner forming.",
    body: "ReAwarding is reading your taste, not consensus. The current leader is provisional — overrule it whenever you disagree.",
    searchHint: "A few more ratings will make the current winner feel much more earned.",
  },
  "timeline-building": {
    eyebrow: "Your history is beginning",
    headline: "You are starting to build a personal history.",
    body: "One year becomes two, then a timeline. Start another year or strengthen the one already in motion.",
    searchHint: "Keep rating and your canon starts to feel coherent across time.",
  },
  complete: {
    eyebrow: "",
    headline: "",
    body: "",
    searchHint: "",
  },
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function LoggedInOnboardingExperience({
  stage,
  suggestedQuery,
  onSelectMovie,
  onSuggestedQuery,
  onShowHowItWorks,
  onDismiss,
}: LoggedInOnboardingExperienceProps) {
  const copy = STAGE_COPY[stage];

  // Collapse state — localStorage so it survives navigation but isn't permanent
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, isCollapsed ? "1" : "0");
  }, [isCollapsed]);

  // ── Collapsed strip ───────────────────────────────────────────────────────
  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setIsCollapsed(false)}
        className="w-full mb-6 flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-left hover:border-gold-500/25 hover:bg-white/[0.03] transition-colors group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gold-500/60" />
          <span className="text-xs font-medium text-gray-500 group-hover:text-gray-300 transition-colors">
            {copy.eyebrow || "First-time setup"}
          </span>
          <span className="inline text-xs text-gray-500 truncate">
            — {copy.headline || "Start with one film you know."}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 text-[11px] text-gray-500 group-hover:text-gray-400 transition-colors">
          Show guide
          <ChevronDown className="h-3 w-3" />
        </div>
      </button>
    );
  }

  // ── Expanded guide ────────────────────────────────────────────────────────
  return (
    <div className="mb-8">
      {/* Outer wrapper: shadow + border + radius — NO overflow-hidden so search glow isn't clipped */}
      <div
        className={`rounded-2xl border ${stage === "welcome" ? "border-always-white/[0.06]" : "border-always-gold-500/25"}`}
        style={{
          background: "#0B0F14",
          boxShadow: stage === "welcome"
            ? "0 4px 16px rgba(0,0,0,0.40)"
            : "0 10px 40px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        {/* Gold top-edge accent — hidden at welcome to reduce chrome */}
        {stage !== "welcome" && (
          <div className="rounded-t-2xl overflow-hidden" aria-hidden>
            <div
              style={{
                height: "2px",
                background: "linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.55) 30%, rgba(212,175,55,0.55) 70%, transparent 100%)",
              }}
            />
          </div>
        )}

        <div className={stage === "welcome" ? "p-5 sm:p-6" : "p-6 sm:p-8"}>

          {/* ── Row 1: Badge only — no chrome competing with the headline ── */}
          <div className="mb-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] ${
              stage === "welcome"
                ? "border border-always-white/[0.08] bg-transparent text-always-white/40"
                : "border border-always-gold-500/30 bg-always-gold-500/[0.10] text-always-gold-400"
            }`}>
              {stage !== "welcome" && <Sparkles className="h-2.5 w-2.5" />}
              {copy.eyebrow || "First-time setup"}
            </span>
          </div>

          {/* ── Row 2: Headline ─────────────────────────────────────────── */}
          {/* Dominant — largest type on the card, nothing competes */}
          <h2 className="font-unbounded text-2xl font-bold text-always-white leading-tight sm:text-3xl">
            {copy.headline || "Start with one film you know."}
          </h2>
          {/* Body: only shown post-welcome — at welcome the search IS the next step */}
          {stage !== "welcome" && copy.body && (
            <p className="mt-3 text-sm leading-relaxed text-always-white/75 max-w-xl">
              {copy.body}
            </p>
          )}

          {/* ── Row 3: Search — primary action, card-level space ────────── */}
          {/* No inner container. The search field IS the card's focal point. */}
          <div className={stage === "welcome" ? "mt-6" : "mt-7"}>
            <MovieSearchPicker
              onSelect={onSelectMovie}
              placeholder="Search for a movie to rate…"
              variant="hero"
              suggestedQuery={suggestedQuery}
            />
            {/* Hint: one sentence, small, immediately below input */}
            <p className="mt-2.5 text-xs text-always-white/50">{copy.searchHint}</p>
            {/* Chips: example shortcuts, ONLY at welcome — once the user has
                rated anything, the ballot card below is their workshop and
                chips would just compete with it. */}
            {stage === "welcome" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMPLE_FILMS.map((film) => (
                  <button
                    key={film}
                    type="button"
                    onClick={() => onSuggestedQuery(film)}
                    className="rounded-full border border-always-white/[0.08] bg-transparent px-3 py-1 text-xs text-always-white/50 hover:border-always-gold-500/35 hover:text-always-gold-300 transition-colors"
                  >
                    {film}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Footer: hide + dismiss controls live here, not at the top ── */}
          <div className="mt-5 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onShowHowItWorks}
              className="inline-flex items-center gap-1.5 text-xs text-always-white/45 hover:text-always-white/65 transition-colors"
            >
              How ratings shape a year
              <ArrowRight className="h-2.5 w-2.5" />
            </button>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="flex items-center gap-1 text-xs text-always-white/35 hover:text-always-white/55 transition-colors"
              >
                Hide guide
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="text-xs text-always-white/35 hover:text-always-white/55 transition-colors"
              >
                Don't show again
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Film,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import MovieSearchPicker from "@/components/home/MovieSearchPicker";
import type { Movie } from "@/types/types";
import type { UserAward } from "@/hooks/useUserAwards";
import {
  useLoggedInOnboarding,
  type LoggedInOnboardingStage,
} from "@/hooks/useLoggedInOnboarding";

const STORAGE_KEY = "reawarding-guide-collapsed";

interface RecentRating {
  title: string;
  year: number | null;
  rating: number | null;
}

interface LoggedInOnboardingExperienceProps {
  movies: Movie[];
  awards: UserAward[];
  suggestedQuery?: string;
  onSelectMovie: (movie: Movie) => void;
  onSuggestedQuery: (query: string) => void;
  onOpenYear: (year: number) => void;
  onShowHowItWorks: () => void;
  onDismiss: () => void;
  recentlyRated: RecentRating | null;
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

// ─── Step pipeline ────────────────────────────────────────────────────────────

const STEPS = [
  { icon: Clapperboard, label: "Rate a film",      detail: "Start with something you know well." },
  { icon: Film,         label: "It joins its year", detail: "Placed automatically. No setup needed." },
  { icon: Sparkles,     label: "Nominees form",     detail: "Strong ratings rise toward nominees." },
  { icon: Trophy,       label: "A winner emerges",  detail: "Your top-rated film leads the year." },
  { icon: Star,         label: "You refine it",     detail: "Adjust or overrule whenever you want." },
];

function StepPipeline({ activeStep }: { activeStep: number }) {
  return (
    <div className="flex items-stretch divide-x divide-white/[0.04]">
      {STEPS.map((step, i) => {
        const isComplete = i < activeStep;
        const Icon = step.icon;
        return (
          <div
            key={step.label}
            className={[
              "flex flex-col gap-1 px-2.5 py-2 flex-1 min-w-0",
              i === 0 ? "rounded-l-xl" : "",
              i === STEPS.length - 1 ? "rounded-r-xl" : "",
              isComplete ? "bg-emerald-500/[0.03]" : "",
            ].join(" ")}
          >
            <div className="flex items-center gap-1">
              <span
                className={[
                  "flex-shrink-0 flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold leading-none",
                  isComplete ? "bg-emerald-500/10 text-emerald-500/60 border border-emerald-500/20" : "bg-white/[0.03] text-gray-700 border border-white/[0.07]",
                ].join(" ")}
              >
                {isComplete ? "✓" : i + 1}
              </span>
              <Icon
                className={`h-3 w-3 flex-shrink-0 ${isComplete ? "text-emerald-500/50" : "text-gray-700"}`}
              />
            </div>
            <p className={`text-xs font-medium leading-tight ${
              isComplete ? "text-emerald-500/60" : "text-gray-600"
            }`}>
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── State indicator row (replaces 4 full cards) ──────────────────────────────

function StateRow({
  label,
  value,
  accent,
  cta,
  onClick,
}: {
  label: string;
  value: string;
  accent?: "gold" | "green" | "dim";
  cta?: string;
  onClick?: () => void;
}) {
  const dotColor =
    accent === "gold"  ? "bg-yellow-400" :
    accent === "green" ? "bg-emerald-400" :
                         "bg-gray-700";
  const valColor =
    accent === "gold"  ? "text-yellow-200" :
    accent === "green" ? "text-emerald-300" :
                         "text-gray-500";

  return (
    <div className="flex items-center gap-2.5 py-2.5 border-b border-white/[0.05] last:border-0">
      <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span className="text-xs text-gray-500 w-24 flex-shrink-0">{label}</span>
      <span className={`text-xs font-medium flex-1 min-w-0 truncate ${valColor}`}>{value}</span>
      {cta && onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium text-yellow-500/70 hover:text-yellow-300 transition-colors"
        >
          {cta}
          <ArrowRight className="h-2.5 w-2.5" />
        </button>
      ) : null}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LoggedInOnboardingExperience({
  movies,
  awards,
  suggestedQuery,
  onSelectMovie,
  onSuggestedQuery,
  onOpenYear,
  onShowHowItWorks,
  onDismiss,
  recentlyRated,
}: LoggedInOnboardingExperienceProps) {
  const onboarding = useLoggedInOnboarding(movies, awards, false);
  const copy = STAGE_COPY[onboarding.stage];

  // Collapse state — localStorage so it survives navigation but isn't permanent
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, isCollapsed ? "1" : "0");
  }, [isCollapsed]);

  const activeStep = useMemo(() => {
    switch (onboarding.stage) {
      case "welcome":           return 0;
      case "first-rating":      return 1;
      case "year-taking-shape": return 2;
      case "winner-emerging":   return 3;
      case "timeline-building": return 4;
      default:                  return 4;
    }
  }, [onboarding.stage]);

  const momentMessage = useMemo(() => {
    if (recentlyRated?.title && recentlyRated.year) {
      return `${recentlyRated.title} now belongs to ${recentlyRated.year}. Keep feeding that year and the race gets sharper.`;
    }
    if (onboarding.stage === "first-rating" && onboarding.strongestYear) {
      return `Your early signal is landing in ${onboarding.strongestYear}. Stay with that year for the clearest next payoff.`;
    }
    if (onboarding.stage === "year-taking-shape" && onboarding.strongestYear) {
      return `${onboarding.strongestYear} has started to cohere. Strong ratings rise fastest, but every score helps define the field.`;
    }
    if (onboarding.stage === "winner-emerging" && onboarding.strongestYear && onboarding.strongestYearWinnerTitle) {
      return `${onboarding.strongestYearWinnerTitle} is your current ${onboarding.strongestYear} leader based on the ratings so far.`;
    }
    if (onboarding.stage === "timeline-building" && onboarding.yearsStarted > 1) {
      return `${onboarding.yearsStarted} years are now in motion. This is where ReAwarding starts to feel like your own history.`;
    }
    return null;
  }, [onboarding, recentlyRated]);

  // ── State row data — compact single-line values ───────────────────────────
  const yearValue = onboarding.strongestYear
    ? `${onboarding.strongestYear} · ${onboarding.strongestYearCount} film${onboarding.strongestYearCount === 1 ? "" : "s"} rated`
    : "—";
  const nomineeValue = onboarding.strongestYearNomineeCount > 0
    ? `${onboarding.strongestYearNomineeCount} nominee${onboarding.strongestYearNomineeCount === 1 ? "" : "s"} rising`
    : "—";
  const winnerValue = onboarding.strongestYearWinnerTitle ?? "—";
  const historyValue = onboarding.yearsStarted > 1
    ? `${onboarding.yearsStarted} years underway`
    : "—";

  // ── Collapsed strip ───────────────────────────────────────────────────────
  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setIsCollapsed(false)}
        className="w-full mb-6 flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-left hover:border-yellow-500/25 hover:bg-white/[0.03] transition-colors group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-yellow-500/60" />
          <span className="text-xs font-medium text-gray-500 group-hover:text-gray-300 transition-colors">
            {copy.eyebrow || "First-time setup"}
          </span>
          <span className="inline text-xs text-gray-700 truncate">
            — {copy.headline || "Start with one film you know."}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 text-[11px] text-gray-600 group-hover:text-gray-400 transition-colors">
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
        className={`rounded-2xl border ${onboarding.stage === "welcome" ? "border-white/[0.06]" : "border-yellow-500/25"}`}
        style={{
          background: "#0B0F14",
          boxShadow: onboarding.stage === "welcome"
            ? "0 4px 16px rgba(0,0,0,0.40)"
            : "0 10px 40px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        {/* Gold top-edge accent — hidden at welcome to reduce chrome */}
        {onboarding.stage !== "welcome" && (
          <div className="rounded-t-2xl overflow-hidden" aria-hidden>
            <div
              style={{
                height: "2px",
                background: "linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.55) 30%, rgba(212,175,55,0.55) 70%, transparent 100%)",
              }}
            />
          </div>
        )}

        <div className={onboarding.stage === "welcome" ? "p-5 sm:p-6" : "p-6 sm:p-8"}>

          {/* ── Row 1: Badge only — no chrome competing with the headline ── */}
          <div className="mb-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] ${
              onboarding.stage === "welcome"
                ? "border border-white/[0.08] bg-transparent text-gray-600"
                : "border border-yellow-500/30 bg-yellow-500/[0.10] text-yellow-400"
            }`}>
              {onboarding.stage !== "welcome" && <Sparkles className="h-2.5 w-2.5" />}
              {copy.eyebrow || "First-time setup"}
            </span>
          </div>

          {/* ── Row 2: Headline ─────────────────────────────────────────── */}
          {/* Dominant — largest type on the card, nothing competes */}
          <h2 className="font-unbounded text-2xl font-bold text-white leading-tight sm:text-3xl">
            {copy.headline || "Start with one film you know."}
          </h2>
          {/* Body: only shown post-welcome — at welcome the search IS the next step */}
          {onboarding.stage !== "welcome" && copy.body && (
            <p className="mt-3 text-sm leading-relaxed text-gray-300 max-w-xl">
              {copy.body}
            </p>
          )}

          {/* ── Row 3: Search — primary action, card-level space ────────── */}
          {/* No inner container. The search field IS the card's focal point. */}
          <div className={onboarding.stage === "welcome" ? "mt-6" : "mt-7"}>
            <MovieSearchPicker
              onSelect={onSelectMovie}
              placeholder="Search for a movie to rate…"
              variant="hero"
              suggestedQuery={suggestedQuery}
            />
            {/* Hint: one sentence, small, immediately below input */}
            <p className="mt-2.5 text-xs text-gray-500">{copy.searchHint}</p>
            {/* Chips: example shortcuts, clearly tertiary */}
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLE_FILMS.map((film) => (
                <button
                  key={film}
                  type="button"
                  onClick={() => onSuggestedQuery(film)}
                  className="rounded-full border border-white/[0.08] bg-transparent px-3 py-1 text-xs text-gray-500 hover:border-yellow-500/35 hover:text-yellow-300 transition-colors"
                >
                  {film}
                </button>
              ))}
            </div>
          </div>

          {/* ── Moment message — emotional anchor, stronger than secondary zone ── */}
          {momentMessage ? (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-500/35 bg-emerald-500/[0.10] px-4 py-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Sparkles className="flex-shrink-0 mt-0.5 h-4 w-4 text-emerald-400" />
              <p className="text-sm font-medium leading-relaxed text-emerald-200">{momentMessage}</p>
            </div>
          ) : null}

          {/* ── Secondary zone: only visible post-welcome, fades in as system becomes visible ── */}
          {onboarding.stage !== "welcome" && (
            <>
              <div className="mt-8 border-t border-white/[0.06] animate-in fade-in duration-500" />

              <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_200px] animate-in fade-in duration-700">

                {/* Step pipeline — no section label */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  <StepPipeline activeStep={activeStep} />
                </div>

                {/* State rows — no section label */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-1">
                  <StateRow
                    label="Current year"
                    value={yearValue}
                    accent={onboarding.strongestYear ? "gold" : "dim"}
                    cta={onboarding.strongestYear ? "Open" : undefined}
                    onClick={onboarding.strongestYear ? () => onOpenYear(onboarding.strongestYear!) : undefined}
                  />
                  <StateRow
                    label="Nominees"
                    value={nomineeValue}
                    accent={onboarding.strongestYearNomineeCount > 0 ? "green" : "dim"}
                  />
                  <StateRow
                    label="Current winner"
                    value={winnerValue}
                    accent={onboarding.strongestYearWinnerTitle ? "gold" : "dim"}
                    cta={onboarding.strongestYear && onboarding.strongestYearWinnerTitle ? "Refine" : undefined}
                    onClick={onboarding.strongestYear ? () => onOpenYear(onboarding.strongestYear!) : undefined}
                  />
                  <StateRow
                    label="History"
                    value={historyValue}
                    accent={onboarding.yearsStarted > 1 ? "green" : "dim"}
                  />
                </div>
              </div>
            </>
          )}

          {/* ── Footer: hide + dismiss controls live here, not at the top ── */}
          <div className="mt-5 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onShowHowItWorks}
              className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              How ratings shape a year
              <ArrowRight className="h-2.5 w-2.5" />
            </button>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="flex items-center gap-1 text-xs text-gray-700 hover:text-gray-500 transition-colors"
              >
                Hide guide
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="text-xs text-gray-700 hover:text-gray-500 transition-colors"
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

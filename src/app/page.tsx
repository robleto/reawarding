"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import HomeHero from "@/app/components/home/HomeHero";
import PanelPremise from "@/app/components/home/PanelPremise";
import HowItWorksSection from "@/app/components/home/HowItWorksSection";
import PanelHook from "@/app/components/home/PanelHook";
import PanelTimeline from "@/app/components/home/PanelTimeline";
import PanelReassurance from "@/app/components/home/PanelReassurance";
import PanelFinalCTA from "@/app/components/home/PanelFinalCTA";
import MovieSearchPicker from "@/components/home/MovieSearchPicker";
import EditableYearSection from "@/components/award/EditableYearSection";
import { scrollToElementById, usePrefersReducedMotion } from "@/lib/motion";
import { getActiveAwardsSeasonYear } from "@/lib/awardsSeason";
import YearExplorer from "@/components/home/YearExplorer";
import { useMovieDataWithGuest } from "@/utils/sharedMovieUtils";
import { useCreateAward } from "@/hooks/useCreateAward";
import { useUserAwards } from "@/hooks/useUserAwards";
import { getGreeting } from "@/utils/greeting";
import { buildTasteProfile, getYearLeaders } from "@/utils/tasteInsights";
import { Search, BarChart3, Trophy, Star, ChevronDown, ChevronUp, ArrowRight, Film, Sparkles, UserCircle, Zap } from "lucide-react";
import type { Database } from "@/types/supabase";
import type { Movie } from "@/types/types";

const PANEL_IDS = [
  "panel-premise",
  "panel-how-it-works",
  "panel-hook",
  "panel-timeline",
  "panel-reassurance",
  "panel-final-cta",
] as const;

type OnboardingTourStep = 0 | 1 | 2 | 3;

interface YearExplorerSessionState {
  explorerYear: number;
  pickedMovieId: string | number | null;
  ratingTourStep: OnboardingTourStep;
}

type BallotLevel = "emerging" | "standard" | "complete" | "not-started";
type TimelineFilter = "in-progress" | "all";

function BallotTimelineCard({
  year,
  nomineeCount,
  level,
  isCurrentSeason,
  films,
  onClick,
}: {
  year: number;
  nomineeCount: number;
  level: BallotLevel;
  isCurrentSeason: boolean;
  films: Movie[];
  onClick: () => void;
}) {
  const pct = Math.min(100, (nomineeCount / 10) * 100);
  const border = {
    "not-started": "border-gray-700/30 hover:border-gray-600/50",
    emerging: "border-yellow-500/20 hover:border-yellow-400/40",
    standard: "border-yellow-500/20 hover:border-yellow-400/40",
    complete: "border-emerald-500/20 hover:border-emerald-400/40",
  }[level];
  const bar = {
    "not-started": "bg-gray-600",
    emerging: "bg-yellow-400",
    standard: "bg-yellow-400",
    complete: "bg-emerald-400",
  }[level];
  const badge = {
    "not-started": "bg-gray-700/60 text-gray-400",
    emerging: "bg-yellow-500/15 text-yellow-400",
    standard: "bg-yellow-500/15 text-yellow-300",
    complete: "bg-emerald-500/15 text-emerald-400",
  }[level];
  const badgeLabel = {
    "not-started": "new",
    emerging: "started",
    standard: "in progress",
    complete: "full",
  }[level];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col overflow-hidden rounded-xl border ${border} bg-gray-900/35 text-left transition-all hover:bg-gray-800/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-yellow-500/40`}
    >
      <div className="flex h-14 w-full gap-0.5 overflow-hidden rounded-t-xl">
        {films.slice(0, 3).map((movie) => {
          const src =
            movie.cached_thumb_url ||
            movie.thumb_url ||
            movie.cached_poster_url ||
            movie.poster_url ||
            "";
          return (
            <div key={movie.id} className="relative flex-1 overflow-hidden bg-gray-800">
              {src ? (
                <Image
                  src={src}
                  alt={movie.title}
                  fill
                  className="object-cover opacity-75 transition-opacity group-hover:opacity-100"
                  sizes="60px"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-800">
                  <Film className="h-3 w-3 text-gray-600" />
                </div>
              )}
            </div>
          );
        })}
        {Array.from({ length: Math.max(0, 3 - films.length) }).map((_, i) => (
          <div key={`empty-${year}-${i}`} className="flex-1 bg-gray-800/60" />
        ))}
      </div>
      <div className="flex flex-col gap-1.5 px-2.5 py-2">
        <div className="flex items-center justify-between gap-1">
          <span className="font-unbounded text-sm font-bold text-white">{year}</span>
          <div className="flex items-center gap-1">
            {isCurrentSeason ? (
              <span className="rounded-full border border-yellow-400/40 bg-yellow-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-yellow-300">
                current season
              </span>
            ) : null}
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${badge}`}>
              {badgeLabel}
            </span>
          </div>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-gray-700/50">
          <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <span className="tabular-nums text-[10px] text-gray-500">{nomineeCount}/10</span>
      </div>
    </button>
  );
}

export default function HomePage() {
  const router = useRouter();
  const supabase = useSupabaseClient<Database>();
  const reducedMotion = usePrefersReducedMotion();
  const { movies, user, userId, updateMovieRanking, isGuest } = useMovieDataWithGuest();
  const { createAward } = useCreateAward();
  const { awards } = useUserAwards();
  const [activePanelId, setActivePanelId] = useState<string>(PANEL_IDS[0]);
  const [showIndicator, setShowIndicator] = useState(false);
  const [explorerYear, setExplorerYear] = useState<number | null>(null);
  const [explorerIsEditing, setExplorerIsEditing] = useState(false);
  const [onboardingPickedMovieId, setOnboardingPickedMovieId] = useState<string | number | null>(null);
  const [onboardingPickedMovie, setOnboardingPickedMovie] = useState<Movie | null>(null);
  const [onboardingRatingTourStep, setOnboardingRatingTourStep] = useState<OnboardingTourStep>(0);
  const [showAllBallots, setShowAllBallots] = useState(true);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("in-progress");
  const [userProfile, setUserProfile] = useState<{
    first_name?: string;
    last_name?: string;
    username?: string;
    preferred_name?: string | null;
    last_login?: string;
  } | null>(null);
  const showOnboardingPanels = isGuest;
  const [renderOnboardingPanels, setRenderOnboardingPanels] = useState(showOnboardingPanels);
  const onboardingSessionKey = useMemo(
    () => `reawarding-year-explorer-onboarding:${userId || "guest"}`,
    [userId]
  );

  const existingAward = useMemo(() => {
    if (explorerYear == null) return null;
    return awards.find((award) => award.year === explorerYear) ?? null;
  }, [awards, explorerYear]);

  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id) return;
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, username, preferred_name, last_login")
        .eq("id", user.id)
        .single();
      if (data) setUserProfile(data);
    }
    void fetchProfile();
  }, [supabase, user?.id]);

  const handleCreateAwardFromExplorer = useCallback(
    (movie: Movie) => {
      void createAward({
        id: movie.id,
        title: movie.title,
        release_year: movie.release_year,
      });
    },
    [createAward]
  );

  const openYearExplorerForMovie = useCallback((movie: Movie, tourStep: OnboardingTourStep) => {
    if (!movie.release_year) return;
    window.setTimeout(() => {
      setExplorerYear(movie.release_year);
      setOnboardingPickedMovieId(movie.id);
      setOnboardingPickedMovie(movie);
      setOnboardingRatingTourStep(tourStep);
    }, 0);
  }, []);

  const handleSelectMovie = useCallback(
    (movie: Movie) => {
      if (!movie.release_year) return;
      // Guests use one-click onboarding (auto rate + auto create).
      if (isGuest) {
        void updateMovieRanking(movie.id as unknown as number, {
          seen_it: true,
          ranking: 10,
        });
        handleCreateAwardFromExplorer(movie);
        openYearExplorerForMovie(movie, 1);
        return;
      }

      // Logged-in users go straight into workshop mode without auto-rating.
      openYearExplorerForMovie(movie, 0);
    },
    [isGuest, updateMovieRanking, handleCreateAwardFromExplorer, openYearExplorerForMovie]
  );

  const scrollToPremise = useCallback(() => {
    scrollToElementById("panel-premise", reducedMotion);
  }, [reducedMotion]);

  const handleCloseExplorer = useCallback(() => {
    if (explorerIsEditing) return;
    setExplorerYear(null);
    setOnboardingPickedMovieId(null);
    setOnboardingPickedMovie(null);
    setOnboardingRatingTourStep(0);
  }, [explorerIsEditing]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.sessionStorage.getItem(onboardingSessionKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Partial<YearExplorerSessionState>;
      if (typeof parsed.explorerYear === "number" && Number.isFinite(parsed.explorerYear)) {
        setExplorerYear(parsed.explorerYear);
      }
      if (
        typeof parsed.pickedMovieId === "string" ||
        typeof parsed.pickedMovieId === "number" ||
        parsed.pickedMovieId === null
      ) {
        setOnboardingPickedMovieId(parsed.pickedMovieId);
      }
      if (
        parsed.ratingTourStep === 0 ||
        parsed.ratingTourStep === 1 ||
        parsed.ratingTourStep === 2 ||
        parsed.ratingTourStep === 3
      ) {
        setOnboardingRatingTourStep(parsed.ratingTourStep);
      }
    } catch {
      window.sessionStorage.removeItem(onboardingSessionKey);
    }
  }, [onboardingSessionKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (explorerYear === null) {
      window.sessionStorage.removeItem(onboardingSessionKey);
      return;
    }

    const payload: YearExplorerSessionState = {
      explorerYear,
      pickedMovieId: onboardingPickedMovieId,
      ratingTourStep: onboardingRatingTourStep,
    };

    window.sessionStorage.setItem(onboardingSessionKey, JSON.stringify(payload));
  }, [explorerYear, onboardingPickedMovieId, onboardingRatingTourStep, onboardingSessionKey]);

  useEffect(() => {
    if (!explorerYear) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [explorerYear]);

  useEffect(() => {
    if (!explorerYear) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (explorerIsEditing) return;
      handleCloseExplorer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [explorerYear, explorerIsEditing, handleCloseExplorer]);

  useEffect(() => {
    if (reducedMotion) {
      setShowIndicator(true);
      return;
    }

    const sections = PANEL_IDS.map((id) => document.getElementById(id)).filter(
      (node): node is HTMLElement => node instanceof HTMLElement
    );

    if (!sections.length) return;

    const ratios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratios.set(entry.target.id, entry.intersectionRatio);
        });

        let candidate: (typeof PANEL_IDS)[number] = PANEL_IDS[0];
        let maxRatio = 0;

        PANEL_IDS.forEach((id) => {
          const ratio = ratios.get(id) ?? 0;
          if (ratio > maxRatio) {
            maxRatio = ratio;
            candidate = id;
          }
        });

        if (maxRatio > 0.24) {
          setActivePanelId(candidate);
          setShowIndicator(true);
        }
      },
      {
        threshold: [0.2, 0.35, 0.5, 0.65, 0.8],
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [reducedMotion]);

  const indicatorItems = useMemo(
    () =>
      PANEL_IDS.map((id, index) => ({
        id,
        label: `Panel ${index + 1}`,
      })),
    []
  );

  const awardsForHome = useMemo(() => {
    const activeSeasonYear = getActiveAwardsSeasonYear();
    const movieById = new Map<string, Movie>();
    movies.forEach((movie) => movieById.set(String(movie.id), movie));

    return awards
      .map((award) => {
        const nomineeMovies = award.nomineeIds
          .map((id) => movieById.get(String(id)))
          .filter((movie): movie is Movie => Boolean(movie));
        const winnerKey = award.winnerId != null ? String(award.winnerId) : null;
        const winnerMovie =
          (winnerKey ? movieById.get(winnerKey) : undefined) ??
          nomineeMovies[0] ??
          null;
        if (!winnerMovie) return null;
        const nomineeCount = Math.max(award.nomineeIds.length, 1);
        const level: BallotLevel =
          nomineeCount >= 10
            ? "complete"
            : nomineeCount >= 5
              ? "standard"
              : nomineeCount >= 3
                ? "emerging"
                : "not-started";

        return {
          year: award.year,
          winnerTitle: winnerMovie.title,
          winnerPoster: winnerMovie.poster_url,
          nomineeCount,
          level,
          isCurrentSeason: award.year === activeSeasonYear,
          films: nomineeMovies.slice(0, 3),
        };
      })
      .filter(
        (
          entry
        ): entry is {
          year: number;
          winnerTitle: string;
          winnerPoster: string;
          nomineeCount: number;
          level: BallotLevel;
          isCurrentSeason: boolean;
          films: Movie[];
        } => Boolean(entry)
      )
      .sort((a, b) => b.year - a.year);
  }, [awards, movies]);

  const ballotYearsForHome = useMemo(() => {
    const activeSeasonYear = getActiveAwardsSeasonYear();
    const byYear = new Map<number, (typeof awardsForHome)[number]>();

    // Prefer saved award rows when they exist.
    for (const award of awardsForHome) {
      byYear.set(award.year, award);
    }

    // Any year with at least one ranked film counts as "in play".
    const rankedMovies = movies.filter((movie) => {
      const ranking = movie.rankings?.[0]?.ranking;
      return typeof ranking === "number" && ranking >= 1;
    });

    const grouped = new Map<number, Movie[]>();
    for (const movie of rankedMovies) {
      const year = movie.release_year;
      if (!Number.isFinite(year)) continue;
      const existing = grouped.get(year) ?? [];
      existing.push(movie);
      grouped.set(year, existing);
    }

    for (const [year, yearMovies] of grouped.entries()) {
      if (byYear.has(year)) continue;

      const sorted = [...yearMovies].sort((a, b) => {
        const ra = a.rankings?.[0]?.ranking ?? 0;
        const rb = b.rankings?.[0]?.ranking ?? 0;
        if (rb !== ra) return rb - ra;
        return a.title.localeCompare(b.title);
      });

      const contenderCount = sorted.filter((m) => (m.rankings?.[0]?.ranking ?? 0) >= 7).length;
      // If a year has any rated film, treat it as started even if no contender yet.
      const nomineeCount = Math.min(10, Math.max(contenderCount, 1));
      const level: BallotLevel =
        nomineeCount >= 10
          ? "complete"
          : nomineeCount >= 5
            ? "standard"
            : nomineeCount >= 3
              ? "emerging"
              : "not-started";

      byYear.set(year, {
        year,
        winnerTitle: sorted[0]?.title ?? String(year),
        winnerPoster: sorted[0]?.poster_url ?? null,
        nomineeCount,
        level,
        isCurrentSeason: year === activeSeasonYear,
        films: sorted.slice(0, 3),
      });
    }

    return Array.from(byYear.values()).sort((a, b) => b.year - a.year);
  }, [awardsForHome, movies]);

  const fullCount = useMemo(
    () => ballotYearsForHome.filter((award) => award.level === "complete").length,
    [ballotYearsForHome]
  );
  const inProgressCount = useMemo(
    () => ballotYearsForHome.filter((award) => award.level !== "complete").length,
    [ballotYearsForHome]
  );
  const timelineAwards = useMemo(() => {
    if (timelineFilter === "all") return ballotYearsForHome;
    return ballotYearsForHome.filter((award) => award.level !== "complete");
  }, [ballotYearsForHome, timelineFilter]);

  const showcaseAward = useMemo(() => awardsForHome[0] ?? null, [awardsForHome]);
  const showcaseDisplayData = useMemo(() => {
    if (!showcaseAward) return null;
    const award = awards.find((entry) => entry.year === showcaseAward.year) ?? null;
    if (!award) return null;

    const movieById = new Map<string, Movie>();
    movies.forEach((movie) => movieById.set(String(movie.id), movie));
    const nominees = award.nomineeIds
      .map((id) => movieById.get(String(id)))
      .filter((movie): movie is Movie => Boolean(movie));

    const winner =
      (award.winnerId != null ? movieById.get(String(award.winnerId)) : undefined) ??
      nominees[0] ??
      null;
    if (!winner || nominees.length === 0) return null;

    const nomineesWithWinner = nominees.some((movie) => movie.id === winner.id)
      ? nominees
      : [winner, ...nominees];
    const allMoviesForYear = movies
      .filter((movie) => movie.release_year === showcaseAward.year)
      .sort((a, b) => (b.rankings?.[0]?.ranking ?? 0) - (a.rankings?.[0]?.ranking ?? 0));

    return {
      year: showcaseAward.year,
      winner,
      nominees: nomineesWithWinner.slice(0, 10),
      allMoviesForYear,
    };
  }, [awards, movies, showcaseAward]);

  const displayName = useMemo(() => {
    if (userProfile?.preferred_name) return userProfile.preferred_name;
    if (userProfile?.first_name) return userProfile.first_name;
    if (userProfile?.username) return userProfile.username;
    if (user?.email) return user.email.split("@")[0];
    return "there";
  }, [userProfile, user?.email]);
  const greeting = useMemo(
    () => getGreeting(userProfile?.last_login, displayName),
    [displayName, userProfile?.last_login]
  );
  const subtext = useMemo(
    () => `${ballotYearsForHome.length} years in play · ${fullCount} full · ${inProgressCount} in progress`,
    [ballotYearsForHome.length, fullCount, inProgressCount]
  );

  // Taste insights — works even with 1 rated movie
  const ratedMovies = useMemo(
    () => movies.filter((m) => typeof m.rankings?.[0]?.ranking === "number" && m.rankings[0].ranking >= 1),
    [movies]
  );
  const tasteProfile = useMemo(() => buildTasteProfile(ratedMovies), [ratedMovies]);
  const yearLeaders = useMemo(() => getYearLeaders(ratedMovies), [ratedMovies]);

  // Guest -> logged-in transition can unmount pinned GSAP sections mid-cycle.
  // Kill panel ScrollTriggers first, then swap to workshop UI.
  useEffect(() => {
    if (showOnboardingPanels) {
      setRenderOnboardingPanels(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { ScrollTrigger } = await import("gsap/ScrollTrigger");
        ScrollTrigger.getAll().forEach((trigger) => {
          if ((trigger.vars as { preventOverlaps?: string }).preventOverlaps === "home-panels") {
            trigger.kill(true);
          }
        });
      } catch {
        // If GSAP isn't loaded yet, proceed with swap.
      }

      if (!cancelled) {
        setRenderOnboardingPanels(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showOnboardingPanels]);

  return (
    <div className="home-shell">
      {renderOnboardingPanels ? (
        <>
          <aside
            className={`home-progress ${showIndicator ? "home-progress--visible" : ""}`}
            aria-label="Panel progress"
          >
            {indicatorItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`home-progress__dot ${activePanelId === item.id ? "is-active" : ""}`}
                aria-label={item.label}
                title={item.label}
                onClick={() => scrollToElementById(item.id, reducedMotion)}
              />
            ))}
          </aside>

          <HomeHero
            reducedMotion={reducedMotion}
            onSelectMovie={handleSelectMovie}
            onExploreYear={scrollToPremise}
          />

          <PanelPremise reducedMotion={reducedMotion} />
          <HowItWorksSection reducedMotion={reducedMotion} />
          <PanelHook reducedMotion={reducedMotion} />
          <PanelTimeline reducedMotion={reducedMotion} />
          <PanelReassurance reducedMotion={reducedMotion} />
          <PanelFinalCTA
            reducedMotion={reducedMotion}
            onSelectMovie={handleSelectMovie}
          />
        </>
      ) : ballotYearsForHome.length === 0 && !showcaseDisplayData ? (
        /* ── First-time user welcome ── */
        <div className="px-2 pt-6 sm:px-0">
          <section className="mx-auto max-w-xl text-center">
            <Sparkles className="mx-auto mb-4 h-8 w-8 text-yellow-400" />
            <h2 className="text-3xl font-semibold text-white">
              Welcome to Reawarding{displayName !== "there" ? `, ${displayName}` : ""}!
            </h2>
            <p className="mx-auto mt-3 max-w-md text-base text-gray-400">
              You&rsquo;re in. Here&rsquo;s the idea: search for a film you love, rate it, and
              we&rsquo;ll start building your personal Best Picture ballot for that year.
            </p>

            <div className="mx-auto mt-8 max-w-md">
              <p className="mb-2 text-sm font-medium text-yellow-300/90">
                Pick your first film to get started
              </p>
              <MovieSearchPicker
                onSelect={handleSelectMovie}
                placeholder="Search for a movie you love..."
              />
            </div>

            <div className="mx-auto mt-10 grid max-w-md grid-cols-1 gap-3 text-left sm:grid-cols-3">
              <div className="rounded-xl border border-gray-700/30 bg-gray-900/40 px-4 py-3">
                <span className="text-sm font-semibold text-white">1. Rate</span>
                <p className="mt-0.5 text-xs text-gray-500">
                  Search a film and give it your score.
                </p>
              </div>
              <div className="rounded-xl border border-gray-700/30 bg-gray-900/40 px-4 py-3">
                <span className="text-sm font-semibold text-white">2. Rank</span>
                <p className="mt-0.5 text-xs text-gray-500">
                  Your top-rated films become nominees.
                </p>
              </div>
              <div className="rounded-xl border border-gray-700/30 bg-gray-900/40 px-4 py-3">
                <span className="text-sm font-semibold text-white">3. Award</span>
                <p className="mt-0.5 text-xs text-gray-500">
                  Fill 10 nominees and crown your winner.
                </p>
              </div>
            </div>

            {!userProfile?.first_name && (
              <div className="mx-auto mt-8 max-w-md">
                <Link
                  href="/profile/setup"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-700/40 bg-gray-800/50 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600/50 hover:bg-gray-700/50 hover:text-white"
                >
                  <UserCircle className="h-4 w-4" />
                  Set up your profile
                </Link>
              </div>
            )}

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/films"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-300"
              >
                <Search className="h-3.5 w-3.5" />
                Browse films
              </Link>
              <span className="text-gray-700">|</span>
              <button
                type="button"
                onClick={() => setExplorerYear(new Date().getFullYear())}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-300"
              >
                <Star className="h-3.5 w-3.5" />
                Explore {new Date().getFullYear()}
              </button>
            </div>
          </section>
        </div>
      ) : (
        /* ── Returning user dashboard — consequence-oriented ── */
        <div className="px-2 pt-6 sm:px-0">
          {/* ── 1. Canon headline: "Your Best Picture winners so far" ── */}
          {yearLeaders.length > 0 && (
            <section className="mb-10">
              <div className="text-center mb-2">
                <h2 className="text-3xl font-semibold text-white">{greeting}</h2>
                <p className="mt-1 text-sm text-gray-500">Your film canon is forming.</p>
              </div>

              <div className="mx-auto mt-6 max-w-lg">
                <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-yellow-400/70">
                  {displayName !== "there" ? `${displayName}'s` : "Your"} Best Picture winners so far
                </p>
                <div className="space-y-1">
                  {yearLeaders.map((yl) => {
                    const poster =
                      yl.leader.cached_poster_url ||
                      yl.leader.poster_url ||
                      yl.leader.cached_thumb_url ||
                      yl.leader.thumb_url ||
                      "";
                    return (
                      <button
                        key={yl.year}
                        type="button"
                        onClick={() => setExplorerYear(yl.year)}
                        className="group flex w-full items-center gap-3 rounded-lg border border-gray-700/20 bg-gray-900/30 px-3 py-2 text-left transition-all hover:border-yellow-500/30 hover:bg-gray-800/50"
                      >
                        <div className="relative h-12 w-8 flex-shrink-0 overflow-hidden rounded bg-gray-800">
                          {poster ? (
                            <Image
                              src={poster}
                              alt={yl.leader.title}
                              fill
                              className="object-cover"
                              sizes="32px"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Film className="h-3 w-3 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-unbounded text-sm font-bold text-yellow-300">{yl.year}</span>
                            <span className="truncate text-sm font-medium text-white group-hover:text-yellow-100">
                              {yl.leader.title}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-500">
                            {yl.nomineeCount >= 10
                              ? "Ballot complete"
                              : `${yl.nomineeCount}/10 nominees · ${yl.neededForBallot} more to complete`}
                          </span>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-600 transition-colors group-hover:text-yellow-400" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* ── 2. Taste mirror ── */}
          {tasteProfile.flavourTags.length > 0 && (
            <section className="mb-10">
              <div className="mx-auto max-w-lg rounded-xl border border-gray-700/25 bg-gray-900/30 px-5 py-4">
                <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Your taste so far
                </p>
                <div className="flex flex-wrap gap-2">
                  {tasteProfile.flavourTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {tasteProfile.eraLabel && (
                  <p className="mt-2.5 text-xs text-gray-500">
                    You gravitate toward{" "}
                    <span className="text-gray-400">{tasteProfile.eraLabel}</span>
                  </p>
                )}
              </div>
            </section>
          )}

          {/* ── 3. Momentum engine: what to do next ── */}
          {yearLeaders.length > 0 && (
            <section className="mb-10">
              <div className="mx-auto max-w-lg">
                {(() => {
                  const closest = yearLeaders.reduce((best, yl) =>
                    yl.neededForBallot < best.neededForBallot && yl.neededForBallot > 0 ? yl : best,
                    yearLeaders[0]
                  );
                  if (closest.neededForBallot === 0) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => setExplorerYear(closest.year)}
                      className="group flex w-full items-center gap-3 rounded-xl border border-yellow-500/15 bg-gradient-to-r from-yellow-500/5 to-transparent px-4 py-3 text-left transition-all hover:border-yellow-500/30 hover:from-yellow-500/10"
                    >
                      <Zap className="h-5 w-5 flex-shrink-0 text-yellow-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">
                          {closest.neededForBallot <= 3
                            ? `Almost there — ${closest.neededForBallot} more ${closest.neededForBallot === 1 ? "film" : "films"} to complete your ${closest.year} ballot`
                            : `Add ${closest.neededForBallot} more films to complete your ${closest.year} ballot`}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          Current leader: {closest.leader.title}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-600 transition-colors group-hover:text-yellow-400" />
                    </button>
                  );
                })()}
              </div>
            </section>
          )}

          {/* ── 4. Add more movies ── */}
          <section className="mb-10">
            <div className="mx-auto max-w-lg">
              <MovieSearchPicker
                onSelect={handleSelectMovie}
                placeholder="Add another movie..."
              />
              <p className="mt-2 text-center text-[11px] text-gray-600">
                Every film you rate reshapes your ballots.
              </p>
            </div>
          </section>

          {/* ── 5. Current season showcase (when it exists) ── */}
          {showcaseDisplayData && (
            <section className="mb-10">
              {showcaseAward?.isCurrentSeason ? (
                <div className="mb-2 flex justify-end">
                  <span className="rounded-full border border-yellow-400/40 bg-yellow-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-yellow-300">
                    Current Season
                  </span>
                </div>
              ) : null}
              <EditableYearSection
                year={String(showcaseDisplayData.year)}
                winner={showcaseDisplayData.winner}
                movies={showcaseDisplayData.nominees}
                allMoviesForYear={showcaseDisplayData.allMoviesForYear}
                category="best-picture"
                nomineeImageMode="poster"
              />
              <div className="-mt-16 mb-2 text-center">
                <button
                  type="button"
                  onClick={() => router.push("/awards")}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-yellow-300 transition-colors"
                >
                  View all awards
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </section>
          )}

          {/* ── 6. Quick nav ── */}
          <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/films"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-300"
            >
              <Search className="h-3.5 w-3.5" />
              Find Films
            </Link>
            <span className="text-gray-700">|</span>
            <Link
              href="/rankings"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-300"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Rankings
            </Link>
            <span className="text-gray-700">|</span>
            <Link
              href="/awards"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-300"
            >
              <Trophy className="h-3.5 w-3.5" />
              Awards
            </Link>
          </div>

        </div>
      )}

      {explorerYear !== null ? (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            aria-label="Close year explorer"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleCloseExplorer}
          />
          <div className="relative h-full overflow-y-auto px-3 py-4 sm:py-16 md:py-24 md:px-6">
            <div className="max-w-screen-xl mx-auto">
              <YearExplorer
                year={explorerYear}
                allMovies={movies}
                currentUserId={userId}
                existingAward={existingAward}
                onCreateAward={handleCreateAwardFromExplorer}
                onUpdateMovieRanking={updateMovieRanking}
                onClose={handleCloseExplorer}
                isGuest={isGuest}
                onEditingChange={setExplorerIsEditing}
                isOnboardingPick={onboardingPickedMovieId !== null}
                pickedMovieId={onboardingPickedMovieId}
                pickedMovie={onboardingPickedMovie}
                initialRatingTourStep={onboardingRatingTourStep}
                onRatingTourStepChange={setOnboardingRatingTourStep}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

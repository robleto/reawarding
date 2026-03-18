"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import HomeHero from "@/app/components/home/HomeHero";
import PanelPremise from "@/app/components/home/PanelPremise";
import HowItWorksSection from "@/app/components/home/HowItWorksSection";
import PanelHook from "@/app/components/home/PanelHook";
import PanelTimeline from "@/app/components/home/PanelTimeline";
import PanelReassurance from "@/app/components/home/PanelReassurance";
import PanelFinalCTA from "@/app/components/home/PanelFinalCTA";
import MovieSearchPicker from "@/components/home/MovieSearchPicker";
import { scrollToElementById, usePrefersReducedMotion } from "@/lib/motion";
import YearExplorer from "@/components/home/YearExplorer";
import { useMovieDataWithGuest } from "@/utils/sharedMovieUtils";
import { useCreateAward } from "@/hooks/useCreateAward";
import { useUserAwards } from "@/hooks/useUserAwards";
import { buildTasteProfile, getYearLeaders } from "@/utils/tasteInsights";
import { ArrowRight } from "lucide-react";
import ExpandableYearCard from "@/components/home/ExpandableYearCard";
import BallotMilestoneOverlay from "@/components/home/BallotMilestoneOverlay";
import RecognitionFeed from "@/components/home/RecognitionFeed";
import useOnboardingState from "@/hooks/useOnboardingState";
import SessionCoach from "@/components/onboarding/SessionCoach";
import { useRecognitionFeed } from "@/hooks/useRecognitionFeed";
import type { Movie } from "@/types/types";
import { useAuthState } from "@/hooks/useAuthState";

const PANEL_IDS = [
  "panel-premise",
  "panel-how-it-works",
  "panel-hook",
  "panel-timeline",
  "panel-reassurance",
  "panel-final-cta",
] as const;

type OnboardingTourStep = 0 | 1 | 2 | 3;

// Curated starting-point years — kept to 8 so the row never wraps at desktop width.
// 2022 is included because it is a commonly active ballot year.
const SUGGESTED_YEARS = [2026, 2025, 2024, 2022, 2019, 2014, 2007, 1999];

// Extended year list shown when the user asks for more choices (newest → oldest).
const ALL_OSCAR_YEARS = Array.from({ length: 2026 - 1927 + 1 }, (_, i) => 2026 - i);

const EXAMPLE_FILMS = ["The Dark Knight", "Titanic", "Get Out", "La La Land"];
const SHOW_FEATURE_DEBUG_BADGE = process.env.NODE_ENV !== "production";

export default function HomePage() {
  const reducedMotion = usePrefersReducedMotion();
  const { status: authStatus, isAuthenticated, user } = useAuthState();
  const { movies, userId, updateMovieRanking, isGuest, loading, authChecked, error: moviesError } = useMovieDataWithGuest();
  const { createAward } = useCreateAward();
  const { awards, loading: awardsLoading, error: awardsError } = useUserAwards();
  const [activePanelId, setActivePanelId] = useState<string>(PANEL_IDS[0]);
  const [showIndicator, setShowIndicator] = useState(false);
  const [explorerYear, setExplorerYear] = useState<number | null>(null);
  const [explorerIsEditing, setExplorerIsEditing] = useState(false);
  const [onboardingPickedMovieId, setOnboardingPickedMovieId] = useState<string | number | null>(null);
  const [onboardingPickedMovie, setOnboardingPickedMovie] = useState<Movie | null>(null);
  const [onboardingRatingTourStep, setOnboardingRatingTourStep] = useState<OnboardingTourStep>(0);
  const [expandedCardYear, setExpandedCardYear] = useState<number | null>(null);
  const [milestoneOverlay, setMilestoneOverlay] = useState<{
    year: number;
    milestone: 5 | 10;
    winnerTitle: string;
  } | null>(null);
  const [sessionCoachDismissed, setSessionCoachDismissed] = useState(false);
  const [showAllYears, setShowAllYears] = useState(false);
  const [suggestedQuery, setSuggestedQuery] = useState<string | undefined>(undefined);

  // Determine if we're showing guest panels (unauthenticated).
  // `showGuestPanels` tracks whether to render the GSAP scroll panels.
  // It starts `null` (unknown) until auth resolves, then mirrors `isGuest`.
  // For guest→logged-in transitions, GSAP cleanup happens before unmount.
  const [showGuestPanels, setShowGuestPanels] = useState<boolean | null>(null);
  const guestPanelsActiveRef = useRef(false);

  const onboardingSessionKey = useMemo(
    () => `reawarding-year-explorer-onboarding:${userId || "guest"}`,
    [userId]
  );

  // ── Onboarding state ──
  const onboardingStage = useOnboardingState((state) => state.stage);
  const hasDismissedOnboarding = useOnboardingState((state) => state.hasDismissedOnboarding);
  const recordOnboardingSession = useOnboardingState((state) => state.recordSession);
  const incrementStarterRatings = useOnboardingState((state) => state.incrementStarterRatings);

  // Record session visit on mount
  useEffect(() => {
    recordOnboardingSession();
  }, [recordOnboardingSession]);

  // Compute best year data for session coaching
  const bestYearData = useMemo(() => {
    const ranked = movies.filter(
      (m) => typeof m.rankings?.[0]?.ranking === "number" && m.rankings[0].ranking >= 1
    );
    const byYear = new Map<number, Movie[]>();
    for (const m of ranked) {
      if (!m.release_year) continue;
      const arr = byYear.get(m.release_year) ?? [];
      arr.push(m);
      byYear.set(m.release_year, arr);
    }
    let bestYear: number | null = null;
    let bestCount = 0;
    let leaderTitle: string | null = null;
    for (const [year, yearMovies] of byYear.entries()) {
      if (yearMovies.length > bestCount) {
        bestCount = yearMovies.length;
        bestYear = year;
        const sorted = [...yearMovies].sort(
          (a, b) => (b.rankings?.[0]?.ranking ?? 0) - (a.rankings?.[0]?.ranking ?? 0)
        );
        leaderTitle = sorted[0]?.title ?? null;
      }
    }
    return { bestYear, bestCount, leaderTitle };
  }, [movies]);

  const existingAward = useMemo(() => {
    if (explorerYear == null) return null;
    return awards.find((award) => award.year === explorerYear) ?? null;
  }, [awards, explorerYear]);

  const handleBallotMilestone = useCallback(
    (payload: { year: number; milestone: 5 | 10; winnerTitle: string }) => {
      setMilestoneOverlay(payload);
    },
    []
  );

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

  // Wrap updateMovieRanking to track onboarding starter ratings
  const handleUpdateMovieRanking = useCallback(
    (movieId: number, updates: { seen_it?: boolean; ranking?: number | null }) => {
      void updateMovieRanking(movieId, updates);
      if (
        updates.ranking &&
        updates.ranking >= 1 &&
        onboardingStage === "rating" &&
        !hasDismissedOnboarding
      ) {
        incrementStarterRatings();
      }
    },
    [updateMovieRanking, onboardingStage, hasDismissedOnboarding, incrementStarterRatings]
  );

  const handleSelectMovie = useCallback(
    (movie: Movie) => {
      if (!movie.release_year) return;
      // Clear any chip-injected query so the same chip can be re-clicked later
      setSuggestedQuery(undefined);
      if (isGuest) {
        void updateMovieRanking(movie.id as unknown as number, {
          seen_it: true,
          ranking: 10,
        });
        handleCreateAwardFromExplorer(movie);
        openYearExplorerForMovie(movie, 1);
        return;
      }
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

  // Session storage for year explorer state
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(onboardingSessionKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<{ explorerYear: number; pickedMovieId: string | number | null; ratingTourStep: OnboardingTourStep }>;
      if (typeof parsed.explorerYear === "number" && Number.isFinite(parsed.explorerYear)) {
        setExplorerYear(parsed.explorerYear);
      }
      if (typeof parsed.pickedMovieId === "string" || typeof parsed.pickedMovieId === "number" || parsed.pickedMovieId === null) {
        setOnboardingPickedMovieId(parsed.pickedMovieId);
      }
      if (parsed.ratingTourStep === 0 || parsed.ratingTourStep === 1 || parsed.ratingTourStep === 2 || parsed.ratingTourStep === 3) {
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
    window.sessionStorage.setItem(onboardingSessionKey, JSON.stringify({
      explorerYear,
      pickedMovieId: onboardingPickedMovieId,
      ratingTourStep: onboardingRatingTourStep,
    }));
  }, [explorerYear, onboardingPickedMovieId, onboardingRatingTourStep, onboardingSessionKey]);

  useEffect(() => {
    if (!explorerYear) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
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

  // GSAP panel tracking for guest onboarding
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
        entries.forEach((entry) => { ratios.set(entry.target.id, entry.intersectionRatio); });
        let candidate: (typeof PANEL_IDS)[number] = PANEL_IDS[0];
        let maxRatio = 0;
        PANEL_IDS.forEach((id) => {
          const ratio = ratios.get(id) ?? 0;
          if (ratio > maxRatio) { maxRatio = ratio; candidate = id; }
        });
        if (maxRatio > 0.24) { setActivePanelId(candidate); setShowIndicator(true); }
      },
      { threshold: [0.2, 0.35, 0.5, 0.65, 0.8] }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [reducedMotion]);

  const indicatorItems = useMemo(
    () => PANEL_IDS.map((id, index) => ({ id, label: `Panel ${index + 1}` })),
    []
  );

  // Year leaders from rated movies
  const ratedMovies = useMemo(
    () => movies.filter((m) => typeof m.rankings?.[0]?.ranking === "number" && m.rankings[0].ranking >= 1),
    [movies]
  );
  const tasteProfile = useMemo(() => buildTasteProfile(ratedMovies), [ratedMovies]);
  const yearLeaders = useMemo(() => getYearLeaders(ratedMovies), [ratedMovies]);

  // ── Recognition feed data ──
  // Only exclude movies the user has actually interacted with (has a ranking row).
  // `movies` is the full DB catalog — filtering ALL of it would hide everything.
  const userMovieIds = useMemo(
    () =>
      new Set(
        movies
          .filter((m) => m.rankings.length > 0)
          .map((m) => m.id as number)
      ),
    [movies]
  );

  const topGenreData = useMemo(() => {
    if (tasteProfile.topGenres.length === 0) return { genre: null, exemplar: null };
    const topGenre = tasteProfile.topGenres[0].genre;
    const exemplarLeader = yearLeaders.find((yl) =>
      (yl.leader.genres ?? []).includes(topGenre)
    );
    return { genre: topGenre, exemplar: exemplarLeader?.leader.title ?? null };
  }, [tasteProfile, yearLeaders]);

  const { rows: feedRows, loading: feedLoading } = useRecognitionFeed(
    userMovieIds,
    topGenreData.genre,
    topGenreData.exemplar
  );

  // ── State detection: has the user started any ballots? ──
  const hasStartedBallots = awards.length > 0 || yearLeaders.length > 0;

  // Most recent active ballot (closest to completion, but not yet complete)
  const mostRecentBallot = useMemo(() => {
    if (yearLeaders.length === 0) return null;
    // Prefer closest to completion that isn't full yet
    const incomplete = yearLeaders.filter((yl) => yl.neededForBallot > 0);
    if (incomplete.length > 0) {
      return incomplete.reduce((best, yl) =>
        yl.neededForBallot < best.neededForBallot ? yl : best,
        incomplete[0]
      );
    }
    // All complete — show most recent
    return yearLeaders[0];
  }, [yearLeaders]);

  // Sync guest panel visibility with auth state.
  // On guest→logged-in transition, kill GSAP ScrollTriggers before unmounting
  // to avoid the removeChild DOM error (GSAP pins reparent nodes).
  useEffect(() => {
    if (authStatus === "loading") return;
    if (!isAuthenticated) {
      setShowGuestPanels(true);
      guestPanelsActiveRef.current = true;
      return;
    }
    // Logged-in: tear down GSAP pins first, then unmount panels
    if (!guestPanelsActiveRef.current) {
      // GSAP was never mounted — safe to set immediately
      setShowGuestPanels(false);
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
      } catch { /* proceed */ }
      if (!cancelled) {
        setShowGuestPanels(false);
        guestPanelsActiveRef.current = false;
      }
    })();
    return () => { cancelled = true; };
  }, [authStatus, isAuthenticated]);

  // ══════════════════════════════════════════════════════════════
  // FLASH FIX: Don't render any homepage content until auth has
  // resolved AND data has loaded. Without waiting for movies &
  // awards, hasStartedBallots is false and onboarding renders
  // even for returning users.
  // ══════════════════════════════════════════════════════════════
  const dataStillLoading = authStatus === "loading" || !authChecked || (isAuthenticated && (loading || awardsLoading));
  const homepageDataError = moviesError || (isAuthenticated ? awardsError : null);
  if (dataStillLoading) {
    return (
      <div className="home-shell flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 rounded-full border-yellow-400/30 border-t-yellow-400 animate-spin" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (homepageDataError) {
    return (
      <div className="home-shell flex items-center justify-center min-h-[50vh]">
        <div className="max-w-lg px-6 py-8 text-center border rounded-2xl border-red-500/20 bg-red-500/5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-300">Fetch failure</p>
          <h2 className="mt-3 text-2xl text-white font-unbounded">We couldn&apos;t load your homepage state.</h2>
          <p className="mt-3 text-sm text-gray-300">
            Authentication resolved, but the session-backed homepage data did not load. Please refresh and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-shell">
      {SHOW_FEATURE_DEBUG_BADGE ? (
        <div className="fixed top-3 right-3 z-[120] rounded-md border border-yellow-400/40 bg-gray-950/90 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-yellow-300">
          FEATURE BUILD · recognition-feed-and-ux
        </div>
      ) : null}

      {showGuestPanels ? (
        /* ── Guest: show GSAP scroll onboarding panels ── */
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
      ) : !hasStartedBallots ? (
        /* ══════════════════════════════════════════════════════════
           FIRST-TIME USER: Onboarding
           ═══════════════════════════════════════════════════════ */
        <div className="px-2 pt-10 sm:px-0">
          {/* ─── Hero: primary entry point ─── */}
          <section className="max-w-xl mx-auto mb-10 text-center">
            <h1 className="mb-3 text-3xl font-semibold leading-tight text-white font-unbounded sm:text-4xl">
              Track films. Rate favorites. ReAward the year.
            </h1>
            <p className="max-w-md mx-auto mb-8 text-base text-gray-400">
              Start with a movie you&apos;ve seen — your rankings do the rest.
            </p>

            {/* Prominent search */}
            <div className="max-w-lg mx-auto mb-4">
              <MovieSearchPicker
                onSelect={handleSelectMovie}
                placeholder="Add a movie you've watched…"
                className="text-lg"
                suggestedQuery={suggestedQuery}
              />
            </div>

            {/* Example chips */}
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLE_FILMS.map((film) => (
                <button
                  key={film}
                  type="button"
                  onClick={() => setSuggestedQuery(film)}
                  className="rounded-full border border-gray-700/40 bg-gray-900/50 px-3 py-1.5 text-sm text-gray-400 hover:border-yellow-500/40 hover:text-yellow-300 transition-all"
                >
                  {film}
                </button>
              ))}
            </div>
          </section>

          {/* ─── Divider ─── */}
          <div className="max-w-xl mx-auto mb-8">
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-xs tracking-wider text-gray-600 uppercase">or</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>
          </div>

          {/* ─── Start a year: secondary entry point ─── */}
          <section className="max-w-xl mx-auto mb-12 text-center">
            <p className="mb-1 text-sm font-semibold text-gray-300">Start with a year (optional).</p>
            <p className="mb-5 text-sm text-gray-500">
              Jump into a year — or just start rating.
            </p>
            <div className="flex flex-nowrap justify-center gap-2 overflow-x-auto pb-1">
              {SUGGESTED_YEARS.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setExplorerYear(year)}
                  className="flex-shrink-0 rounded-lg border border-gray-700/40 bg-gray-900/50 px-4 py-2.5 font-unbounded text-sm font-bold text-white hover:border-yellow-500/40 hover:bg-gray-800/60 transition-all"
                >
                  {year}
                </button>
              ))}
            </div>
            {/* Extended year picker */}
            {showAllYears ? (
              <div className="mt-4">
                <div className="flex flex-wrap justify-center gap-1.5 max-h-48 overflow-y-auto py-2">
                  {ALL_OSCAR_YEARS.filter((y) => !SUGGESTED_YEARS.includes(y)).map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => { setExplorerYear(year); setShowAllYears(false); }}
                      className="rounded-md border border-gray-700/30 bg-gray-900/40 px-3 py-1.5 font-unbounded text-xs font-semibold text-gray-300 hover:border-yellow-500/40 hover:text-white transition-all"
                    >
                      {year}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllYears(false)}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Show less ↑
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAllYears(true)}
                className="mt-3 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Choose another year →
              </button>
            )}
          </section>

          {/* ─── Recognition feed: rating triggers ─── */}
          <div className="max-w-xl mx-auto mb-10 mt-2">
            <RecognitionFeed
              rows={feedRows}
              loading={feedLoading}
              onSelectMovie={handleSelectMovie}
            />
          </div>

          {/* ─── How it works — compact ─── */}
          <div className="grid max-w-md grid-cols-1 gap-3 mx-auto text-left sm:grid-cols-3">
            <div className="px-4 py-3 border rounded-xl border-gray-700/30 bg-gray-900/40">
              <span className="text-sm font-semibold text-white">1. Track</span>
              <p className="mt-0.5 text-xs text-gray-500">
                Mark films you&apos;ve seen.
              </p>
            </div>
            <div className="px-4 py-3 border rounded-xl border-gray-700/30 bg-gray-900/40">
              <span className="text-sm font-semibold text-white">2. Rate</span>
              <p className="mt-0.5 text-xs text-gray-500">
                Score your favorites — nominees emerge automatically.
              </p>
            </div>
            <div className="px-4 py-3 border rounded-xl border-gray-700/30 bg-gray-900/40">
              <span className="text-sm font-semibold text-white">3. ReAward</span>
              <p className="mt-0.5 text-xs text-gray-500">
                Your top-rated film becomes Best Picture.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════
           RETURNING USER: Dashboard
           ═══════════════════════════════════════════════════════ */
        <div className="px-2 pt-8 sm:px-0">

          {/* ─── 1. Hero: primary entry point ─── */}
          <section className="max-w-2xl mx-auto mb-10">
            <h1 className="mb-2 text-3xl font-semibold leading-tight text-white font-unbounded sm:text-4xl">
              Track films. Rate favorites. ReAward the year.
            </h1>
            <p className="mb-6 text-sm text-gray-400">
              Start with a movie you&apos;ve seen — your rankings do the rest.
            </p>
            <MovieSearchPicker
              onSelect={handleSelectMovie}
              placeholder="Add a movie you've watched…"
              className="text-lg"
              suggestedQuery={suggestedQuery}
            />
            {/* Example chips */}
            <div className="flex flex-wrap gap-2 mt-3">
              {EXAMPLE_FILMS.map((film) => (
                <button
                  key={film}
                  type="button"
                  onClick={() => setSuggestedQuery(film)}
                  className="rounded-full border border-gray-700/40 bg-gray-900/50 px-3 py-1.5 text-sm text-gray-400 hover:border-yellow-500/40 hover:text-yellow-300 transition-all"
                >
                  {film}
                </button>
              ))}
            </div>
          </section>

          {/* ─── 2. Start a year: secondary entry point ─── */}
          <section className="mx-auto max-w-2xl mb-10">
            <p className="mb-1 text-sm font-semibold text-gray-300">Start with a year (optional).</p>
            <p className="mb-4 text-xs text-gray-500">
              Jump into a year — or just start rating.
            </p>
            <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
              {SUGGESTED_YEARS.filter(
                (year) => !yearLeaders.some((yl) => yl.year === year)
              ).map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setExplorerYear(year)}
                  className="flex-shrink-0 rounded-lg border border-gray-700/40 bg-gray-900/50 px-3.5 py-2 font-unbounded text-sm font-bold text-white hover:border-yellow-500/40 hover:bg-gray-800/60 transition-all"
                >
                  {year}
                </button>
              ))}
            </div>
            {/* Extended year picker */}
            {showAllYears ? (
              <div className="mt-4">
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto py-1">
                  {ALL_OSCAR_YEARS.filter(
                    (y) => !SUGGESTED_YEARS.includes(y) && !yearLeaders.some((yl) => yl.year === y)
                  ).map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => { setExplorerYear(year); setShowAllYears(false); }}
                      className="rounded-md border border-gray-700/30 bg-gray-900/40 px-3 py-1.5 font-unbounded text-xs font-semibold text-gray-300 hover:border-yellow-500/40 hover:text-white transition-all"
                    >
                      {year}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllYears(false)}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Show less ↑
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAllYears(true)}
                className="mt-3 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Choose another year →
              </button>
            )}
          </section>

          {/* ─── Session coach (between start and resume, for time-sensitive nudges) ─── */}
          {!sessionCoachDismissed && (
            <div className="max-w-2xl mx-auto mb-10">
              <SessionCoach
                movies={movies}
                bestYear={bestYearData.bestYear}
                bestYearRatedCount={bestYearData.bestCount}
                leaderTitle={bestYearData.leaderTitle}
                onOpenYear={(year) => setExplorerYear(year)}
                onDismiss={() => setSessionCoachDismissed(true)}
              />
            </div>
          )}

          {/* ─── 3. Resume progress: pick up where you left off ─── */}
          {mostRecentBallot && mostRecentBallot.neededForBallot > 0 && (() => {
            const ballot = mostRecentBallot;
            const posterSrc =
              ballot.leader.cached_poster_url ||
              ballot.leader.poster_url ||
              ballot.leader.cached_thumb_url ||
              ballot.leader.thumb_url ||
              "";

            return (
              <section className="max-w-2xl mx-auto mb-10">
                <p className="mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  Keep rating
                </p>
                <button
                  type="button"
                  onClick={() => setExplorerYear(ballot.year)}
                  className="w-full p-6 text-left transition-all border group rounded-2xl border-yellow-500/25 bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent sm:p-7 hover:border-yellow-500/45 hover:from-yellow-500/15"
                >
                  <div className="flex items-start gap-5">
                    {posterSrc && (
                      <div className="relative h-[96px] w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-800 shadow-lg">
                        <Image
                          src={posterSrc}
                          alt={ballot.leader.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-yellow-400/60 mb-0.5">
                        Current Leader
                      </p>
                      <p className="text-lg font-bold text-white truncate group-hover:text-yellow-100">
                        {ballot.leader.title}
                      </p>
                      <p className="mt-1 text-sm text-yellow-300/80">
                        Your {ballot.year} list is {ballot.neededForBallot} {ballot.neededForBallot === 1 ? "film" : "films"} away from a full ballot.
                      </p>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0 gap-2">
                      <span className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs font-semibold text-yellow-300 group-hover:bg-yellow-500/20 transition-colors whitespace-nowrap">
                        Continue rating
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-600 transition-colors group-hover:text-yellow-400" />
                    </div>
                  </div>
                </button>
              </section>
            );
          })()}

          {/* ─── 5. Active workspace: shape your [YEAR] Best Picture race ─── */}
          {mostRecentBallot && (() => {
            const ballot = mostRecentBallot;
            return (
              <section className="max-w-2xl mx-auto mb-3">
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-300">
                    Your {ballot.year} awards are taking shape
                  </p>
                  {ballot.neededForBallot > 0 && (
                    <span className="text-xs text-yellow-400/70">
                      {ballot.neededForBallot} more {ballot.neededForBallot === 1 ? "rating" : "ratings"} to complete your ballot
                    </span>
                  )}
                </div>
                <p className="mb-3 text-xs text-gray-500">
                  Rate more films to refine your contenders.
                </p>
              </section>
            );
          })()}

          {/* ─── 4. Your ballots ─── */}
          {yearLeaders.length > 0 && (
            <section className="mb-10">
              <div className="max-w-2xl mx-auto">
                {/* Active ballot first, others under "Your other ballots" */}
                <div className="space-y-2.5">
                  {/* Most recent / active ballot at the top */}
                  {mostRecentBallot && (
                    <ExpandableYearCard
                      key={mostRecentBallot.year}
                      year={mostRecentBallot.year}
                      leader={mostRecentBallot.leader}
                      nomineeCount={mostRecentBallot.nomineeCount}
                      neededForBallot={mostRecentBallot.neededForBallot}
                      allMovies={movies}
                      awards={awards}
                      currentUserId={userId}
                      isExpanded={expandedCardYear === mostRecentBallot.year}
                      onToggle={() =>
                        setExpandedCardYear((prev) =>
                          prev === mostRecentBallot.year ? null : mostRecentBallot.year
                        )
                      }
                      onUpdateMovieRanking={handleUpdateMovieRanking}
                      onCreateAward={handleCreateAwardFromExplorer}
                      onOpenFullExplorer={(year) => setExplorerYear(year)}
                      onMilestoneReached={handleBallotMilestone}
                    />
                  )}
                </div>

                {/* Remaining ballots */}
                {yearLeaders.filter((yl) => yl.year !== mostRecentBallot?.year).length > 0 && (
                  <>
                    <p className="mt-6 mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                      Your other ballots
                    </p>
                    <div className="space-y-2.5">
                      {yearLeaders
                        .filter((yl) => yl.year !== mostRecentBallot?.year)
                        .map((yl) => (
                          <ExpandableYearCard
                            key={yl.year}
                            year={yl.year}
                            leader={yl.leader}
                            nomineeCount={yl.nomineeCount}
                            neededForBallot={yl.neededForBallot}
                            allMovies={movies}
                            awards={awards}
                            currentUserId={userId}
                            isExpanded={expandedCardYear === yl.year}
                            onToggle={() =>
                              setExpandedCardYear((prev) =>
                                prev === yl.year ? null : yl.year
                              )
                            }
                            onUpdateMovieRanking={handleUpdateMovieRanking}
                            onCreateAward={handleCreateAwardFromExplorer}
                            onOpenFullExplorer={(year) => setExplorerYear(year)}
                            onMilestoneReached={handleBallotMilestone}
                          />
                        ))}
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {/* ─── 5b. Recognition feed: rate more films ─── */}
          {(feedLoading || feedRows.length > 0) && (
            <section className="mb-10">
              <div className="max-w-2xl mx-auto">
                {/* Divider */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex-1 h-px bg-gray-800" />
                  <span className="text-[10px] tracking-wider text-gray-600 uppercase">
                    More to rate
                  </span>
                  <div className="flex-1 h-px bg-gray-800" />
                </div>
                <RecognitionFeed
                  rows={feedRows}
                  loading={feedLoading}
                  onSelectMovie={handleSelectMovie}
                />
              </div>
            </section>
          )}

          {/* ─── 6. Taste / canon: your taste is taking shape ─── */}
          {(tasteProfile.flavourTags.length > 0 || yearLeaders.length > 0) && (
            <section className="mb-10">
              <div className="max-w-2xl px-5 py-5 mx-auto border rounded-xl border-gray-700/25 bg-gray-900/30">
                <div className="mb-4">
                  <p className="mb-1 text-sm font-semibold text-white">
                    Your taste is taking shape.
                  </p>
                  {tasteProfile.eraLabel ? (
                    <p className="text-sm text-gray-400">
                      You tend toward{" "}
                      <span className="text-gray-300">{tasteProfile.eraLabel}</span> films.
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">
                      The more you rate, the clearer your canon becomes.
                    </p>
                  )}
                </div>

                {tasteProfile.topGenres.length > 0 && (() => {
                  const seenMovies = new Set<string>();
                  const uniqueGenreEntries: { label: string; genre: string; movieTitle: string | null }[] = [];
                  const flavourLabel: Record<string, string> = {
                    Action: "High-energy action",
                    Adventure: "Epic adventure",
                    Animation: "Animation & imagination",
                    Comedy: "Sharp comedy",
                    Crime: "Crime & noir",
                    Documentary: "Documentary storytelling",
                    Drama: "Character-driven drama",
                    Family: "Family cinema",
                    Fantasy: "Fantasy & world-building",
                    History: "Historical epic",
                    Horror: "Horror & suspense",
                    Music: "Musical storytelling",
                    Mystery: "Mystery & intrigue",
                    Romance: "Romance",
                    "Science Fiction": "Sci-fi & speculation",
                    Thriller: "Tension & thriller",
                    War: "War & conflict",
                    Western: "The Western",
                  };
                  for (const g of tasteProfile.topGenres.slice(0, 4)) {
                    const label = flavourLabel[g.genre] ?? g.genre;
                    const rep = yearLeaders.find((yl) =>
                      (yl.leader.genres ?? []).includes(g.genre) && !seenMovies.has(yl.leader.title)
                    );
                    if (rep) seenMovies.add(rep.leader.title);
                    if (uniqueGenreEntries.length < 3) {
                      uniqueGenreEntries.push({ label, genre: g.genre, movieTitle: rep?.leader.title ?? null });
                    }
                  }
                  if (uniqueGenreEntries.length === 0) return null;
                  return (
                    <div className="space-y-1.5 mb-4">
                      {uniqueGenreEntries.map((entry) => (
                        <Link
                          key={entry.label}
                          href={`/films?genre=${encodeURIComponent(entry.genre)}`}
                          className="flex items-center gap-3 px-3 py-2 transition-colors rounded-lg bg-gray-800/30 hover:bg-gray-800/50"
                        >
                          <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-300">
                            {entry.label}
                          </span>
                          {entry.movieTitle && (
                            <span className="text-xs text-gray-500 truncate">{entry.movieTitle}</span>
                          )}
                          <ArrowRight className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-gray-600" />
                        </Link>
                      ))}
                    </div>
                  );
                })()}

                <div className="flex gap-5 pt-3 text-center border-t border-gray-800/60">
                  <div>
                    <p className="text-sm font-bold text-white">{yearLeaders.length}</p>
                    <p className="text-[10px] text-gray-500">
                      {yearLeaders.length === 1 ? "Year started" : "Years started"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{tasteProfile.ratedCount}</p>
                    <p className="text-[10px] text-gray-500">Films rated</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      {yearLeaders.filter((yl) => yl.nomineeCount >= 10).length}
                    </p>
                    <p className="text-[10px] text-gray-500">Ballots complete</p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── Year Explorer overlay ── */}
      {explorerYear !== null ? (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            aria-label="Close year explorer"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleCloseExplorer}
          />
          <div className="relative h-full px-3 py-4 overflow-y-auto sm:py-16 md:py-24 md:px-6">
            <div className="max-w-screen-xl mx-auto">
              <YearExplorer
                year={explorerYear}
                allMovies={movies}
                currentUserId={userId}
                existingAward={existingAward}
                onCreateAward={handleCreateAwardFromExplorer}
                onUpdateMovieRanking={handleUpdateMovieRanking}
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

      {milestoneOverlay && (
        <BallotMilestoneOverlay
          year={milestoneOverlay.year}
          milestone={milestoneOverlay.milestone}
          winnerTitle={milestoneOverlay.winnerTitle}
          onClose={() => setMilestoneOverlay(null)}
        />
      )}
    </div>
  );
}

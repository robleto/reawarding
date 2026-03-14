"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { scrollToElementById, usePrefersReducedMotion } from "@/lib/motion";
import YearExplorer from "@/components/home/YearExplorer";
import { useMovieDataWithGuest } from "@/utils/sharedMovieUtils";
import { useCreateAward } from "@/hooks/useCreateAward";
import { useUserAwards } from "@/hooks/useUserAwards";
import { buildTasteProfile, getYearLeaders } from "@/utils/tasteInsights";
import { getActualWinner } from "@/data/bestPictureWinners";
import { ArrowRight, Film, Calendar } from "lucide-react";
import ExpandableYearCard from "@/components/home/ExpandableYearCard";
import BallotMilestoneOverlay from "@/components/home/BallotMilestoneOverlay";
import useOnboardingState from "@/hooks/useOnboardingState";
import SessionCoach from "@/components/onboarding/SessionCoach";
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

const SUGGESTED_YEARS = (() => {
  const current = new Date().getFullYear();
  return [current, current - 1, current - 2, 2019, 2014, 2010, 2007, 1999, 1994];
})();

export default function HomePage() {
  const supabase = useSupabaseClient<Database>();
  const reducedMotion = usePrefersReducedMotion();
  const { movies, user, userId, updateMovieRanking, isGuest, loading, authChecked } = useMovieDataWithGuest();
  const { createAward } = useCreateAward();
  const { awards, loading: awardsLoading } = useUserAwards();
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
  const [userProfile, setUserProfile] = useState<{
    first_name?: string;
    last_name?: string;
    username?: string;
    preferred_name?: string | null;
    last_login?: string;
  } | null>(null);
  const [sessionCoachDismissed, setSessionCoachDismissed] = useState(false);

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
  const onboarding = useOnboardingState();

  // Record session visit on mount
  useEffect(() => {
    onboarding.recordSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("first_name, last_name, username, preferred_name, last_login")
          .eq("id", user.id)
          .single();
        if (data) setUserProfile(data);
      } catch (err) {
        console.warn("Profile fetch failed:", err);
      }
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

  // Wrap updateMovieRanking to track onboarding starter ratings
  const handleUpdateMovieRanking = useCallback(
    (movieId: number, updates: { seen_it?: boolean; ranking?: number | null }) => {
      void updateMovieRanking(movieId, updates);
      if (
        updates.ranking &&
        updates.ranking >= 1 &&
        onboarding.stage === "rating" &&
        !onboarding.hasDismissedOnboarding
      ) {
        onboarding.incrementStarterRatings();
      }
    },
    [updateMovieRanking, onboarding]
  );

  const handleSelectMovie = useCallback(
    (movie: Movie) => {
      if (!movie.release_year) return;
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

  const displayName = useMemo(() => {
    if (userProfile?.preferred_name) return userProfile.preferred_name;
    if (userProfile?.first_name) return userProfile.first_name;
    if (userProfile?.username) return userProfile.username;
    if (user?.email) return user.email.split("@")[0];
    return "there";
  }, [userProfile, user?.email]);

  // Sync guest panel visibility with auth state.
  // On guest→logged-in transition, kill GSAP ScrollTriggers before unmounting
  // to avoid the removeChild DOM error (GSAP pins reparent nodes).
  useEffect(() => {
    if (!authChecked) return; // wait for auth
    if (isGuest) {
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
  }, [authChecked, isGuest]);

  // ══════════════════════════════════════════════════════════════
  // FLASH FIX: Don't render any homepage content until auth has
  // resolved AND data has loaded. Without waiting for movies &
  // awards, hasStartedBallots is false and onboarding renders
  // even for returning users.
  // ══════════════════════════════════════════════════════════════
  const dataStillLoading = !authChecked || (!isGuest && (loading || awardsLoading));
  if (dataStillLoading) {
    return (
      <div className="home-shell flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-yellow-400/30 border-t-yellow-400 animate-spin" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-shell">
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
        <div className="px-2 pt-8 sm:px-0">
          <section className="mx-auto max-w-xl text-center">
            {/* Step badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 mb-5">
              <Calendar className="h-3.5 w-3.5 text-yellow-400" />
              <span className="text-xs font-medium text-yellow-300 uppercase tracking-wider">
                Step 1 of 3
              </span>
            </div>

            <h2 className="font-unbounded text-2xl sm:text-3xl font-bold text-white mb-3">
              Pick a year you know well enough to have opinions
            </h2>
            <p className="text-base text-gray-400 max-w-md mx-auto mb-8">
              A favorite year, a recent year, or a year with films you remember clearly all work.
            </p>

            {/* Year chips */}
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              {SUGGESTED_YEARS.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setExplorerYear(year)}
                  className="rounded-lg border border-gray-700/40 bg-gray-900/50 px-4 py-2.5 font-unbounded text-sm font-bold text-white hover:border-yellow-500/40 hover:bg-gray-800/60 transition-all"
                >
                  {year}
                </button>
              ))}
            </div>

            {/* Prominent search */}
            <div className="mx-auto max-w-lg">
              <p className="mb-3 text-sm font-medium text-yellow-300/90">
                Or search for a movie you love
              </p>
              <MovieSearchPicker
                onSelect={handleSelectMovie}
                placeholder="Search for a movie you love..."
                className="text-lg"
              />
            </div>

            {/* How it works — compact */}
            <div className="mx-auto mt-12 grid max-w-md grid-cols-1 gap-3 text-left sm:grid-cols-3">
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
          </section>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════
           RETURNING USER: Dashboard
           ═══════════════════════════════════════════════════════ */
        <div className="px-2 pt-6 sm:px-0">
          {/* Session coach (return-visit nudges) */}
          {!sessionCoachDismissed && (
            <SessionCoach
              movies={movies}
              bestYear={bestYearData.bestYear}
              bestYearRatedCount={bestYearData.bestCount}
              leaderTitle={bestYearData.leaderTitle}
              onOpenYear={(year) => setExplorerYear(year)}
              onDismiss={() => setSessionCoachDismissed(true)}
            />
          )}

          {/* ─── Welcome back headline ─── */}
          <section className="mb-8 text-center">
            <h2 className="font-unbounded text-2xl sm:text-3xl font-bold text-white">
              Welcome back{displayName !== "there" ? `, ${displayName}` : ""}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {yearLeaders.length} {yearLeaders.length === 1 ? "year" : "years"} in play
              {" · "}
              {yearLeaders.filter((yl) => yl.nomineeCount >= 10).length} complete
            </p>
          </section>

          {/* ─── Primary card: Continue most recent ballot ─── */}
          {mostRecentBallot && (() => {
            const ballot = mostRecentBallot;
            const posterSrc =
              ballot.leader.cached_poster_url ||
              ballot.leader.poster_url ||
              ballot.leader.cached_thumb_url ||
              ballot.leader.thumb_url ||
              "";
            const academy = getActualWinner(ballot.year);

            return (
              <section className="mb-8">
                <div className="mx-auto max-w-2xl">
                  <button
                    type="button"
                    onClick={() => setExplorerYear(ballot.year)}
                    className="group w-full rounded-2xl border border-yellow-500/25 bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent p-6 sm:p-7 text-left transition-all hover:border-yellow-500/45 hover:from-yellow-500/15"
                  >
                    <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-yellow-400/70">
                      Continue Your {ballot.year} Ballot
                    </p>
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
                          {ballot.neededForBallot <= 0 ? "Your Best Picture" : "Current Leader"}
                        </p>
                        <p className="text-lg font-bold text-white truncate group-hover:text-yellow-100">
                          {ballot.leader.title}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {ballot.nomineeCount} of 10 nominees
                        </p>
                        {ballot.neededForBallot > 0 ? (
                          <p className="text-sm text-yellow-300/80 mt-1">
                            Add {ballot.neededForBallot} more {ballot.neededForBallot === 1 ? "film" : "films"} to complete your ballot.
                          </p>
                        ) : (
                          <p className="text-sm text-emerald-400/80 mt-1">
                            Full ballot. Your Best Picture is decided.
                          </p>
                        )}
                      </div>
                      <ArrowRight className="h-5 w-5 flex-shrink-0 text-gray-600 transition-colors group-hover:text-yellow-400 mt-1" />
                    </div>
                  </button>
                </div>
              </section>
            );
          })()}

          {/* ─── Search (prominent) ─── */}
          <section className="mb-8">
            <div className="mx-auto max-w-2xl">
              <p className="mb-2 text-sm font-medium text-gray-400">
                Search for a movie you love
              </p>
              <MovieSearchPicker
                onSelect={handleSelectMovie}
                placeholder="Search for a movie you love..."
                className="text-lg"
              />
            </div>
          </section>

          {/* ─── Start another year ─── */}
          <section className="mb-8">
            <div className="mx-auto max-w-2xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Start another year
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_YEARS.filter(
                  (year) => !yearLeaders.some((yl) => yl.year === year)
                ).map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setExplorerYear(year)}
                    className="rounded-lg border border-gray-700/40 bg-gray-900/50 px-3.5 py-2 font-unbounded text-sm font-bold text-white hover:border-yellow-500/40 hover:bg-gray-800/60 transition-all"
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ─── Expandable year cards for in-progress ballots ─── */}
          {yearLeaders.length > 0 && (
            <section className="mb-10">
              <div className="mx-auto max-w-2xl">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Your ballots
                </p>
                <div className="space-y-2.5">
                  {yearLeaders.map((yl) => (
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
              </div>
            </section>
          )}

          {/* ─── Compact taste stats ─── */}
          {(tasteProfile.flavourTags.length > 0 || yearLeaders.length > 0) && (
            <section className="mb-10">
              <div className="mx-auto max-w-2xl rounded-xl border border-gray-700/25 bg-gray-900/30 px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Your Canon So Far
                  </p>
                  <div className="flex gap-5 text-center">
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

                {tasteProfile.topGenres.length > 0 && (() => {
                  const seenMovies = new Set<string>();
                  const uniqueGenreEntries: { label: string; movieTitle: string | null }[] = [];
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
                      uniqueGenreEntries.push({ label, movieTitle: rep?.leader.title ?? null });
                    }
                  }
                  if (uniqueGenreEntries.length === 0) return null;
                  return (
                    <div className="space-y-1.5">
                      {uniqueGenreEntries.map((entry) => (
                        <div key={entry.label} className="flex items-center gap-3 rounded-lg bg-gray-800/30 px-3 py-2">
                          <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-300">
                            {entry.label}
                          </span>
                          {entry.movieTitle && (
                            <span className="truncate text-xs text-gray-500">{entry.movieTitle}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {tasteProfile.eraLabel && (
                  <p className="mt-2.5 text-xs text-gray-500">
                    You gravitate toward{" "}
                    <span className="text-gray-400">{tasteProfile.eraLabel}</span>
                  </p>
                )}
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
          <div className="relative h-full overflow-y-auto px-3 py-4 sm:py-16 md:py-24 md:px-6">
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

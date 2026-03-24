"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import RecognitionFeed from "@/components/home/RecognitionFeed";
import useOnboardingState from "@/hooks/useOnboardingState";
import SessionCoach from "@/components/onboarding/SessionCoach";
import LoggedInOnboardingExperience from "@/components/onboarding/LoggedInOnboardingExperience";
import { useRecognitionFeed } from "@/hooks/useRecognitionFeed";
import { useSmartListAlerts, type SmartListAlert } from "@/hooks/useSmartListAlerts";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useUserLists } from "@/hooks/useUserLists";
import { useLoggedInOnboarding } from "@/hooks/useLoggedInOnboarding";
import Banner from "@/components/ui/Banner";
import HorizontalListRow from "@/components/list/HorizontalListRow";
import ReadyMadeCard from "@/components/lists/ReadyMadeCard";
import WatchlistMovieRow from "@/components/home/WatchlistMovieRow";
import AwardCard from "@/components/home/AwardCard";
import { slugifyTitle } from "@/utils/slug";
import { List } from "lucide-react";
import type { Movie } from "@/types/types";
import { useAuthState } from "@/hooks/useAuthState";

gsap.registerPlugin(ScrollTrigger);

const PANEL_IDS = [
  "panel-premise",
  "panel-how-it-works",
  "panel-hook",
  "panel-timeline",
  "panel-reassurance",
  "panel-final-cta",
] as const;

type OnboardingTourStep = 0 | 1 | 2 | 3;

/**
 * Returns the "active" Oscar year.
 * Oscars air in late Feb / early March (roughly week 8–9).
 * In the first 6 weeks of the year (≤ day 42) the ceremony hasn't happened yet,
 * so last year's films are still the current award cycle.
 */
function getActiveOscarYear(): number {
  const now = new Date();
  const year = now.getFullYear();
  const dayOfYear =
    Math.floor((now.getTime() - new Date(year, 0, 1).getTime()) / 86_400_000) + 1;
  return dayOfYear <= 42 ? year - 1 : year;
}

const ACTIVE_OSCAR_YEAR = getActiveOscarYear();

// Curated starting-point years — kept to 8 so the row never wraps at desktop width.
// Anchored to ACTIVE_OSCAR_YEAR so the list stays current without manual updates.
const SUGGESTED_YEARS = [0, -1, -2, -4, -7, -12, -19, -27].map(
  (offset) => ACTIVE_OSCAR_YEAR + offset,
);

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
  const [selectedSearchMovie, setSelectedSearchMovie] = useState<Movie | null>(null);
  const [recentlyRatedMovie, setRecentlyRatedMovie] = useState<{
    title: string;
    year: number | null;
    rating: number | null;
  } | null>(null);
  const [milestoneOverlay, setMilestoneOverlay] = useState<{
    year: number;
    milestone: 5 | 10;
    winnerTitle: string;
  } | null>(null);
  const [sessionCoachDismissed, setSessionCoachDismissed] = useState(false);
  const [suggestedQuery, setSuggestedQuery] = useState<string | undefined>(undefined);
  const [dismissedAlertKeys, setDismissedAlertKeys] = useState<string[]>([]);
  const [savingAlertKey, setSavingAlertKey] = useState<string | null>(null);
  const [savedAlertKeys, setSavedAlertKeys] = useState<string[]>([]);
  const activeChipRef = useRef<HTMLButtonElement>(null);
  const supabase = useSupabaseClient();

  useEffect(() => {
    if (!recentlyRatedMovie) return;
    const timer = window.setTimeout(() => setRecentlyRatedMovie(null), 9000);
    return () => window.clearTimeout(timer);
  }, [recentlyRatedMovie]);

  // ── Smart list save handler ──────────────────────────────────────────────
  const handleSaveSmartList = async (alert: SmartListAlert) => {
    if (!userId) return;
    const key = `${alert.type}:${alert.label}`;
    setSavingAlertKey(key);
    try {
      const { data: list, error } = await supabase
        .from("movie_lists")
        .insert({
          user_id: userId,
          name: alert.label,
          description: `Auto-generated from your seen films • ${alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}`,
          is_public: false,
        })
        .select("id")
        .single();
      if (error || !list) throw error ?? new Error("No list returned");
      const items = alert.movieIds.map((id, idx) => ({ list_id: list.id, movie_id: id, ranking: idx + 1 }));
      await supabase.from("movie_list_items").insert(items);
      setSavedAlertKeys((prev) => [...prev, key]);
    } catch (e) {
      console.error("Failed to save smart list:", e);
    } finally {
      setSavingAlertKey(null);
    }
  };

  // Ballot timeline — how many years to show. Persists for the browser session.
  const [shownBallotCount, setShownBallotCount] = useState<number>(() => {
    if (typeof window === "undefined") return 10;
    const stored = sessionStorage.getItem("reawarding-ballot-count");
    return stored ? parseInt(stored, 10) : 10;
  });

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
  const hasDismissedOnboarding = useOnboardingState((state) => state.hasDismissedOnboarding);
  const dismissOnboarding = useOnboardingState((state) => state.dismissOnboarding);
  const recordOnboardingSession = useOnboardingState((state) => state.recordSession);
  const onboardingFlow = useLoggedInOnboarding(movies, awards, hasDismissedOnboarding);

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

  // Gallery years — the 8 most recent years the user has a winner for (newest first)
  const galleryYears = useMemo(() => {
    const withRankings = movies.filter(
      (m) => m.rankings?.length > 0 && m.rankings[0].ranking !== null
    );
    const grouped: Record<number, Movie[]> = {};
    for (const m of withRankings) {
      const y = m.release_year;
      if (!y) continue;
      if (!grouped[y]) grouped[y] = [];
      grouped[y].push(m);
    }
    return Object.entries(grouped)
      .map(([yearStr, yearMovies]) => {
        const sorted = [...yearMovies].sort(
          (a, b) => (b.rankings![0]?.ranking ?? 0) - (a.rankings![0]?.ranking ?? 0)
        );
        const nominees = sorted.filter((m) => (m.rankings![0]?.ranking ?? 0) >= 7).slice(0, 10);
        const savedAward = awards.find((a) => a.year === Number(yearStr));
        const savedWinner = savedAward?.winnerId
          ? sorted.find((m) => m.id === Number(savedAward.winnerId))
          : null;
        const winner = savedWinner ?? (nominees.length > 0 ? nominees[0] : sorted[0]);
        if (!winner) return null;
        return { year: Number(yearStr), winner, nomineeCount: nominees.length };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .sort((a, b) => b.year - a.year)
      .slice(0, 8);
  }, [movies, awards]);

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

  const handleUpdateMovieRanking = useCallback(
    (movieId: number, updates: { seen_it?: boolean; ranking?: number | null }) => {
      void updateMovieRanking(movieId, updates);
      if (updates.ranking && updates.ranking >= 1) {
        const movie = movies.find((entry) => entry.id === movieId);
        if (movie) {
          setRecentlyRatedMovie({
            title: movie.title,
            year: movie.release_year ?? null,
            rating: updates.ranking,
          });
        }
      }
    },
    [movies, updateMovieRanking]
  );

  // For returning users: search picks open movie detail modal, not the YearExplorer
  const handleOpenMovieDetail = useCallback((movie: Movie) => {
    setSuggestedQuery(undefined);
    setSelectedSearchMovie(movie);
  }, []);

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
      handleOpenMovieDetail(movie);
    },
    [isGuest, updateMovieRanking, handleCreateAwardFromExplorer, openYearExplorerForMovie, handleOpenMovieDetail]
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

  // ── Smart list alerts (P2-d) ──
  const smartAlerts = useSmartListAlerts(movies);
  const visibleAlerts = smartAlerts.filter(
    (a) => !dismissedAlertKeys.includes(`${a.type}:${a.label}`)
  );

  // Poster URLs for smart list cards — resolved from the already-loaded movies array.
  const getSmartListPosterUrls = useMemo(() => (movieIds: number[]) =>
    movieIds
      .slice(0, 5)
      .map((id) => movies.find((m) => m.id === id))
      .filter((m): m is Movie => Boolean(m))
      .map((m) => m.cached_poster_url || m.poster_url || "")
      .filter(Boolean) as string[],
  [movies]);

  // ── User state detection (P4: adaptive homepage) ──
  const hasStartedBallots = awards.length > 0 || yearLeaders.length > 0;
  const completedBallotCount = yearLeaders.filter((yl) => yl.nomineeCount >= 10).length;
  const isEstablished =
    completedBallotCount >= 1 || yearLeaders.length >= 2 || ratedMovies.length >= 20;

  // Three states govern homepage layout:
  //   new        → 0 active years AND < 5 rated films
  //   building   → 1+ active year, 0 completed ballots
  //   established → 1+ completed ballot OR 2+ years OR 20+ rated
  const userState: "new" | "building" | "established" = !hasStartedBallots
    ? "new"
    : isEstablished
    ? "established"
    : "building";

  // ── User lists for established homepage (P2-e) ──
  const { lists: userLists, loading: listsLoading } = useUserLists(
    isEstablished ? (userId ?? null) : null
  );

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

  // Default-expand the most recent ballot so it acts as the primary continue-rating CTA.
  // Only sets once — if the user collapses it, their choice is preserved.
  useEffect(() => {
    if (mostRecentBallot && expandedCardYear === null) {
      setExpandedCardYear(mostRecentBallot.year);
    }
  }, [mostRecentBallot]);

  // When the active chip changes, scroll it into view in the horizontal chip rail.
  useEffect(() => {
    if (activeChipRef.current) {
      activeChipRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [expandedCardYear]);

  // Sync guest panel visibility with auth state.
  // On guest→logged-in transition, kill GSAP ScrollTriggers before unmounting
  // to avoid the removeChild DOM error (GSAP pins reparent nodes).
  useLayoutEffect(() => {
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
    ScrollTrigger.getAll().forEach((trigger) => {
      const triggerVars = trigger.vars as { preventOverlaps?: string; trigger?: Element | string };
      const triggerElement =
        triggerVars.trigger instanceof Element
          ? triggerVars.trigger
          : null;

      const belongsToGuestPanels =
        triggerVars.preventOverlaps === "home-panels" ||
        Boolean(triggerElement?.closest("[data-panel-id]"));

      if (belongsToGuestPanels) {
        trigger.kill(true);
      }
    });

    setShowGuestPanels(false);
    guestPanelsActiveRef.current = false;
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
      ) : (
        /* ══════════════════════════════════════════════════════════
           LOGGED-IN USER: New, Building, or Established dashboard
           ═══════════════════════════════════════════════════════ */
        <div className="pt-8 pb-16">

    {/* ═══════════════════════════════════════════════════════
        NEW STATE — onboarding prepends the logged-in homepage
        Show: onboarding/search → shared rows below
        ═══════════════════════════════════════════════════ */}
    {userState === "new" && (
      <div className="pb-10">
        {onboardingFlow.shouldShow ? (
          <LoggedInOnboardingExperience
            movies={movies}
            awards={awards}
            suggestedQuery={suggestedQuery}
            onSelectMovie={handleOpenMovieDetail}
            onSuggestedQuery={setSuggestedQuery}
            onOpenYear={(year) => setExplorerYear(year)}
            onShowHowItWorks={() => scrollToElementById("logged-in-onboarding-steps", reducedMotion)}
            onDismiss={dismissOnboarding}
            recentlyRated={recentlyRatedMovie}
          />
        ) : (
          <section className="mx-auto max-w-3xl">
            <MovieSearchPicker
              onSelect={handleOpenMovieDetail}
              placeholder="Search for a movie to rate…"
              variant="hero"
              suggestedQuery={suggestedQuery}
            />
          </section>
        )}
      </div>
    )}

    {/* ═══════════════════════════════════════════════════════
        BUILDING STATE — ballot card is the hero
        Show: active ballot → search → alerts → coach
        ═══════════════════════════════════════════════════ */}
    {userState === "building" && (
      <>
        {onboardingFlow.shouldShow ? (
          <LoggedInOnboardingExperience
            movies={movies}
            awards={awards}
            suggestedQuery={suggestedQuery}
            onSelectMovie={handleOpenMovieDetail}
            onSuggestedQuery={setSuggestedQuery}
            onOpenYear={(year) => setExplorerYear(year)}
            onShowHowItWorks={() => scrollToElementById("logged-in-onboarding-steps", reducedMotion)}
            onDismiss={dismissOnboarding}
            recentlyRated={recentlyRatedMovie}
          />
        ) : null}

        {/* ─── Hero: active ballot ─── */}
        {mostRecentBallot && (
          <section className="mb-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Keep going on {mostRecentBallot.year}
            </p>
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
          </section>
        )}

        {!onboardingFlow.shouldShow && (
          <WatchlistMovieRow userId={userId} username={user?.user_metadata?.username ?? null} />
        )}

        {/* ─── Search: add another film ─── */}
        {!onboardingFlow.shouldShow && (
          <section className="mb-8">
            <div className="mx-auto max-w-3xl">
              <MovieSearchPicker
                onSelect={handleOpenMovieDetail}
                placeholder="Search for a movie to rate…"
                variant="hero"
                suggestedQuery={suggestedQuery}
              />
            </div>
            {/* Start a different year */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="text-xs text-gray-600 self-center mr-1">Or start a new year:</span>
              {SUGGESTED_YEARS.filter(
                (year) => !yearLeaders.some((yl) => yl.year === year)
              ).slice(0, 6).map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setExplorerYear(year)}
                  className="flex-shrink-0 rounded-md border border-gray-700/30 bg-gray-900/40 px-3 py-1.5 font-unbounded text-xs font-semibold text-gray-400 hover:border-yellow-500/30 hover:text-white transition-all"
                >
                  {year}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ─── Smart list alerts ─── */}
        {!onboardingFlow.shouldShow && visibleAlerts.length > 0 && (
          <div className="mb-8 space-y-2">
            {visibleAlerts.map((alert) => {
              const alertKey = `${alert.type}:${alert.label}`;
              const remaining = alert.threshold - alert.count;
              const message = alert.nearMiss
                ? `${remaining} more ${alert.label} films and you have a list`
                : `You've seen ${alert.count} ${alert.label} films — enough for a list`;
              return (
                <Banner
                  key={alertKey}
                  variant="gold"
                  icon={List}
                  message={message}
                  action={{ label: alert.nearMiss ? "See films" : "Create list", onClick: () => { window.location.href = "/lists/ready-made"; } }}
                  onDismiss={() => setDismissedAlertKeys((prev) => [...prev, alertKey])}
                />
              );
            })}
          </div>
        )}

        {/* ─── Session coach ─── */}
        {!onboardingFlow.shouldShow && !sessionCoachDismissed && (
          <div className="mb-8">
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
      </>
    )}

    {/* ═══════════════════════════════════════════════════════
        ESTABLISHED STATE — search leads, full ballot grid
        Show: search → alerts → coach → ballots → lists
        ═══════════════════════════════════════════════════ */}
    {userState === "established" && (
      <>
        {/* ═══════════════════════════════════════════════════════
            TIER 1 — Search hero
            Motivational framing; search is the primary action
            ═══════════════════════════════════════════════════ */}
        <section className="mb-10">
          {/* Lightweight greeting — low visual weight, does not compete with search */}
          <p className="mb-5 text-center text-2xl font-bold text-white font-unbounded tracking-tight">Welcome back.</p>
          <div className="max-w-3xl mx-auto">
            <MovieSearchPicker
              onSelect={handleOpenMovieDetail}
              placeholder="Search for a movie to rate…"
              variant="hero"
              suggestedQuery={suggestedQuery}
            />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            TIER 1 — Active ballot
            Year selector chips → single focused year card
            ═══════════════════════════════════════════════════ */}
        {yearLeaders.length > 0 && (() => {
          const activeYl =
            yearLeaders.find((yl) => yl.year === expandedCardYear) ?? yearLeaders[0];

          // Newest → oldest: 2026 … 1927
          const sortedLeaders = [...yearLeaders].sort((a, b) => b.year - a.year);

          return (
            <section className="mb-10">
              {/* ── Year timeline rail ─────────────────────────────────────
                  Dot-and-line design. Each year is a circular node with the
                  year label + progress count below. Consecutive years share
                  a solid connector; a gap-break visual marks skipped years.
                  Sorted newest → oldest; active dot auto-scrolls into view.
                  ─────────────────────────────────────────────────────── */}
              <div className="relative mb-6">
                <div
                  className="flex items-start overflow-x-auto pb-3"
                  style={{ scrollbarWidth: "none" }}
                >
                  {sortedLeaders.map((yl, idx) => {
                    const isActive    = yl.year === activeYl.year;
                    const isComplete  = yl.nomineeCount >= 10;
                    const nextYl      = sortedLeaders[idx + 1];
                    const gapSize     = nextYl ? yl.year - nextYl.year : 0;

                    return (
                      <div key={yl.year} className="flex-shrink-0 flex items-start">

                        {/* ── Year node (dot + label + count) ── */}
                        <button
                          ref={isActive ? activeChipRef : undefined}
                          type="button"
                          onClick={() => setExpandedCardYear(yl.year)}
                          className="flex flex-col items-center gap-1 min-w-[52px] px-1 group"
                        >
                          {/* Dot — plain filled circle, no ring */}
                          <div className="w-8 h-8 flex items-center justify-center">
                            <div className={`rounded-full transition-all ${
                              isActive
                                ? "w-3 h-3 bg-yellow-400"
                                : "w-2 h-2 bg-gray-600 group-hover:bg-gray-400"
                            }`} />
                          </div>

                          {/* Year label */}
                          <span className={`text-[10px] font-bold font-unbounded leading-tight mt-0.5 transition-colors ${
                            isActive
                              ? "text-yellow-300"
                              : "text-gray-400 group-hover:text-gray-200"
                          }`}>
                            {yl.year}
                          </span>

                          {/* Progress */}
                          <span className={`text-[10px] tabular-nums leading-none ${
                            isActive ? "text-yellow-500/60" : "text-gray-700"
                          }`}>
                            {yl.nomineeCount}/10
                          </span>
                        </button>

                        {/* ── Connector to next year ── */}
                        {nextYl && (
                          // mt-4 = 16px = vertical center of 32px dot
                          <div className="flex items-center mt-4">
                            {gapSize === 1 ? (
                              /* Consecutive years: solid line */
                              <div className="w-4 h-[2px] bg-gray-700 rounded-full" />
                            ) : (
                              /* Gap years: heartbeat/pulse waveform */
                              <svg
                                width="24"
                                height="12"
                                viewBox="0 0 24 12"
                                fill="none"
                                aria-hidden="true"
                                className="text-gray-600"
                              >
                                <polyline
                                  points="0,6 4,6 6,1 8,11 10,6 24,6"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Active year card (always expanded) ── */}
              <ExpandableYearCard
                key={activeYl.year}
                year={activeYl.year}
                leader={activeYl.leader}
                nomineeCount={activeYl.nomineeCount}
                neededForBallot={activeYl.neededForBallot}
                allMovies={movies}
                awards={awards}
                currentUserId={userId}
                isExpanded={true}
                onToggle={() => {}}
                onUpdateMovieRanking={handleUpdateMovieRanking}
                onCreateAward={handleCreateAwardFromExplorer}
                onOpenFullExplorer={(year) => setExplorerYear(year)}
                onMilestoneReached={handleBallotMilestone}
              />
            </section>
          );
        })()}

        {/* ─── Winners Gallery — gold AwardCard rail, just below ballot ─── */}
        {galleryYears.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4 px-1">
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide">Awards Gallery</h2>
                <p className="text-xs text-gray-500 mt-0.5">Best Picture winners by year</p>
              </div>
              {user?.user_metadata?.username && (
                <Link
                  href={`/${user.user_metadata.username}/awards`}
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-yellow-300 transition-colors"
                >
                  Full history <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
            <div className="flex gap-3 pb-3 overflow-x-auto snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {galleryYears.map((entry) => (
                <div key={entry.year} className="flex-shrink-0 w-[160px] sm:w-[180px] snap-start">
                  <AwardCard
                    year={entry.year}
                    winnerTitle={entry.winner.title}
                    winnerPoster={entry.winner.poster_url}
                    nomineeCount={entry.nomineeCount}
                    onClick={() => setExplorerYear(entry.year)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Session coach (subtle, below primary action) ─── */}
        {!sessionCoachDismissed && (
          <div className="mb-8">
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

        {/* ─── 1. User Lists — primary, personalized ─── */}
        {(userLists.length > 0 || listsLoading) && (
          <section className="mb-10">
            <HorizontalListRow
              title="Your Lists"
              lists={userLists}
              seeAllHref="/lists/mine"
              readOnly={false}
              onAdd={() => { window.location.href = "/lists"; }}
            />
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════
            2. Ready-Made Lists (horizontal scroll rail)
            Auto-generated from ratings. Sorted: directors → actors
            → decades → genres. pt-8 gives headroom for the
            ReadyMadeCard poster fan that overhangs its top edge.
            ═══════════════════════════════════════════════════ */}
        {smartAlerts.filter((a) => !a.nearMiss).length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-5 px-1">
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide">Ready-Made Lists</h2>
                <p className="text-xs text-gray-500 mt-0.5">Pre-built from your ratings — save any of these in one tap.</p>
              </div>
              <a href="/lists/ready-made" className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors font-medium">
                See all →
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 overflow-visible">
              {smartAlerts.filter((a) => !a.nearMiss).map((alert) => {
                const alertKey = `${alert.type}:${alert.label}`;
                const posterUrls = getSmartListPosterUrls(alert.movieIds);
                const typeLabel = alert.type.charAt(0).toUpperCase() + alert.type.slice(1);
                const isSaving = savingAlertKey === alertKey;
                const isSaved = savedAlertKeys.includes(alertKey);
                const isDismissed = dismissedAlertKeys.includes(alertKey);
                if (isDismissed) return null;
                return (
                  <ReadyMadeCard
                    key={alertKey}
                    title={alert.label}
                    count={alert.count}
                    subtitle={<span>Auto-generated from your seen films • {typeLabel}</span>}
                    posterUrls={posterUrls}
                    viewHref={`/lists/ready-made/${slugifyTitle(alert.label)}`}
                    headerRight={
                      isSaved ? (
                        <span className="px-3 py-1.5 text-sm font-medium text-green-400">Saved ✓</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSaveSmartList(alert)}
                          disabled={isSaving}
                          className="px-3 py-1.5 text-sm bg-yellow-500 text-black rounded hover:bg-yellow-400 disabled:opacity-50 font-medium"
                        >
                          {isSaving ? "Saving…" : "Save"}
                        </button>
                      )
                    }
                    dismissForm={
                      !isSaved && (
                        <button
                          type="button"
                          onClick={() => setDismissedAlertKeys((prev) => [...prev, alertKey])}
                          className="text-sm text-gray-400 hover:text-gray-300"
                          title="Hide this suggestion"
                        >
                          Dismiss
                        </button>
                      )
                    }
                  />
                );
              })}
            </div>
          </section>
        )}
      </>
    )}

  {/* ─── Up Next — first horizontal row ─── */}
  <WatchlistMovieRow userId={userId} username={user?.user_metadata?.username ?? null} />

  {/* ─── Recognition feed ─── */}
  {(feedLoading || feedRows.length > 0) && (
    <section className="mb-10">
      <RecognitionFeed
        rows={feedRows}
        loading={feedLoading}
        onSelectMovie={handleOpenMovieDetail}
        onUpdate={handleUpdateMovieRanking}
        currentUserId={userId}
      />
    </section>
  )}

  {/* ─── Your Canon — established only ─── */}
  {userState === "established" && yearLeaders.length > 0 && (
    <section className="mb-10">
        <div className="rounded-2xl border border-gray-700/30 bg-gray-900/50 px-6 py-6">

          {/* Section label */}
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 mb-5">
            Your Canon
          </p>

          {/* Stats row — larger, more intentional */}
          <div className="flex items-start gap-8 sm:gap-14 mb-5">
            <div>
              <p className="text-4xl font-bold text-white tabular-nums leading-none">
                {yearLeaders.length}
              </p>
              <p className="text-xs text-gray-500 mt-1.5">
                {yearLeaders.length === 1 ? "Year" : "Years"}
              </p>
            </div>
            <div className="border-l border-gray-700/50 pl-8 sm:pl-14">
              <p className="text-4xl font-bold text-white tabular-nums leading-none">
                {tasteProfile.ratedCount}
              </p>
              <p className="text-xs text-gray-500 mt-1.5">Films rated</p>
            </div>
            <div className="border-l border-gray-700/50 pl-8 sm:pl-14">
              <p className="text-4xl font-bold text-yellow-400 tabular-nums leading-none">
                {yearLeaders.filter((yl) => yl.nomineeCount >= 10).length}
              </p>
              <p className="text-xs text-gray-500 mt-1.5">Ballots complete</p>
            </div>
          </div>

          {/* Taste / genre identity */}
          {(tasteProfile.eraLabel || tasteProfile.topGenres.length > 0) && (
            <div className="border-t border-gray-700/30 pt-4">
              {tasteProfile.eraLabel && (
                <p className="text-sm text-gray-400 mb-3">
                  You tend toward{" "}
                  <span className="text-gray-200 font-medium">{tasteProfile.eraLabel}</span> films.
                </p>
              )}
              {tasteProfile.topGenres.length > 0 && (() => {
                const seenTitles = new Set<string>();
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
                    (yl.leader.genres ?? []).includes(g.genre) && !seenTitles.has(yl.leader.title)
                  );
                  if (rep) seenTitles.add(rep.leader.title);
                  if (uniqueGenreEntries.length < 3) {
                    uniqueGenreEntries.push({ label, genre: g.genre, movieTitle: rep?.leader.title ?? null });
                  }
                }
                if (uniqueGenreEntries.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-2">
                    {uniqueGenreEntries.map((entry) => (
                      <Link
                        key={entry.label}
                        href={`/films?genre=${encodeURIComponent(entry.genre)}`}
                        className="flex items-center gap-2 px-3 py-1.5 transition-colors rounded-lg bg-gray-800/50 hover:bg-gray-800/80 border border-gray-700/40 hover:border-gray-600/60"
                      >
                        <span className="text-xs font-medium text-yellow-300">{entry.label}</span>
                        {entry.movieTitle && (
                          <span className="text-xs text-gray-500 truncate max-w-[120px]">{entry.movieTitle}</span>
                        )}
                        <ArrowRight className="h-3 w-3 flex-shrink-0 text-gray-600" />
                      </Link>
                    ))}
                  </div>
                );
              })()}
            </div>
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

      {/* Movie detail modal — opened when a returning user picks a film from search */}
      {selectedSearchMovie && (
        <MovieDetailModal
          movie={selectedSearchMovie}
          isOpen={true}
          onClose={() => setSelectedSearchMovie(null)}
          onUpdate={(movieId, newRanking, newSeenIt) => {
            handleUpdateMovieRanking(movieId, { ranking: newRanking, seen_it: newSeenIt });
          }}
          initialRanking={selectedSearchMovie.rankings?.[0]?.ranking ?? null}
          initialSeenIt={selectedSearchMovie.rankings?.[0]?.seen_it ?? false}
        />
      )}

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

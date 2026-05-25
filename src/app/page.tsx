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
import { ArrowRight, ChevronDown, ChevronUp, X } from "lucide-react";
import ExpandableYearCard from "@/components/home/ExpandableYearCard";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import RecognitionFeed from "@/components/home/RecognitionFeed";
import useOnboardingState from "@/hooks/useOnboardingState";
import SessionCoach from "@/components/onboarding/SessionCoach";
import LoggedInOnboardingExperience from "@/components/onboarding/LoggedInOnboardingExperience";
import OnboardingPickFlow from "@/components/onboarding/OnboardingPickFlow";
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

// Gate the Awards Gallery on this many nominees per year — see
// PRODUCT_DESIGN_PRINCIPLES.md "Galleries earn their place".
const GALLERY_MIN_NOMINEES = 3;

// First-award localStorage key prefix. Composed with userId at use so two users
// on the same device don't share the dismissal — flagged by qa-critic as a
// silent multi-user collision risk.
const FIRST_AWARD_SEEN_KEY_PREFIX = "reawarding-first-award-seen";

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
  // New onboarding flow — modal-first Watch → Rate sequence for new users.
  // Replaces the "drop them into YearExplorer with auto-seed + tour" approach.
  const [onboardingPickFlowMovie, setOnboardingPickFlowMovie] = useState<Movie | null>(null);
  const [expandedCardYear, setExpandedCardYear] = useState<number | null>(null);
  const [selectedSearchMovie, setSelectedSearchMovie] = useState<Movie | null>(null);
  // Milestone celebration is now canvas-persistent on the ballot card itself
  // (see ExpandableYearCard). No modal state needed — the card transforms in place.
  const [sessionCoachDismissed, setSessionCoachDismissed] = useState(false);
  const [suggestedQuery, setSuggestedQuery] = useState<string | undefined>(undefined);
  const [dismissedAlertKeys, setDismissedAlertKeys] = useState<string[]>([]);
  const [savingAlertKey, setSavingAlertKey] = useState<string | null>(null);
  const [savedAlertKeys, setSavedAlertKeys] = useState<string[]>([]);
  const activeChipRef = useRef<HTMLButtonElement>(null);
  const supabase = useSupabaseClient();

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

  // Gallery years — the 8 most recent years the user has a real ballot for.
  // Gate is GALLERY_MIN_NOMINEES at module scope (see top of file).
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
        if (nominees.length < GALLERY_MIN_NOMINEES) return null;
        // Movie ids are UUID strings at runtime even though the type says
        // number. Compare as strings — Number(uuid) is NaN and the lookup
        // silently fell back to the highest-rated nominee, ignoring the
        // user's explicitly saved winner.
        const savedAward = awards.find((a) => a.year === Number(yearStr));
        const savedWinner = savedAward?.winnerId
          ? sorted.find((m) => String(m.id) === String(savedAward.winnerId))
          : null;
        const winner = savedWinner ?? nominees[0];
        return { year: Number(yearStr), winner, nomineeCount: nominees.length };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .sort((a, b) => b.year - a.year)
      .slice(0, 8);
  }, [movies, awards]);

  // Milestone callback retained for future analytics wiring.
  // The visual recognition moment lives on the ballot card itself (canvas-persistent).
  const handleBallotMilestone = useCallback(
    (_payload: { year: number; milestone: 5 | 10; winnerTitle: string }) => {
      // intentionally empty — card-level state owns the celebration
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
    },
    [updateMovieRanking]
  );

  // For returning users: search picks open movie detail modal, not the YearExplorer
  const handleOpenMovieDetail = useCallback((movie: Movie) => {
    setSuggestedQuery(undefined);
    setSelectedSearchMovie(movie);
  }, []);

  // A user is "genuinely new" if they're a guest OR an authenticated user with no
  // ratings yet. Both paths get the same first-action arc: seed at 7, create the
  // award, open the YearExplorer with the tour. Returning users get the detail modal.
  const isNewUser = useMemo(
    () => isGuest || !movies.some((m) => typeof m.rankings?.[0]?.ranking === "number"),
    [isGuest, movies]
  );

  const handleSelectMovie = useCallback(
    (movie: Movie) => {
      if (!movie.release_year) return;
      // Clear any chip-injected query so the same chip can be re-clicked later
      setSuggestedQuery(undefined);
      if (isNewUser) {
        // New first-action arc: open the Watch → Rate modal. No auto-seed, no
        // tour, no YearExplorer takeover. The user performs both actions
        // explicitly, learning the loop's two distinct steps.
        setOnboardingPickFlowMovie(movie);
        return;
      }
      handleOpenMovieDetail(movie);
    },
    [isNewUser, handleOpenMovieDetail]
  );

  // Handlers for the two-step Watch → Rate onboarding modal. Each step writes
  // independently so the user's data reflects the literal action they took.
  const handleOnboardingWatch = useCallback(
    (movieId: string | number) => {
      void updateMovieRanking(movieId as unknown as number, { seen_it: true });
    },
    [updateMovieRanking]
  );

  const handleOnboardingRate = useCallback(
    (movieId: string | number, rating: number) => {
      void updateMovieRanking(movieId as unknown as number, { ranking: rating });
      // Create the award record so the year exists in the user's data. The
      // YearExplorer will be reachable later via a "year forming" surface; we
      // don't auto-open it here.
      const m = movies.find((entry) => String(entry.id) === String(movieId));
      if (m) {
        handleCreateAwardFromExplorer(m);
      }
    },
    [updateMovieRanking, movies, handleCreateAwardFromExplorer]
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
      .map((m) => m.poster_url || "")
      .filter(Boolean) as string[],
  [movies]);

  // ── User state detection ──
  // Source of truth: PRODUCT_DESIGN_PRINCIPLES.md "State thresholds measure
  // depth, not breadth". A "year touched" (1 rating) is not the same as a
  // "year invested in" (3+ ratings). A "set ballot" is a year with 5+
  // nominees (films rated 7+), not 10 — 10 is the cap, not the milestone.
  const hasStartedBallots = awards.length > 0 || yearLeaders.length > 0;
  const depthYears = yearLeaders.filter((yl) => {
    const inYear = ratedMovies.filter((m) => m.release_year === yl.year).length;
    return inYear >= 3;
  });
  const setBallotCount = yearLeaders.filter((yl) => yl.nomineeCount >= 5).length;
  const isEstablished =
    setBallotCount >= 1 || depthYears.length >= 2 || ratedMovies.length >= 20;
  // Mature is strictly additive to established — a single-year power-rater
  // (50 ratings, 1 year, 0 set ballots) can pass the ratedMovies arm but
  // shouldn't leapfrog Building → Mature into a museum register.
  const isMature =
    isEstablished &&
    (setBallotCount >= 3 || depthYears.length >= 5 || ratedMovies.length >= 50);

  const userState: "new" | "building" | "established" | "mature" = !hasStartedBallots
    ? "new"
    : isMature
    ? "mature"
    : isEstablished
    ? "established"
    : "building";

  // Awards Gallery edit mode — the gallery rail flips in place to expose the
  // year timeline + active ballot card. Same surface, two states: rewards
  // (golden register) ↔ workshop (editable). On toggle: scroll the gallery
  // section's top into view so the header + toggle stay anchored through
  // the body swap.
  const [workshopOpen, setWorkshopOpen] = useState(false);
  const galleryRef = useRef<HTMLElement>(null);
  const workshopOpenRef = useRef(false);
  useEffect(() => {
    const wasOpen = workshopOpenRef.current;
    workshopOpenRef.current = workshopOpen;
    if (wasOpen !== workshopOpen && galleryRef.current) {
      galleryRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [workshopOpen]);

  // ── First-set-ballot moment ─────────────────────────────────────────────────
  // PRODUCT_DESIGN_PRINCIPLES.md "Crossing into Established is a marked moment":
  // the first time a user sets a ballot, the established home renders a single
  // persistent on-canvas line. Once dismissed, never again. localStorage flag
  // is userId-scoped so two users on the same device don't share dismissal.
  //
  // Predicate is "this is the first render where setBallotCount >= 1", NOT
  // "setBallotCount === 1". A user who imports a batch of ratings that result
  // in 3 set ballots at once would have missed the moment under the old check.
  // Per product-loop-auditor: the moment is calibrated to the *crossing*,
  // not the magic number.
  const firstAwardSeenKey = userId
    ? `${FIRST_AWARD_SEEN_KEY_PREFIX}:${userId}`
    : null;
  const firstSetBallotYear = useMemo(() => {
    // Pick the most recent set year for display. In the organic single-set
    // case this is the only set year; in the batch case it's a sensible
    // representative for the copy variant that names a year.
    const setYears = yearLeaders
      .filter((yl) => yl.nomineeCount >= 5)
      .map((yl) => yl.year);
    if (setYears.length === 0) return null;
    return Math.max(...setYears);
  }, [yearLeaders]);
  const [firstAwardDismissed, setFirstAwardDismissed] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined" || !firstAwardSeenKey) return;
    setFirstAwardDismissed(localStorage.getItem(firstAwardSeenKey) === "true");
  }, [firstAwardSeenKey]);
  const showFirstAwardMoment =
    setBallotCount >= 1 && firstSetBallotYear !== null && !firstAwardDismissed;
  const dismissFirstAwardMoment = useCallback(() => {
    setFirstAwardDismissed(true);
    if (typeof window !== "undefined" && firstAwardSeenKey) {
      localStorage.setItem(firstAwardSeenKey, "true");
    }
  }, [firstAwardSeenKey]);

  // ── Established "Now try another year" suggestions ──────────────────────
  // The Established lead's job (PRODUCT_DESIGN_PRINCIPLES.md): "You have a
  // {year} ballot. What's next?" — propose specific years rather than leave
  // the user staring at an empty search bar. Priority:
  //  1. Years the user has touched but not set (1–4 nominees) — finishing
  //     what they started, closest-to-set first.
  //  2. Fall back to canonical SUGGESTED_YEARS they haven't touched yet.
  const nextYearSuggestions = useMemo(() => {
    const touchedYears = new Set(yearLeaders.map((yl) => yl.year));
    const formingYears = yearLeaders
      .filter((yl) => yl.nomineeCount > 0 && yl.nomineeCount < 5)
      .sort((a, b) => (5 - a.nomineeCount) - (5 - b.nomineeCount))
      .map((yl) => yl.year);
    const freshYears = SUGGESTED_YEARS.filter((y) => !touchedYears.has(y));
    const combined = [...formingYears, ...freshYears];
    // Dedupe + cap at 3
    return Array.from(new Set(combined)).slice(0, 3);
  }, [yearLeaders]);
  const hasFormingTouched = useMemo(
    () => yearLeaders.some((yl) => yl.nomineeCount > 0 && yl.nomineeCount < 5),
    [yearLeaders]
  );

  // ── User lists for established + mature homepages ──
  const { lists: userLists, loading: listsLoading } = useUserLists(
    isEstablished || isMature ? (userId ?? null) : null
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
  // For guests: once auth resolves we know they're unauthenticated — don't wait on authChecked.
  // For authenticated users: wait for both authChecked and data hooks.
  const dataStillLoading = authStatus === "loading" || (!authChecked && isAuthenticated) || (isAuthenticated && (loading || awardsLoading));
  const homepageDataError = moviesError || (isAuthenticated ? awardsError : null);
  if (dataStillLoading) {
    return (
      <div className="home-shell flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 rounded-full border-gold-400/30 border-t-gold-400 animate-spin" />
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
        <div className="pt-6 pb-24">

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
            onSelectMovie={handleSelectMovie}
            onSuggestedQuery={setSuggestedQuery}
            onShowHowItWorks={() => scrollToElementById("logged-in-onboarding-steps", reducedMotion)}
            onDismiss={dismissOnboarding}
          />
        ) : (
          <section className="mx-auto max-w-3xl">
            <MovieSearchPicker
              onSelect={handleSelectMovie}
              placeholder="Search for a film you've watched"
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
            onShowHowItWorks={() => scrollToElementById("logged-in-onboarding-steps", reducedMotion)}
            onDismiss={dismissOnboarding}
          />
        ) : null}

        {/* ─── Hero: active ballot ─── */}
        {mostRecentBallot && (() => {
          // Two leads for Building (PRODUCT_DESIGN_PRINCIPLES.md "Building has
          // two leads"). Near-set (4+ nominees) is the highest-urgency moment
          // in the app — copy says it. Forming reads as patient. `>= 4` (not
          // `=== 4`) protects against a race where nomineeCount briefly reads
          // 5+ while userState is still Building — flagged by qa-critic.
          const nearSet = mostRecentBallot.nomineeCount >= 4;
          return (
          <section className="mb-8">
            <p className={`mb-3 text-xs font-semibold uppercase tracking-wider ${
              nearSet ? "text-gold-300" : "text-gray-500"
            }`}>
              {nearSet
                ? `One more film completes your ${mostRecentBallot.year} ballot`
                : `Keep going on ${mostRecentBallot.year}`}
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
          );
        })()}

        {/* ─── Search: add another film ─── */}
        {!onboardingFlow.shouldShow && (
          <section className="mb-8">
            <div className="mx-auto max-w-3xl">
              <MovieSearchPicker
                onSelect={handleOpenMovieDetail}
                placeholder="Search for a film you've watched"
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
                  className="flex-shrink-0 rounded-md border border-gray-700/30 bg-charcoal-900/40 px-3 py-1.5 font-unbounded text-xs font-semibold text-gray-400 hover:border-gold-500/30 hover:text-white transition-all"
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
        {/* ─── First-award moment ───────────────────────────────────────────
            One-time inline acknowledgement of the Building → Established
            crossing. Fires on the first render where setBallotCount >= 1
            (covers both the organic single-set case and the batch-import
            case where multiple ballots arrive at once). Dismissible,
            never returns once dismissed. Persistent on-canvas, not a toast.
            See PRODUCT_DESIGN_PRINCIPLES.md ("Crossing into Established
            is a marked moment"). */}
        {showFirstAwardMoment && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-gold-500/40 bg-gold-500/5 px-4 py-3">
            <p className="flex-1 text-sm leading-snug text-gray-200">
              {setBallotCount === 1 ? (
                <>
                  <span className="font-semibold text-gold-300">
                    {firstSetBallotYear} is set.
                  </span>{" "}
                  Your first award.
                </>
              ) : (
                <span className="font-semibold text-gold-300">
                  Your first awards are set.
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={dismissFirstAwardMoment}
              aria-label="Dismiss"
              className="-mr-1 p-1 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gold-500/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            ZONE 1 — Workbench (search → timeline → ballot → gallery)
            Tight inter-section spacing — these belong together rhythmically.
            ═══════════════════════════════════════════════════ */}
        <section className="mb-6">
          {/* Lightweight greeting — low visual weight, does not compete with search */}
          <p className="mb-3 text-center text-2xl font-bold text-white font-unbounded tracking-tight">Welcome back.</p>
          {/* "Now try another year" — Established's directional lead. Suggests
              specific years to pursue so the user has a concrete next action
              rather than an empty search bar. Mature users have the workshop
              drawer for this — skip here. */}
          {nextYearSuggestions.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs uppercase tracking-wider text-gray-500">
                {hasFormingTouched ? "Finish what you started" : "Try another year"}
              </span>
              {nextYearSuggestions.map((year) => (
                <a
                  key={year}
                  href={`/onboarding/${year}`}
                  className="inline-flex items-center gap-1 rounded-md border border-gold-500/30 bg-gold-500/[0.06] px-3 py-1.5 font-unbounded text-xs font-semibold text-gold-300 hover:border-gold-500/50 hover:bg-gold-500/[0.12] transition-colors"
                >
                  {year}
                  <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
          <div className="max-w-3xl mx-auto">
            <MovieSearchPicker
              onSelect={handleOpenMovieDetail}
              placeholder="Search for a film you've watched"
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
            <section className="mb-8">
              {/* ── Year timeline rail ─────────────────────────────────────
                  Dot-and-line design. Each year is a circular node with the
                  year label + progress count below. Consecutive years share
                  a solid connector; a gap-break visual marks skipped years.
                  Sorted newest → oldest; active dot auto-scrolls into view.
                  ─────────────────────────────────────────────────────── */}
              <div className="relative mb-6">
                <div
                  className="flex items-start overflow-x-auto pb-3 snap-x snap-mandatory"
                  style={{ scrollbarWidth: "none" }}
                >
                  {sortedLeaders.map((yl, idx) => {
                    const isActive    = yl.year === activeYl.year;
                    const isComplete  = yl.nomineeCount >= 10;
                    const nextYl      = sortedLeaders[idx + 1];
                    const gapSize     = nextYl ? yl.year - nextYl.year : 0;

                    return (
                      <div key={yl.year} className="flex-shrink-0 flex items-start snap-start">

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
                                ? "w-3 h-3 bg-gold-400"
                                : "w-2 h-2 bg-gray-600 group-hover:bg-gray-400"
                            }`} />
                          </div>

                          {/* Year label */}
                          <span className={`text-[10px] font-bold font-unbounded leading-tight mt-0.5 transition-colors ${
                            isActive
                              ? "text-gold-300"
                              : "text-gray-400 group-hover:text-gray-200"
                          }`}>
                            {yl.year}
                          </span>

                          {/* Progress */}
                          <span className={`text-[10px] tabular-nums leading-none ${
                            isActive ? "text-gold-500/60" : "text-gray-700"
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
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4 px-1">
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide">Awards Gallery</h2>
                <p className="text-xs text-gray-500 mt-0.5">Best Picture winners by year</p>
              </div>
              {user?.user_metadata?.username && (
                <Link
                  href={`/${user.user_metadata.username}/awards`}
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gold-300 transition-colors"
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
          <div className="mb-6">
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

        {/* ═══════════════════════════════════════════════════════
            ZONE 2 — Secondary surfaces (lists, suggestions)
            Generous mt-16 break signals a content shift from the workbench.
            ═══════════════════════════════════════════════════ */}
        {/* ─── 1. User Lists — primary, personalized ─── */}
        {(userLists.length > 0 || listsLoading) && (
          <section className="mt-16 mb-8">
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
            2. Ready-Made Lists — horizontal scroll rail
            Auto-generated from ratings. Sorted: directors → actors
            → decades → genres. Terminates in a gold dashed CTA that
            opens the full Ready-Made library (moved here from
            HorizontalListRow's "Your Lists" rail).
            ═══════════════════════════════════════════════════ */}
        {smartAlerts.filter((a) => !a.nearMiss).length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-5 px-1">
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide">Ready-Made Lists</h2>
                <p className="text-xs text-gray-500 mt-0.5">Pre-built from your ratings — save any of these in one tap.</p>
              </div>
              <a href="/lists/ready-made" className="text-sm text-gold-400 hover:text-gold-300 transition-colors font-medium">
                See all →
              </a>
            </div>
            <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {smartAlerts.filter((a) => !a.nearMiss).map((alert) => {
                const alertKey = `${alert.type}:${alert.label}`;
                const posterUrls = getSmartListPosterUrls(alert.movieIds);
                const typeLabel = alert.type.charAt(0).toUpperCase() + alert.type.slice(1);
                const isSaving = savingAlertKey === alertKey;
                const isSaved = savedAlertKeys.includes(alertKey);
                const isDismissed = dismissedAlertKeys.includes(alertKey);
                if (isDismissed) return null;
                return (
                  <div key={alertKey} className="min-w-[300px] max-w-[300px] flex-shrink-0 snap-start overflow-visible">
                    <ReadyMadeCard
                      title={alert.label}
                      count={alert.count}
                      subtitle={<span>{typeLabel}</span>}
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
                            className="px-3 py-1.5 text-sm bg-gold-500 text-black rounded hover:bg-gold-400 disabled:opacity-50 font-medium"
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
                  </div>
                );
              })}
              {/* Terminator — relocated from HorizontalListRow's "Your Lists" rail */}
              <Link
                href="/lists/ready-made"
                className="min-w-[300px] max-w-[300px] h-[260px] mt-5 flex-shrink-0 snap-start flex flex-col items-center justify-center border-2 border-dashed border-gold-500/40 bg-charcoal-900/40 hover:border-gold-500/60 hover:bg-charcoal-900/60 rounded-lg shadow-md transition-all p-6 group"
                aria-label="Browse all ready-made lists"
              >
                <div className="flex items-center justify-center w-16 h-16 mb-2 rounded-full bg-gold-500/20 group-hover:bg-gold-500/40 transition-all">
                  <List className="w-7 h-7 text-gold-300" />
                </div>
                <span className="mt-2 text-base font-semibold text-gold-200 group-hover:text-gold-300 transition-colors">Browse all</span>
                <span className="mt-1 text-xs text-gray-300">More from your ratings</span>
              </Link>
            </div>
          </section>
        )}
      </>
    )}

    {/* ═══════════════════════════════════════════════════════
        MATURE STATE — museum-led; workbench collapses to a pill.
        The user has earned reward-forward framing. Continue / search
        are present but quiet. Awards Gallery leads, then curatorial
        surfaces (Lists, Ready-Made), then discovery, then Canon coda.
        See PRODUCT_DESIGN_PRINCIPLES §5 (workbench scales with maturity).
        ═══════════════════════════════════════════════════ */}
    {userState === "mature" && (
      <>
        {/* ─── Compact workbench strip ───
            Welcome back is the prominent headline. Search sits full-width
            directly below — it remains the canonical entry into the loop.
            "Update awards" lives next to the Awards Gallery below so the
            workshop is reachable from the rewards register, not the entry. */}
        <section className="mb-10 scroll-mt-4">
          <h1 className="mb-5 text-2xl sm:text-3xl font-bold text-white font-unbounded tracking-tight">
            Welcome back
            {user?.user_metadata?.username ? `, ${user.user_metadata.username}` : ""}.
          </h1>
          <div className="max-w-3xl">
            <MovieSearchPicker
              onSelect={handleOpenMovieDetail}
              placeholder="Search for a film you've watched"
              variant="hero"
              suggestedQuery={suggestedQuery}
            />
          </div>
        </section>

        {/* ─── Awards Gallery — the lead (your collection) ───
            Two states share one surface. Default: golden AwardCard rail
            (rewards register). Edit: timeline rail + active ballot card
            (workshop). The header + flanking actions stay put; only the
            body swaps. "Update awards" flips the body to edit mode, "See
            all" deep-links to the user's full awards register. */}
        {galleryYears.length > 0 && (
          <section ref={galleryRef} className="mb-12 scroll-mt-4">
            <div className="flex items-center justify-between gap-3 mb-4 px-1">
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide">Awards Gallery</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {workshopOpen
                    ? "Adjust your ratings — winners reshape automatically."
                    : "Best Picture winners by year"}
                </p>
              </div>
              <div className="flex items-center gap-4 sm:gap-5">
                {yearLeaders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setWorkshopOpen((open) => !open)}
                    aria-expanded={workshopOpen}
                    aria-controls="mature-workshop"
                    className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-medium text-gold-300 hover:text-gold-200 transition-colors whitespace-nowrap"
                  >
                    {workshopOpen ? "Close workshop" : "Open workshop"}
                    {workshopOpen ? (
                      <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                  </button>
                )}
                {user?.user_metadata?.username && (
                  <Link
                    href={`/${user.user_metadata.username}/awards`}
                    className="inline-flex items-center gap-1 min-h-[44px] text-sm text-gray-400 hover:text-gold-300 transition-colors whitespace-nowrap"
                  >
                    See all <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>

            {workshopOpen && yearLeaders.length > 0 ? (
              /* Edit mode — timeline rail + active ballot card replace the
                 golden rail in place. Same dot + heartbeat treatment as the
                 established state's workbench. */
              (() => {
                const activeYl =
                  yearLeaders.find((yl) => yl.year === expandedCardYear) ?? yearLeaders[0];
                const sortedLeaders = [...yearLeaders].sort((a, b) => b.year - a.year);

                return (
                  <div id="mature-workshop" aria-label="Workshop — edit your ballots">
                    <div className="relative mb-6">
                      <div
                        className="flex items-start overflow-x-auto pb-3 snap-x snap-mandatory"
                        style={{ scrollbarWidth: "none" }}
                      >
                        {sortedLeaders.map((yl, idx) => {
                          const isActive = yl.year === activeYl.year;
                          const nextYl = sortedLeaders[idx + 1];
                          const gapSize = nextYl ? yl.year - nextYl.year : 0;

                          return (
                            <div key={yl.year} className="flex-shrink-0 flex items-start snap-start">
                              <button
                                ref={isActive ? activeChipRef : undefined}
                                type="button"
                                onClick={() => setExpandedCardYear(yl.year)}
                                className="flex flex-col items-center gap-1 min-w-[52px] px-1 group"
                              >
                                <div className="w-8 h-8 flex items-center justify-center">
                                  <div className={`rounded-full transition-all ${
                                    isActive
                                      ? "w-3 h-3 bg-gold-400"
                                      : "w-2 h-2 bg-gray-600 group-hover:bg-gray-400"
                                  }`} />
                                </div>
                                <span className={`text-[10px] font-bold font-unbounded leading-tight mt-0.5 transition-colors ${
                                  isActive
                                    ? "text-gold-300"
                                    : "text-gray-400 group-hover:text-gray-200"
                                }`}>
                                  {yl.year}
                                </span>
                                <span className={`text-[10px] tabular-nums leading-none ${
                                  isActive ? "text-gold-500/60" : "text-gray-700"
                                }`}>
                                  {yl.nomineeCount}/10
                                </span>
                              </button>

                              {nextYl && (
                                <div className="flex items-center mt-4">
                                  {gapSize === 1 ? (
                                    <div className="w-4 h-[2px] bg-gray-700 rounded-full" />
                                  ) : (
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
                  </div>
                );
              })()
            ) : (
              /* Rewards register — the golden AwardCard rail */
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
            )}
          </section>
        )}

        {/* ─── Your Lists — what you've curated ─── */}
        {(userLists.length > 0 || listsLoading) && (
          <section className="mb-12">
            <HorizontalListRow
              title="Your Lists"
              lists={userLists}
              seeAllHref="/lists/mine"
              readOnly={false}
              onAdd={() => { window.location.href = "/lists"; }}
            />
          </section>
        )}

        {/* ─── Recognition Feed — discovery elevated for mature users ───
            Deep users have earned the system's highest-value offer (taste-
            matched film suggestions). Promoted ahead of Ready-Made Lists so
            it doesn't sit buried beneath curatorial surfaces. The shared
            RecognitionFeed render below is suppressed for mature users
            (`userState !== "mature"`) to avoid double-rendering. */}
        {(feedLoading || feedRows.length > 0) && (
          <section className="mb-12">
            <RecognitionFeed
              rows={feedRows}
              loading={feedLoading}
              onSelectMovie={handleOpenMovieDetail}
              onUpdate={handleUpdateMovieRanking}
              currentUserId={userId}
            />
          </section>
        )}

        {/* ─── Ready-Made Lists — auto-built from your taste ───
            Horizontal scroll. Terminates in a gold dashed CTA that opens
            the full Ready-Made library (moved here from HorizontalListRow). */}
        {smartAlerts.filter((a) => !a.nearMiss).length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-5 px-1">
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide">Ready-Made Lists</h2>
                <p className="text-xs text-gray-500 mt-0.5">Pre-built from your ratings — save any of these in one tap.</p>
              </div>
              <a href="/lists/ready-made" className="text-sm text-gold-400 hover:text-gold-300 transition-colors font-medium">
                See all →
              </a>
            </div>
            <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {smartAlerts.filter((a) => !a.nearMiss).map((alert) => {
                const alertKey = `${alert.type}:${alert.label}`;
                const posterUrls = getSmartListPosterUrls(alert.movieIds);
                const typeLabel = alert.type.charAt(0).toUpperCase() + alert.type.slice(1);
                const isSaving = savingAlertKey === alertKey;
                const isSaved = savedAlertKeys.includes(alertKey);
                const isDismissed = dismissedAlertKeys.includes(alertKey);
                if (isDismissed) return null;
                return (
                  <div key={alertKey} className="min-w-[300px] max-w-[300px] flex-shrink-0 snap-start overflow-visible">
                    <ReadyMadeCard
                      title={alert.label}
                      count={alert.count}
                      subtitle={<span>{typeLabel}</span>}
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
                            className="px-3 py-1.5 text-sm bg-gold-500 text-black rounded hover:bg-gold-400 disabled:opacity-50 font-medium"
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
                  </div>
                );
              })}
              {/* Terminator — relocated from HorizontalListRow's "Your Lists" rail */}
              <Link
                href="/lists/ready-made"
                className="min-w-[300px] max-w-[300px] h-[260px] mt-5 flex-shrink-0 snap-start flex flex-col items-center justify-center border-2 border-dashed border-gold-500/40 bg-charcoal-900/40 hover:border-gold-500/60 hover:bg-charcoal-900/60 rounded-lg shadow-md transition-all p-6 group"
                aria-label="Browse all ready-made lists"
              >
                <div className="flex items-center justify-center w-16 h-16 mb-2 rounded-full bg-gold-500/20 group-hover:bg-gold-500/40 transition-all">
                  <List className="w-7 h-7 text-gold-300" />
                </div>
                <span className="mt-2 text-base font-semibold text-gold-200 group-hover:text-gold-300 transition-colors">Browse all</span>
                <span className="mt-1 text-xs text-gray-300">More from your ratings</span>
              </Link>
            </div>
          </section>
        )}
      </>
    )}

  {/* ─── Up Next — first horizontal row ─── */}
  <WatchlistMovieRow userId={userId} username={user?.user_metadata?.username ?? null} />

  {/* ─── Recognition feed ─── (mature renders this earlier, inside its own branch) */}
  {userState !== "mature" && (feedLoading || feedRows.length > 0) && (
    <section className="mb-12">
      <RecognitionFeed
        rows={feedRows}
        loading={feedLoading}
        onSelectMovie={handleOpenMovieDetail}
        onUpdate={handleUpdateMovieRanking}
        currentUserId={userId}
      />
    </section>
  )}

  {/* ═══════════════════════════════════════════════════════
      ZONE 4 — Coda: Your Canon (established + mature)
      Editorial summary of the user's canon — not a stats wall.
      Reduced typography, neutralized gold, no panel chrome.
      ═══════════════════════════════════════════════════ */}
  {(userState === "established" || userState === "mature") && setBallotCount >= 1 && (
    <section className="mt-16">
        <div className="px-1">

          {/* Section label */}
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 mb-4">
            Your Canon
          </p>

          {/* Stats row — quiet, supportive, no longer competing */}
          <div className="flex items-start gap-4 sm:gap-8 mb-5">
            <div>
              <p className="text-2xl font-semibold text-gray-200 tabular-nums leading-none">
                {yearLeaders.length}
              </p>
              <p className="text-xs text-gray-500 mt-1.5">
                {yearLeaders.length === 1 ? "Year" : "Years"}
              </p>
            </div>
            <div className="border-l border-gray-700/40 pl-4 sm:pl-8">
              <p className="text-2xl font-semibold text-gray-200 tabular-nums leading-none">
                {tasteProfile.ratedCount}
              </p>
              <p className="text-xs text-gray-500 mt-1.5">Films rated</p>
            </div>
            <div className="border-l border-gray-700/40 pl-4 sm:pl-8">
              <p className="text-2xl font-semibold text-gray-200 tabular-nums leading-none">
                {setBallotCount}
              </p>
              <p className="text-xs text-gray-500 mt-1.5">Ballots set</p>
            </div>
          </div>

          {/* Taste / genre identity — the editorial heart of this section */}
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
                        <span className="text-xs font-medium text-gold-300">{entry.label}</span>
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

      {/* Onboarding Watch → Rate → Form flow — first-pick experience for new users */}
      <OnboardingPickFlow
        isOpen={onboardingPickFlowMovie !== null}
        movie={onboardingPickFlowMovie}
        currentNomineeCountForYear={(() => {
          // Count rated-7+ films for the picked movie's year, EXCLUDING the
          // current movie so the forming panel can add it back correctly
          // regardless of whether the parent's data has refreshed yet.
          if (!onboardingPickFlowMovie?.release_year) return 0;
          const year = onboardingPickFlowMovie.release_year;
          return movies.filter((m) => {
            if (m.id === onboardingPickFlowMovie.id) return false;
            if (m.release_year !== year) return false;
            const r = m.rankings?.[0]?.ranking;
            return typeof r === "number" && r >= 7;
          }).length;
        })()}
        onConfirmWatch={handleOnboardingWatch}
        onRate={handleOnboardingRate}
        onRateAnother={() => {
          // Send the guest to the year-scoped onboarding continuation page.
          // The page wraps a year-only film grid in persistent onboarding
          // chrome (progress header + sticky signup CTA) so momentum holds.
          // Don't clear the modal state here — OnboardingPickFlow holds a
          // loading view in place until the new page replaces the tree, so
          // the user never sees the underlying home page during navigation.
          const year = onboardingPickFlowMovie?.release_year;
          if (year) {
            window.location.href = `/onboarding/${year}`;
          }
        }}
        onTryAnotherYear={() => {
          // No year filter — let them pick any film, any year. /films is now
          // guest-accessible (gate removed earlier this session). Modal stays
          // open with a loading view until /films loads.
          window.location.href = "/films";
        }}
        onSignup={() => { window.location.href = "/login"; }}
        onPickAnother={() => setOnboardingPickFlowMovie(null)}
        onClose={() => setOnboardingPickFlowMovie(null)}
      />

    </div>
  );
}

"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import HeroReveal, { ACADEMY_REFERENCE } from "@/app/components/home/HeroReveal";
import HowItWorksSection from "@/app/components/home/HowItWorksSection";
import PanelFinalCTA from "@/app/components/home/PanelFinalCTA";
import NativeGuestHome, {
  type NativeLedgerState,
  type NativeNextYear,
  type NativeTopBallot,
} from "@/app/components/home/NativeGuestHome";
import { useIsNativeApp } from "@/hooks/useIsNativeApp";
import { useAcademyPickForYear } from "@/hooks/useAcademyPickForYear";
import MovieSearchPicker from "@/components/home/MovieSearchPicker";
import { useProfile } from "@/contexts/ProfileContext";
import { scrollToElementById, usePrefersReducedMotion } from "@/lib/motion";
import { useMovieDataWithGuest } from "@/utils/sharedMovieUtils";
import { useCreateAward } from "@/hooks/useCreateAward";
import { useUserAwards } from "@/hooks/useUserAwards";
import { buildTasteProfile, getYearLeaders } from "@/utils/tasteInsights";
import { ArrowRight, Check, Filter, Trophy, X } from "lucide-react";
import MuseumYearTimeline from "@/components/home/MuseumYearTimeline";
import AlternateOscarHistoryPanel from "@/components/home/AlternateOscarHistoryPanel";
import EditableYearSection from "@/components/award/EditableYearSection";
import BallotEditorOverlay from "@/components/award/BallotEditorOverlay";
import YearExplorer from "@/components/home/YearExplorer";
import MovieDetailModal from "@/components/movie/MovieDetailModal";
import useOnboardingState from "@/hooks/useOnboardingState";
import LoggedInOnboardingExperience from "@/components/onboarding/LoggedInOnboardingExperience";
import OnboardingPickFlow from "@/components/onboarding/OnboardingPickFlow";
import { useSmartListAlerts } from "@/hooks/useSmartListAlerts";
import { useLoggedInOnboarding } from "@/hooks/useLoggedInOnboarding";
import Banner from "@/components/ui/Banner";
import type { Movie } from "@/types/types";
import { useAuthState } from "@/hooks/useAuthState";
import { useWatchlistContext } from "@/contexts/WatchlistContext";

gsap.registerPlugin(ScrollTrigger);

// Web guest funnel, cut from six panels to three
// (docs/design/logged-out-native-home.md). The retired panels — PanelHook,
// PanelTimeline, PanelReassurance — each made a *different* argument, so six
// panels landed none of them; a visitor couldn't repeat back what the app
// does. The components still exist and are unwired, not deleted. PanelHook's
// one persuasive line now lives in the hero as social proof.
//
// The PANEL_IDS list that used to sit here fed the scroll-progress dot rail,
// removed along with it.

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

// First-award localStorage key prefix. Composed with userId at use so two users
// on the same device don't share the dismissal — flagged by qa-critic as a
// silent multi-user collision risk.
const FIRST_AWARD_SEEN_KEY_PREFIX = "reawarding-first-award-seen";

// Archive sort preference. Actor-scoped at use the same way as the key above,
// so two users on one device don't inherit each other's choice.
const ARCHIVE_SORT_KEY_PREFIX = "reawarding-archive-sort";

type ArchiveSort = "chronological" | "strength";

export default function HomePage() {
  const router = useRouter();
  const reducedMotion = usePrefersReducedMotion();
  // `null` until the client resolves it — the guest branch below holds its
  // render rather than flashing the web funnel inside the native shell.
  const isNative = useIsNativeApp();
  const { status: authStatus, isAuthenticated, user } = useAuthState();
  const { movies, userId, updateMovieRanking, isGuest, loading, authChecked, error: moviesError } = useMovieDataWithGuest();
  const { createAward } = useCreateAward();
  const { profile } = useProfile();
  const { awards, loading: awardsLoading, error: awardsError } = useUserAwards();
  // New onboarding flow — modal-first Watch → Rate sequence for new users.
  // Replaces the "drop them into YearExplorer with auto-seed + tour" approach.
  const [onboardingPickFlowMovie, setOnboardingPickFlowMovie] = useState<Movie | null>(null);
  const [selectedSearchMovie, setSelectedSearchMovie] = useState<Movie | null>(null);
  const [savePromptDismissed, setSavePromptDismissed] = useState(false);
  const [suggestedQuery, setSuggestedQuery] = useState<string | undefined>(undefined);
  // "Edit ballot" opens YearExplorer in a dismissible overlay in place, instead
  // of navigating to /year/[year] (which still exists as a real route for
  // direct links/refresh — see BallotEditorOverlay for why this is safe to
  // nest MovieDetailModal inside without repeating the old modal-stacking bug).
  const [editingYear, setEditingYear] = useState<number | null>(null);

  // ── Year timeline (ported from /awards) — visibility windowing, scrollspy,
  // and one-shot arrival reveal for the scrubbable year-by-year ballot list. ──
  const [visibleYears, setVisibleYears] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const yearElementsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeScrollYear, setActiveScrollYear] = useState<number | null>(null);
  const spyObserverRef = useRef<IntersectionObserver | null>(null);
  const [arrivedYears, setArrivedYears] = useState<Set<string>>(new Set());

  // Archive sort order. Chronological (newest first) stays the default so the
  // page opens the way it always has; "strength" leads with the most-formed
  // ballots instead, so a thin newest year doesn't headline a deep archive.
  const [archiveSort, setArchiveSort] = useState<ArchiveSort>("chronological");
  // Sort popover — same funnel-icon-opens-a-menu pattern as MovieFilters'
  // compact Filters button on /rankings and /films, sized down for this
  // page's one binary choice instead of a full sort/group/view modal.
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);

  // Read the stored preference after mount rather than in the initial state —
  // touching localStorage during the first render desyncs server/client HTML.
  useEffect(() => {
    if (!userId) return;
    try {
      const stored = window.localStorage.getItem(`${ARCHIVE_SORT_KEY_PREFIX}:${userId}`);
      if (stored === "strength" || stored === "chronological") setArchiveSort(stored);
    } catch {
      // Private mode / blocked storage — keep the default.
    }
  }, [userId]);

  const handleArchiveSortChange = useCallback(
    (next: ArchiveSort) => {
      setArchiveSort(next);
      if (!userId) return;
      try {
        window.localStorage.setItem(`${ARCHIVE_SORT_KEY_PREFIX}:${userId}`, next);
      } catch {
        // Non-fatal — the sort still applies for this session.
      }
    },
    [userId]
  );

  // Close the sort popover on outside click or Escape — same behavior as
  // the app's other icon-triggered menus (e.g. ListDetailView's manage menu).
  useEffect(() => {
    if (!showSortMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSortMenu(false);
    };
    document.addEventListener("mousedown", handleClick, true);
    document.addEventListener("keydown", handleKey, true);
    return () => {
      document.removeEventListener("mousedown", handleClick, true);
      document.removeEventListener("keydown", handleKey, true);
    };
  }, [showSortMenu]);

  const arrivalObserverRef = useRef<IntersectionObserver | null>(null);

  // Determine if we're showing guest panels (unauthenticated).
  // `showGuestPanels` tracks whether to render the GSAP scroll panels.
  // It starts `null` (unknown) until auth resolves, then mirrors `isGuest`.
  // For guest→logged-in transitions, GSAP cleanup happens before unmount.
  const [showGuestPanels, setShowGuestPanels] = useState<boolean | null>(null);
  const guestPanelsActiveRef = useRef(false);

  // ── Onboarding state ──
  const hasDismissedOnboarding = useOnboardingState((state) => state.hasDismissedOnboarding);
  const dismissOnboarding = useOnboardingState((state) => state.dismissOnboarding);
  const recordOnboardingSession = useOnboardingState((state) => state.recordSession);
  const onboardingFlow = useLoggedInOnboarding(movies, awards, hasDismissedOnboarding);

  // Record session visit on mount
  useEffect(() => {
    recordOnboardingSession();
  }, [recordOnboardingSession]);

  // Full year timeline (ported from /awards) — every year with at least one
  // rated film, rendered as an editable ballot section. This is what makes
  // Home the actual archive rather than a preview of it.
  const formattedYears = useMemo<{
    year: string;
    winner: Movie | undefined;
    nominees: Movie[];
    allMovies: Movie[];
  }[]>(() => {
    const moviesWithRankings = movies.filter(
      (movie) => movie.rankings && movie.rankings.length > 0 && movie.rankings[0].ranking !== null
    );

    const groupedByYear = moviesWithRankings.reduce<Record<string, Movie[]>>((acc, movie) => {
      const year = String(movie.release_year);
      if (!acc[year]) acc[year] = [];
      acc[year].push(movie);
      return acc;
    }, {});

    return Object.entries(groupedByYear)
      .map(([year, moviesInYear]) => {
        const sorted = [...moviesInYear].sort(
          (a, b) => (b.rankings[0]?.ranking ?? 0) - (a.rankings[0]?.ranking ?? 0)
        );

        // Winner is always the highest-rated film — decoupled from however
        // defaultNominees below ends up sorted for display.
        const defaultWinner = sorted[0];

        // Display order defaults to alphabetical; rating only determines who
        // qualifies (7+) and the top-10 cutoff.
        const defaultNominees = sorted
          .filter((movie) => (movie.rankings[0]?.ranking ?? 0) >= 7)
          .slice(0, 10)
          .sort((a, b) => a.title.localeCompare(b.title));

        const savedAward = awards.find((a) => a.year === Number(year));

        // Movie ids are UUID strings at runtime; Number(uuid) → NaN, which
        // silently breaks saved-winner/nominee lookups. Compare as strings.
        const savedNominees = savedAward?.nomineeIds?.length
          ? (savedAward.nomineeIds
              .map((id) => sorted.find((m) => String(m.id) === String(id)))
              .filter((m): m is Movie => Boolean(m)))
          : null;

        const savedWinner = savedAward?.winnerId
          ? (sorted.find((m) => String(m.id) === String(savedAward.winnerId)) ?? null)
          : null;

        return {
          year,
          winner: savedWinner ?? defaultWinner,
          nominees: savedNominees?.length ? savedNominees : defaultNominees,
          allMovies: sorted,
        };
      })
      .filter((yearData) => yearData.allMovies.length >= 1)
      .sort((a, b) => Number(b.year) - Number(a.year));
  }, [movies, awards]);

  // Render order for the archive below. The scrubber itself stays
  // chronological in both modes — it's a timeline, and its connectors (solid
  // for consecutive years, heartbeat for gaps) only carry meaning between
  // chronologically adjacent entries. Only the ballot list reorders.
  const sortedYears = useMemo(() => {
    if (archiveSort === "chronological") return formattedYears;
    return [...formattedYears].sort((a, b) => {
      // Nominee count leads because it's the product's own measure of how far
      // a ballot has formed (5+ is "set"). Total rated breaks ties — same
      // nominee count with more films behind it is the better-established
      // year — then newest-first for an exact tie.
      if (b.nominees.length !== a.nominees.length) return b.nominees.length - a.nominees.length;
      if (b.allMovies.length !== a.allMovies.length) return b.allMovies.length - a.allMovies.length;
      return Number(b.year) - Number(a.year);
    });
  }, [formattedYears, archiveSort]);

  // One stable ref callback per year (see /awards for why: an inline
  // `ref={(el) => ...}` gets a new identity every render, causing React to
  // detach/re-attach it each time, re-observing the arrival observer's
  // one-shot target on every render — an infinite update-depth loop once
  // the year explorer is open).
  const yearRefCallbacksRef = useRef<Record<string, (element: HTMLDivElement | null) => void>>({});
  const getYearContainerRef = useCallback((year: string) => {
    if (!yearRefCallbacksRef.current[year]) {
      yearRefCallbacksRef.current[year] = (element: HTMLDivElement | null) => {
        if (yearElementsRef.current[year] === element) return;
        yearElementsRef.current[year] = element;
        if (!element) return;
        observerRef.current?.observe(element);
        spyObserverRef.current?.observe(element);
        arrivalObserverRef.current?.observe(element);
      };
    }
    return yearRefCallbacksRef.current[year];
  }, []);

  const scrollToYear = useCallback(
    (year: number) => {
      setVisibleYears((prev) => {
        const next = new Set(prev);
        Object.keys(yearElementsRef.current).forEach((y) => next.add(y));
        return next.size === prev.size ? prev : next;
      });
      setArrivedYears((prev) => (prev.has(String(year)) ? prev : new Set(prev).add(String(year))));

      const yearKey = String(year);
      const behavior = reducedMotion ? "auto" : "smooth";

      // Making every year visible above swaps a lot of 600px placeholders for
      // real EditableYearSection content — each one fetches its own saved
      // award and settles its true height on its own schedule, well after
      // this fires. The more years sit above the target, the more sections
      // are still resizing after a single scrollIntoView call, so the initial
      // aim drifts further the deeper the jump (barely-there for nearby
      // years, way off for something like 1986). Re-aim (snapping, not
      // animating, so corrections don't fight the initial smooth scroll)
      // whenever the page's height changes for a beat after the jump.
      let firstAlign = true;
      const align = () => {
        yearElementsRef.current[yearKey]?.scrollIntoView({
          behavior: firstAlign ? behavior : "auto",
          block: "start",
        });
        firstAlign = false;
      };

      align();

      const ro = new ResizeObserver(align);
      ro.observe(document.body);
      window.setTimeout(() => ro.disconnect(), 2000);
    },
    [reducedMotion]
  );

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

  const handleUpdateMovieRanking = useCallback(
    (movieId: string, updates: { seen_it?: boolean; ranking?: number | null }) => {
      void updateMovieRanking(movieId, updates);
    },
    [updateMovieRanking]
  );

  // For returning users: search picks open movie detail modal, not the YearExplorer
  const handleOpenMovieDetail = useCallback((movie: Movie) => {
    setSuggestedQuery(undefined);
    setSelectedSearchMovie(movie);
  }, []);

  // A user is "genuinely new" if they have no ratings yet — guest or authenticated.
  // New users get the Watch → Rate modal. Returning users (including guests who have
  // already rated films) get the detail modal so they can continue where they left off.
  const isNewUser = useMemo(
    () => !movies.some((m) => typeof m.rankings?.[0]?.ranking === "number"),
    [movies]
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
      void updateMovieRanking(String(movieId), { seen_it: true });
    },
    [updateMovieRanking]
  );

  const handleOnboardingRate = useCallback(
    (movieId: string | number, rating: number) => {
      void updateMovieRanking(String(movieId), { ranking: rating });
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

  // Year timeline observers (ported from /awards) — visibility windowing so
  // 100+ year sections don't all mount at once, scrollspy for the sticky
  // scrubber, and a one-shot arrival reveal per year.
  useEffect(() => {
    if (typeof window === "undefined") return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const year = entry.target.getAttribute("data-year");
          if (year && entry.isIntersecting) {
            setVisibleYears((prev) => (prev.has(year) ? prev : new Set(prev).add(year)));
          }
        });
      },
      { rootMargin: "400px", threshold: 0 }
    );

    spyObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const year = entry.target.getAttribute("data-year");
          if (year && entry.isIntersecting) {
            setActiveScrollYear(Number(year));
          }
        });
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: 0 }
    );

    arrivalObserverRef.current = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          const year = entry.target.getAttribute("data-year");
          if (year && entry.isIntersecting) {
            setArrivedYears((prev) => (prev.has(year) ? prev : new Set(prev).add(year)));
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -18% 0px", threshold: 0.05 }
    );

    Object.values(yearElementsRef.current).forEach((el) => {
      if (!el) return;
      observerRef.current?.observe(el);
      spyObserverRef.current?.observe(el);
      arrivalObserverRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
      spyObserverRef.current?.disconnect();
      arrivalObserverRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    // The lift-away stack effect is decorative — skip for reduced-motion.
    if (reducedMotion) return;

    let mounted = true;
    let cleanup = () => {};

    (async () => {
      const [{ gsap: gsapModule }, { ScrollTrigger: ScrollTriggerModule }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);

      if (!mounted) return;

      gsapModule.registerPlugin(ScrollTriggerModule);

      // Must follow the RENDERED order, not the chronological one — each
      // trigger animates the element visually above it, so a strength-sorted
      // archive would otherwise pair every year with the wrong neighbour.
      const orderedElements = sortedYears
        .map((yearData) => yearElementsRef.current[yearData.year])
        .filter((el): el is HTMLDivElement => Boolean(el));

      const triggers = orderedElements.slice(1).map((currentEl, index) => {
        const prevEl = orderedElements[index];
        return ScrollTriggerModule.create({
          trigger: currentEl,
          start: "top 72%",
          end: "top 40%",
          onEnter: () => {
            gsapModule.to(prevEl, { y: -26, scale: 0.985, duration: 0.35, ease: "power2.out" });
          },
          onLeaveBack: () => {
            gsapModule.to(prevEl, { y: 0, scale: 1, duration: 0.35, ease: "power2.out" });
          },
        });
      });

      cleanup = () => {
        triggers.forEach((trigger) => trigger.kill());
        gsapModule.set(orderedElements, { clearProps: "transform" });
      };

      ScrollTriggerModule.refresh();
    })();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [sortedYears, reducedMotion]);

  // The guest scroll-progress rail and its panel-tracking observer lived here.
  // Both are gone with the funnel cut to three panels: a dot rail is a
  // long-scroll website affordance, and it never fully worked anyway — the
  // first entry, "panel-premise", has no element to observe, so its dot was
  // permanently dead. See docs/design/logged-out-native-home.md.

  // Year leaders from rated movies
  const ratedMovies = useMemo(
    () => movies.filter((m) => typeof m.rankings?.[0]?.ranking === "number" && m.rankings[0].ranking >= 1),
    [movies]
  );
  const tasteProfile = useMemo(() => buildTasteProfile(ratedMovies), [ratedMovies]);
  const yearLeaders = useMemo(() => getYearLeaders(ratedMovies), [ratedMovies]);

  // ── Native logged-out screen inputs ────────────────────────────────────
  // The returning-guest state leads with the user's own progress instead of
  // re-pitching them, so it needs two things: the year closest to setting a
  // ballot, and their strongest forming ballot to render.

  /** Closest-to-set year (1–4 nominees), nearest first. Null when none apply. */
  const nativeNextYear = useMemo<NativeNextYear | null>(() => {
    const candidates = yearLeaders
      .filter((yl) => yl.nomineeCount > 0 && yl.nomineeCount < 5)
      .sort((a, b) => b.nomineeCount - a.nomineeCount);
    const closest = candidates[0];
    return closest
      ? { year: closest.year, remaining: 5 - closest.nomineeCount }
      : null;
  }, [yearLeaders]);

  /**
   * Ledger state for the native logged-out screen (Act 1 of
   * docs/design/first-rating-payoff.md).
   *
   * Gated: `nativeLedgerYear` is null until the guest actually has a pick, so
   * `useAcademyPickForYear` never fires on a cold open — first paint stays on
   * the `ACADEMY_REFERENCE` constant with no round trip.
   *
   * While the fetch is in flight the empty constant ledger keeps rendering, so
   * a guest who rates a much older film sees the default year briefly before it
   * re-keys. The settle animation covers it. If that ever reads badly, the fix
   * is a per-year placeholder, not removing the gate.
   */
  /** Their most-formed year, as AwardCard data. Reuses the archive's own shape. */
  const nativeTopBallot = useMemo<NativeTopBallot | null>(() => {
    const best = [...formattedYears].sort(
      (a, b) => b.nominees.length - a.nominees.length
    )[0];
    if (!best?.winner) return null;
    return {
      year: Number(best.year),
      winnerTitle: best.winner.title,
      winnerPoster: best.winner.poster_url,
      winnerMovieId: best.winner.id,
      nomineeCount: best.nominees.length,
    };
  }, [formattedYears]);

  const academyForLedger = useAcademyPickForYear(
    isGuest ? (nativeTopBallot?.year ?? null) : null,
    movies
  );

  /** Empty until both their pick and that year's Academy winner have resolved. */
  const nativeLedger = useMemo<NativeLedgerState>(() => {
    const empty = { academy: ACADEMY_REFERENCE, yours: null, agreed: false };
    if (!nativeTopBallot || !academyForLedger) return empty;
    return {
      academy: academyForLedger.reference,
      yours: {
        title: nativeTopBallot.winnerTitle,
        posterUrl: nativeTopBallot.winnerPoster ?? "",
      },
      agreed:
        academyForLedger.movieId != null &&
        String(academyForLedger.movieId) === String(nativeTopBallot.winnerMovieId),
    };
  }, [nativeTopBallot, academyForLedger]);

  // ── Actionable years — years where the user has an unrated-but-seen film
  // or a watchlisted film, i.e. a real next step. A forming year with no
  // actionable film left isn't "unfinished," it's just capped by what the
  // user has watched — the homepage shouldn't nag about it. ──
  const { watchlistMovieIds } = useWatchlistContext();
  const actionableYears = useMemo(() => {
    const years = new Set<number>();
    for (const m of movies) {
      const seenUnrated = m.rankings?.[0]?.seen_it && (m.rankings[0].ranking == null || m.rankings[0].ranking < 1);
      if (seenUnrated || watchlistMovieIds.has(m.id)) years.add(m.release_year);
    }
    return years;
  }, [movies, watchlistMovieIds]);

  // ── Smart list alerts (P2-d) — lightweight "you have enough for a list"
  // nudges. The full Ready-Made rail lives on /lists now. ──
  const smartAlerts = useSmartListAlerts(movies);
  // Alerts that are actually available now, not "you're close". smartAlerts
  // mixes both (nearMiss: true = not there yet), so gating the home nudge on
  // smartAlerts.length meant a user whose every alert was a near-miss still
  // saw a "Ready-made lists" chip — a headline promising lists that exist,
  // pointing at a page with none ready. Near-misses still render once the
  // gate opens; with thresholds aligned to that page they now correspond to
  // its "almost" section rather than to nothing at all.
  const unlockedSmartAlerts = useMemo(
    () => smartAlerts.filter((alert) => !alert.nearMiss),
    [smartAlerts]
  );

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

  // New requires BOTH 0 years touched AND < 5 rated (CLAUDE.md "Homepage
  // states") — hasStartedBallots alone flips true after a single rating
  // (any rated movie belongs to some year), so without the ratedMovies arm
  // a user with 1-4 ratings in one year skips straight to "building" a
  // state early for someone who's barely engaged yet.
  const isNewUserState = !hasStartedBallots || ratedMovies.length < 5;
  const userState: "new" | "building" | "established" | "mature" = isNewUserState
    ? "new"
    : isMature
    ? "mature"
    : isEstablished
    ? "established"
    : "building";

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
  // Gated by !isMature: this is a one-time "crossing the threshold" moment,
  // not a permanent fixture. Without this, any account that reaches the
  // threshold and never happens to click the dismiss (X) — including
  // long-established accounts with a dozen+ set ballots — would see "your
  // first award" forever, since the localStorage flag only ever tracks
  // whether the X was clicked, not whether the crossing actually just
  // happened. A mature account has unambiguously moved well past "first."
  const showFirstAwardMoment =
    !isMature && setBallotCount >= 1 && firstSetBallotYear !== null && !firstAwardDismissed;
  const dismissFirstAwardMoment = useCallback(() => {
    setFirstAwardDismissed(true);
    if (typeof window !== "undefined" && firstAwardSeenKey) {
      localStorage.setItem(firstAwardSeenKey, "true");
    }
  }, [firstAwardSeenKey]);

  // ── "Finish what you started" / "Try another year" — two DISTINCT tiers,
  // not one combined list. The Established lead's job (PRODUCT_DESIGN_
  // PRINCIPLES.md): "You have a {year} ballot. What's next?"
  //  1. actionableFormingYears — years touched but not set (1–4 nominees)
  //     with an actionable next film (see `actionableYears`), closest-to-
  //     set first. This is real unfinished work and outranks Ready-made
  //     lists in the priority slot below.
  //  2. freshYearSuggestions — canonical SUGGESTED_YEARS never touched at
  //     all. This is a discovery invitation, not unfinished work, so it
  //     ranks BELOW Ready-made lists: a veteran who has already touched
  //     every suggested year doesn't need "try another year" outranking a
  //     genuinely relevant Ready-made-lists nudge.
  const actionableFormingYears = useMemo(() => {
    return yearLeaders
      .filter((yl) => yl.nomineeCount > 0 && yl.nomineeCount < 5 && actionableYears.has(yl.year))
      .sort((a, b) => (5 - a.nomineeCount) - (5 - b.nomineeCount))
      .map((yl) => yl.year)
      .slice(0, 3);
  }, [yearLeaders, actionableYears]);
  const freshYearSuggestions = useMemo(() => {
    const touchedYears = new Set(yearLeaders.map((yl) => yl.year));
    return SUGGESTED_YEARS.filter((y) => !touchedYears.has(y)).slice(0, 3);
  }, [yearLeaders]);

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
  // `isNative === null` is included because the guest branch renders two
  // completely different surfaces depending on it — resolving it one tick
  // later would flash the web funnel inside the native shell on every cold
  // start. It settles in the same effect pass as auth, so this costs nothing.
  const dataStillLoading = authStatus === "loading" || isNative === null || (!authChecked && isAuthenticated) || (isAuthenticated && (loading || awardsLoading));
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
        <div className="max-w-lg px-6 py-8 text-center border rounded-2xl border-red-500/20 bg-red-500/5 backdrop-blur-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-300">Fetch failure</p>
          <h2 className="mt-3 text-2xl text-white font-unbounded">We couldn&apos;t load your homepage state.</h2>
          <p className="mt-3 text-sm text-gray-300">
            Authentication resolved, but the session-backed homepage data did not load. Please refresh and try again.
          </p>
        </div>
      </div>
    );
  }

  // Canonical ballots count for the guest signup-banner messaging — a year
  // "sets" once it has 5+ nominees.
  const canonicalYearCount = formattedYears.filter((y) => y.nominees.length >= 5).length;

  return (
    <div className="home-shell">
      {showGuestPanels && isNative ? (
        /* ══════════════════════════════════════════════════════════
           NATIVE GUEST — one activation screen, no funnel.
           They already downloaded the app; re-selling them the decision
           they've made costs six viewport-heights and breaks
           PROJECT_CONTEXT.md §5. See docs/design/logged-out-native-home.md.
           ═══════════════════════════════════════════════════════ */
        <NativeGuestHome
          reducedMotion={reducedMotion}
          onSelectMovie={handleSelectMovie}
          ratedCount={ratedMovies.length}
          nextYear={nativeNextYear}
          topBallot={nativeTopBallot}
          ledger={nativeLedger}
          // Breadth, not "has rated anything" — one rating used to swap the
          // whole screen out from under the ledger they'd just filled.
          showArchive={yearLeaders.length >= 2 || setBallotCount >= 1}
        />
      ) : showGuestPanels ? (
        /* ── Web guest: three-panel funnel (was six) ── */
        <>
            {/* ── Returning-guest surface: save prompt ──────────
              Gates on ratedMovies.length > 0. Returning guests see this
              before the hero so they land on context, not a marketing
              pitch they've already seen. */}
          {ratedMovies.length > 0 && !savePromptDismissed && (
            <div className="relative z-10 px-4 pt-2 pb-2">
              <Banner
                variant="gold"
                message={`You have ${ratedMovies.length} film${ratedMovies.length === 1 ? "" : "s"} rated — sign up to save them permanently.`}
                action={{ label: "Sign up free", onClick: () => router.push("/login") }}
                secondaryAction={{ label: "Sign in", onClick: () => router.push("/login") }}
                onDismiss={() => setSavePromptDismissed(true)}
              />
            </div>
          )}

          <HeroReveal reducedMotion={reducedMotion} onSelectMovie={handleSelectMovie} />

          <HowItWorksSection reducedMotion={reducedMotion} />
          <div className="pb-16 md:pb-28">
            <PanelFinalCTA
              reducedMotion={reducedMotion}
              onSelectMovie={handleSelectMovie}
            />
          </div>
        </>
      ) : (
        /* ══════════════════════════════════════════════════════════
           LOGGED-IN USER: New, Building, or Established dashboard
           ═══════════════════════════════════════════════════════ */
        /* w-full min-w-0: flex item of AppShell's <main> — without min-w-0,
           MuseumYearTimeline's flex-shrink-0 year chips propagate intrinsic
           width up and inflate the page past the viewport on mobile. */
        <div className="w-full min-w-0 pt-6 pb-24">

    {/* ═══════════════════════════════════════════════════════
        NEW STATE — onboarding prepends the logged-in homepage
        Show: onboarding/search → shared rows below
        ═══════════════════════════════════════════════════ */}
    {userState === "new" && (
      <div className="pb-10">
        {onboardingFlow.shouldShow ? (
          <LoggedInOnboardingExperience
            stage={onboardingFlow.stage}
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
        HAS STARTED BALLOTS — the full editable year archive.
        Building, Established and Mature all render the same surface now:
        onboarding (if still shown) → first-award moment → welcome + next-
        year chips + search → alerts → coach → scrubbable editable timeline
        (ported from /awards) → guest signup nudges.
        ═══════════════════════════════════════════════════ */}
    {userState !== "new" && (
      <>
        {onboardingFlow.shouldShow && (
          <LoggedInOnboardingExperience
            stage={onboardingFlow.stage}
            suggestedQuery={suggestedQuery}
            onSelectMovie={handleOpenMovieDetail}
            onSuggestedQuery={setSuggestedQuery}
            onShowHowItWorks={() => scrollToElementById("logged-in-onboarding-steps", reducedMotion)}
            onDismiss={dismissOnboarding}
          />
        )}

        {/* ─── Priority nudge — at most one line, chosen by relevance ───────
            Each candidate must earn its place for THIS user right now, not
            render on a fixed per-tier checklist (PRODUCT_DESIGN_PRINCIPLES.md
            "Nudges earn their place"). Priority order:
              1. First-award moment — one-time crossing into Established,
                 never shown once !isMature is false. Persistent-on-canvas,
                 dismissible, never a toast.
              2. Finish what you started — real unfinished work: years with
                 an actionable next film (`actionableYears`). Outranks
                 Ready-made lists because it's actionable now.
              3. Ready-made lists — withheld until Established, so a
                 coincidental early streak on one director doesn't read as
                 a pattern before it is one.
              4. Try another year — a discovery invitation for a never-
                 touched year, lowest priority: a veteran who's touched
                 every suggested year doesn't need this outranking #3, and
                 a user with nothing else eligible still gets an invite
                 instead of an empty strip. ─────────────────────────────── */}
        {showFirstAwardMoment ? (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-gold-500/40 bg-gold-500/5 backdrop-blur-sm px-4 py-3">
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
              className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-gray-200 active:scale-95"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : actionableFormingYears.length > 0 ? (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-gray-500">Finish what you started</span>
            {actionableFormingYears.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setEditingYear(Number(year))}
                className="inline-flex items-center gap-1 rounded-full border border-gold-500/30 bg-gold-500/[0.06] px-3 py-1.5 font-unbounded text-xs font-semibold text-gold-300 hover:border-gold-500/50 hover:bg-gold-500/[0.12] transition-colors"
              >
                {year}
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : isEstablished && !onboardingFlow.shouldShow && unlockedSmartAlerts.length > 0 ? (
          <div className="mb-6">
            <Link
              href="/lists/ready-made"
              className="sm:hidden inline-flex items-center gap-1.5 rounded-full border border-gold-500/30 bg-gold-500/[0.06] px-3 py-1.5 font-unbounded text-xs font-semibold text-gold-300 hover:border-gold-500/50 hover:bg-gold-500/[0.12] transition-colors"
            >
              Ready-made lists
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </Link>
            <div className="hidden sm:flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-gray-500">Ready-made lists</span>
              {smartAlerts.slice(0, 4).map((alert) => {
                const alertKey = `${alert.type}:${alert.label}`;
                const remaining = alert.threshold - alert.count;
                const chipLabel = alert.nearMiss
                  ? `${remaining} more ${alert.label}`
                  : `${alert.label} (${alert.count})`;
                return (
                  <Link
                    key={alertKey}
                    href="/lists/ready-made"
                    className="inline-flex items-center gap-1 rounded-full border border-gold-500/30 bg-gold-500/[0.06] px-3 py-1.5 font-unbounded text-xs font-semibold text-gold-300 hover:border-gold-500/50 hover:bg-gold-500/[0.12] transition-colors"
                  >
                    {chipLabel}
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </Link>
                );
              })}
              {smartAlerts.length > 4 && (
                <Link
                  href="/lists/ready-made"
                  className="text-xs text-gray-500 hover:text-gold-300 transition-colors"
                >
                  +{smartAlerts.length - 4} more
                </Link>
              )}
            </div>
          </div>
        ) : freshYearSuggestions.length > 0 ? (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-gray-500">Try another year</span>
            {freshYearSuggestions.map((year) => (
              <Link
                key={year}
                href={`/onboarding/${year}`}
                className="inline-flex items-center gap-1 rounded-full border border-gold-500/30 bg-gold-500/[0.06] px-3 py-1.5 font-unbounded text-xs font-semibold text-gold-300 hover:border-gold-500/50 hover:bg-gold-500/[0.12] transition-colors"
              >
                {year}
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : null}

        {/* ─── Welcome + search ─── search and sort share one compact row,
            same footprint as the search+filters row on /rankings, instead
            of a full-width hero search plus a separate labeled sort row. */}
        <section className="mb-6">
          <h1 className="mb-3 text-2xl sm:text-3xl font-bold text-white font-unbounded tracking-tight">
            Welcome back
            {user?.user_metadata?.username ? `, ${user.user_metadata.username}` : ""}.
          </h1>
          <div className="flex items-center gap-2 max-w-3xl">
            <div className="flex-1 min-w-0">
              <MovieSearchPicker
                onSelect={handleOpenMovieDetail}
                placeholder="Search for a film you've watched"
                variant="compact"
                suggestedQuery={suggestedQuery}
              />
            </div>
            {/* Funnel icon → popover, same pattern as MovieFilters' compact
                Filters button on /rankings and /films (icon-only, badge dot
                when non-default), sized for this page's one binary choice
                instead of that component's full sort/group/view modal. */}
            {formattedYears.length > 1 && (
              <div ref={sortMenuRef} className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSortMenu((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={showSortMenu}
                  aria-label="Sort the archive"
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white active:scale-95"
                >
                  <Filter className="w-4 h-4" />
                  {archiveSort !== "chronological" && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-gold-400" aria-hidden="true" />
                  )}
                </button>
                {showSortMenu && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-white/10 bg-charcoal-900/95 p-1 shadow-2xl backdrop-blur-xl"
                  >
                    {(
                      [
                        { value: "chronological", label: "Newest first" },
                        { value: "strength", label: "Strongest first" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        role="menuitemradio"
                        aria-checked={archiveSort === opt.value}
                        onClick={() => {
                          handleArchiveSortChange(opt.value);
                          setShowSortMenu(false);
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-200 transition-colors hover:bg-white/5"
                      >
                        {opt.label}
                        {archiveSort === opt.value && <Check className="h-3.5 w-3.5 text-gold-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            THE ARCHIVE — sticky year scrubber + every year's editable
            ballot, ported straight from /awards. This is the surface;
            Home doesn't preview it anymore, it IS it.
            ═══════════════════════════════════════════════════ */}
        <div className={isGuest ? "pb-32" : ""}>
          {formattedYears.length > 1 && (
            // No background here at all — MuseumYearTimeline's own tokens
            // are already opaque, so this wrapper doesn't need a panel
            // behind them (and can't look "off" the way a translucent one
            // did). Just sticky positioning + breathing room.
            <div className="sticky top-[var(--header-height,calc(4.3rem+env(safe-area-inset-top)))] z-30 pt-2 mb-4 [&>div]:mb-0">
              <MuseumYearTimeline
                years={formattedYears.map((y) => ({
                  year: Number(y.year),
                  nomineeCount: y.nominees.length,
                }))}
                // Falls back to whatever the archive actually leads with, so
                // the highlighted chip matches the top of the list in both
                // sort modes rather than always pointing at the newest year.
                activeYear={activeScrollYear ?? Number(sortedYears[0].year)}
                onSelectYear={scrollToYear}
                showSubLabel={false}
              />
            </div>
          )}
          {sortedYears.map((yearData) => {
            const isVisible = visibleYears.has(yearData.year);
            const hasArrived = arrivedYears.has(yearData.year);
            return (
              <div
                key={yearData.year}
                data-year={yearData.year}
                ref={getYearContainerRef(yearData.year)}
                className={`award-year-enter ${hasArrived ? "award-year-arrived" : ""}`}
                style={{
                  minHeight: isVisible ? "auto" : "600px",
                  scrollMarginTop: "calc(var(--header-height, calc(4.3rem + env(safe-area-inset-top))) + 104px)",
                }}
              >
                {isVisible ? (
                  <EditableYearSection
                    year={yearData.year}
                    winner={yearData.winner}
                    movies={yearData.nominees}
                    allMoviesForYear={yearData.allMovies}
                    category="best-picture"
                    nomineeImageMode="poster"
                    // Home always renders the signed-in user's own ballot —
                    // guard against a not-yet-signed-in/guest render the same
                    // way the page already gates elsewhere (isGuest).
                    viewerOwnsBallot={!isGuest}
                    profileUsername={isGuest ? undefined : profile?.username}
                    onEditRequest={() => setEditingYear(Number(yearData.year))}
                    // PERF-1: useUserAwards already fetched every year's
                    // award in one query above — skip this instance's own
                    // /api/awards round trip. `undefined` while that fetch
                    // is still in flight so the mount effect falls back to
                    // fetching rather than wrongly concluding "no ballot."
                    preloadedNomination={
                      awardsLoading
                        ? undefined
                        : (() => {
                            const found = awards.find((a) => a.year === Number(yearData.year));
                            return found
                              ? {
                                  nominee_ids: found.nomineeIds.map(String),
                                  winner_id: found.winnerId != null ? String(found.winnerId) : null,
                                }
                              : null;
                          })()
                    }
                  />
                ) : (
                  // Same glass-skeleton treatment [username]/awards/page.tsx
                  // uses for the identical not-yet-visible-year situation —
                  // this used to be bare "Loading {year}..." text with no
                  // skeleton at all, a real gap next to Films/Rankings'
                  // grid skeletons for the same "content not here yet" case.
                  <div className="award-editable-section dark-glass rounded-xl p-4 md:p-8" style={{ minHeight: "600px" }}>
                    <div className="flex flex-col gap-6 md:flex-row md:gap-8">
                      <div className="w-full md:w-1/3 space-y-3">
                        <div className="award-skeleton-block w-full aspect-[2/3] rounded-xl" />
                      </div>
                      <div className="hidden w-px bg-gray-700/40 md:block" />
                      <div className="w-full md:w-2/3 grid grid-cols-3 sm:grid-cols-5 gap-3">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <div key={i} className="award-skeleton-block aspect-[2/3] rounded-lg" />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* End-of-list closer — content-anchored signup nudge for guests. */}
          {isGuest && (
            <div className="mt-12 mx-auto max-w-2xl px-4 sm:px-6">
              <div className="rounded-2xl border border-gold-500/30 bg-gradient-to-b from-gold-500/[0.08] to-charcoal-900/40 px-6 py-8 text-center">
                <div className="flex justify-center mb-3">
                  <Trophy className="w-8 h-8 text-gold-300" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-white font-unbounded tracking-tight">
                  You&apos;ve built {formattedYears.length} {formattedYears.length === 1 ? "year" : "years"} of awards.
                </h2>
                <p className="mt-3 text-sm text-gray-300 leading-relaxed max-w-md mx-auto">
                  These don&apos;t auto-save.{" "}
                  {canonicalYearCount > 0 ? (
                    <>
                      Your {canonicalYearCount === 1 ? "award is" : `${canonicalYearCount} awards are`} ready — sign up to keep {canonicalYearCount === 1 ? "it" : "them"} as your collection grows.
                    </>
                  ) : (
                    <>Sign up to keep them as your collection grows.</>
                  )}
                </p>
                <div className="mt-6 flex flex-col items-center gap-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-gold-400 transition-colors"
                  >
                    Save my awards
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Guest sticky CTA — copy escalates once the guest has at least
            one canonical ballot to lose (5+ nominees in any year). */}
        {isGuest && (
          <div className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-800 bg-charcoal-900/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
            <div className="max-w-screen-xl mx-auto px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-2">
                {canonicalYearCount > 0 ? (
                  <>
                    <Trophy className="w-4 h-4 text-gold-300 flex-shrink-0" aria-hidden="true" />
                    <p className="text-sm font-semibold text-gold-200 truncate">
                      {canonicalYearCount === 1 ? (
                        <>
                          Your award is set.
                          <span className="hidden sm:inline"> Save it before you leave.</span>
                        </>
                      ) : (
                        <>
                          {canonicalYearCount} awards set.
                          <span className="hidden sm:inline"> Save them before you leave.</span>
                        </>
                      )}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-300 truncate">
                    These travel with your account. Sign up to keep them.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href="/login"
                  className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    canonicalYearCount > 0
                      ? "bg-gold-500 text-black hover:bg-gold-400"
                      : "border border-gold-500/40 bg-gold-500/10 text-gold-200 hover:bg-gold-500/15"
                  }`}
                >
                  {canonicalYearCount > 0 ? "Save my awards" : "Sign up"}
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </>
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
                        className="flex items-center gap-2 px-3 py-1.5 transition-colors rounded-full bg-gray-800/50 hover:bg-gray-800/80 border border-gray-700/40 hover:border-gray-600/60 active:scale-95"
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

          {/* Alternate Oscar History — Mature-tier only (CLAUDE.md homepage
              states table), strictly additive to the established Canon block
              above rather than replacing it. */}
          {isMature && (
            <AlternateOscarHistoryPanel
              currentUserId={userId}
              onUpdateMovie={handleUpdateMovieRanking}
            />
          )}
        </div>
    </section>
  )}

</div>
      )}

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

      {/* Edit ballot — same overlay treatment as My Awards' inline editor
          (see BallotEditorOverlay), wrapping YearExplorer instead of
          navigating to /year/[year]. Reuses data already loaded on this page
          rather than re-fetching what that route's own page component fetches
          independently. */}
      {editingYear !== null && (
        <BallotEditorOverlay onClose={() => setEditingYear(null)}>
          <YearExplorer
            year={editingYear}
            allMovies={movies}
            currentUserId={userId}
            existingAward={awards.find((a) => a.year === editingYear) ?? null}
            onCreateAward={handleCreateAwardFromExplorer}
            onUpdateMovieRanking={handleUpdateMovieRanking}
            onClose={() => setEditingYear(null)}
            hideBackButton
            isGuest={isGuest}
          />
        </BallotEditorOverlay>
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
        onSeeStanding={() => {
          // Take the user straight to this year's ballot workspace — the
          // real "where do I go to add more" surface, not a summary screen.
          const year = onboardingPickFlowMovie?.release_year;
          if (year) {
            window.location.href = `/year/${year}`;
          }
        }}
        onPickAnother={() => setOnboardingPickFlowMovie(null)}
        onClose={() => setOnboardingPickFlowMovie(null)}
      />

    </div>
  );
}

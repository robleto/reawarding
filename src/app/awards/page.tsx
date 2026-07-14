"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import EditableYearSection from "@/components/award/EditableYearSection";
import AwardsEmptyState from "@/components/award/AwardsEmptyState";
import YearExplorer from "@/components/home/YearExplorer";
import ScreenState from "@/components/ui/ScreenState";
import { useMovieDataWithGuest } from "@/utils/sharedMovieUtils";
import { useUserAwards } from "@/hooks/useUserAwards";
import { useCreateAward } from "@/hooks/useCreateAward";
import type { Movie } from "@/types/types";
import { useAuthState } from "@/hooks/useAuthState";

interface YearData {
  year: string;
  winner: Movie | undefined;
  nominees: Movie[];
  allMovies: Movie[];
}

export default function AwardsPage() {
  const { status } = useAuthState();
  const { movies, loading, isGuest, hasMounted, userId, updateMovieRanking, error: moviesError } = useMovieDataWithGuest();
  const { awards, loading: awardsLoading, error: awardsError, refetch: refetchAwards } = useUserAwards();
  const { createAward } = useCreateAward();
  const tab = "best-picture" as const;
  const [visibleYears, setVisibleYears] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const yearElementsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const [explorerYear, setExplorerYear] = useState<number | null>(null);
  const [explorerIsEditing, setExplorerIsEditing] = useState(false);
  const lastExplorerYearRef = useRef<number | null>(null);
  const [sectionRevisions, setSectionRevisions] = useState<Record<number, number>>({});

  const formattedYears = useMemo<YearData[]>(() => {
    if (!hasMounted || movies.length === 0) return [];

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

        const defaultNominees = sorted
          .filter((movie) => (movie.rankings[0]?.ranking ?? 0) >= 7)
          .slice(0, 10);

        const defaultWinner = defaultNominees.length > 0 ? defaultNominees[0] : sorted[0];

        // If the user has a saved award for this year, use its winner and nominees
        // for the initial render so the Awards page matches YearExplorer immediately
        // (before EditableYearSection's own API call completes).
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
  }, [movies, hasMounted, awards]);

  const existingAward = useMemo(() => {
    if (explorerYear == null) return null;
    return awards.find((award) => award.year === explorerYear) ?? null;
  }, [awards, explorerYear]);

  const handleCreateAward = useCallback(
    (movie: Movie) => {
      void createAward({
        id: movie.id,
        title: movie.title,
        release_year: movie.release_year,
      });
    },
    [createAward]
  );

  const handleCloseExplorer = useCallback(() => {
    if (explorerIsEditing) return;
    setExplorerYear(null);
  }, [explorerIsEditing]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const year = entry.target.getAttribute("data-year");
          if (year && entry.isIntersecting) {
            setVisibleYears((prev) => new Set(prev).add(year));
          }
        });
      },
      {
        rootMargin: "400px",
        threshold: 0,
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const yearContainerRef = useCallback((element: HTMLDivElement | null, year: string) => {
    yearElementsRef.current[year] = element;
    if (!element || !observerRef.current) return;
    observerRef.current.observe(element);
  }, []);

  useEffect(() => {
    let mounted = true;
    let cleanup = () => {};

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);

      if (!mounted) return;

      gsap.registerPlugin(ScrollTrigger);

      const orderedElements = formattedYears
        .map((yearData) => yearElementsRef.current[yearData.year])
        .filter((el): el is HTMLDivElement => Boolean(el));

      const triggers = orderedElements.slice(1).map((currentEl, index) => {
        const prevEl = orderedElements[index];
        return ScrollTrigger.create({
          trigger: currentEl,
          start: "top 72%",
          end: "top 40%",
          onEnter: () => {
            gsap.to(prevEl, { y: -26, scale: 0.985, duration: 0.35, ease: "power2.out" });
          },
          onLeaveBack: () => {
            gsap.to(prevEl, { y: 0, scale: 1, duration: 0.35, ease: "power2.out" });
          },
        });
      });

      cleanup = () => {
        triggers.forEach((trigger) => trigger.kill());
        gsap.set(orderedElements, { clearProps: "transform" });
      };

      ScrollTrigger.refresh();
    })();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [formattedYears]);

  // Track which year the explorer last opened so we know what to refresh on close
  useEffect(() => {
    if (explorerYear !== null) {
      lastExplorerYearRef.current = explorerYear;
    }
  }, [explorerYear]);

  // When explorer closes: refetch awards data AND force remount the edited section
  // so EditableYearSection re-reads fresh state from localStorage + API instead of
  // keeping its stale internal cache (hasLoadedInitialRef prevents a natural re-fetch)
  useEffect(() => {
    if (explorerYear === null && lastExplorerYearRef.current !== null) {
      const editedYear = lastExplorerYearRef.current;
      refetchAwards();
      setSectionRevisions((prev) => ({
        ...prev,
        [editedYear]: (prev[editedYear] ?? 0) + 1,
      }));
    }
  }, [explorerYear, refetchAwards]);

  // Lock body scroll when YearExplorer is open
  useEffect(() => {
    if (!explorerYear) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [explorerYear]);

  // Escape key to close explorer
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

  // Guests are first-class on /awards per the project's guest-mode mandate.
  // The page falls through to the same data flow as authed users — guests
  // with ratings see their forming/canonical awards; guests with no ratings
  // see AwardsEmptyState (existing). A sticky save-your-awards banner is
  // rendered below the gallery for guests so the signup nudge stays present
  // without blocking the payoff. Removed the auth-required ScreenState gate
  // 2026-05-12 — it was blocking the very thing the page is meant to show.

  if (loading || awardsLoading || status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-2 rounded-full border-gold-400/30 border-t-gold-400 animate-spin" />
          <p className="text-gray-300">Loading your awards…</p>
        </div>
      </div>
    );
  }

  if (moviesError || awardsError) {
    return (
      <ScreenState
        testId="screen-state-fetch-failure"
        tone="error"
        title="Couldn't load your awards"
        message="We couldn't verify your awards data, so this page is staying closed instead of falling back to defaults."
        primaryAction={{ label: "Back Home", href: "/" }}
      />
    );
  }

  if (formattedYears.length === 0) {
    return (
      <AwardsEmptyState
        onSelectMovie={(movie) => {
          updateMovieRanking(movie.id, { seen_it: true, ranking: 10 });
        }}
      />
    );
  }

  // Canonical ballots count for the guest signup-banner messaging.
  // A year "sets" once it has 5+ nominees; the sticky CTA copy escalates
  // once the guest has at least one set ballot to lose.
  const canonicalYearCount = formattedYears.filter((y) => y.nominees.length >= 5).length;

  return (
    <>
      <div className={`max-w-screen-xl mx-auto ${isGuest ? "pb-32" : ""}`}>
        {formattedYears.map((yearData) => {
          const isVisible = visibleYears.has(yearData.year);
          return (
            <div
              key={`${yearData.year}-${tab}-${sectionRevisions[Number(yearData.year)] ?? 0}`}
              data-year={yearData.year}
              ref={(el) => yearContainerRef(el, yearData.year)}
              style={{ minHeight: isVisible ? "auto" : "600px" }}
            >
              {isVisible ? (
                <EditableYearSection
                  year={yearData.year}
                  winner={yearData.winner}
                  movies={yearData.nominees}
                  allMoviesForYear={yearData.allMovies}
                  category={tab}
                  nomineeImageMode="poster"
                  onEditRequest={() => setExplorerYear(Number(yearData.year))}
                />
              ) : (
                <div className="flex items-center justify-center" style={{ minHeight: "600px" }}>
                  <div className="text-gray-400 text-sm">Loading {yearData.year}...</div>
                </div>
              )}
            </div>
          );
        })}

        {/* End-of-list closer — content-anchored signup nudge. Sits after
            the last year so the scroll has a natural ending instead of a
            sudden stop into the sticky footer. Guests only. */}
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
                <Link
                  href="/"
                  className="inline-flex items-center min-h-[44px] text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Keep going as guest
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Guest sticky CTA — payoff is on the page, the nudge sits below it.
          Copy escalates once the guest has at least one canonical ballot
          to lose (5+ nominees in any year). */}
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

      {/* YearExplorer overlay — editing happens here */}
      {explorerYear !== null && (
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
                onCreateAward={handleCreateAward}
                onUpdateMovieRanking={(movieId, updates) => updateMovieRanking(movieId, updates)}
                onClose={handleCloseExplorer}
                isGuest={isGuest}
                onEditingChange={setExplorerIsEditing}
              />
            </div>
          </div>
        </div>
      )}

    </>
  );
}

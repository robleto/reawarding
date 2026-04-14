"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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

        const savedNominees = savedAward?.nomineeIds?.length
          ? (savedAward.nomineeIds
              .map((id) => sorted.find((m) => m.id === Number(id)))
              .filter((m): m is Movie => Boolean(m)))
          : null;

        const savedWinner = savedAward?.winnerId
          ? (sorted.find((m) => m.id === Number(savedAward.winnerId)) ?? null)
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

  if (status === "unauthenticated" || isGuest) {
    return (
      <ScreenState
        testId="screen-state-auth-required"
        title="Sign in to view your awards"
        message="Your awards are built from your ratings. Sign in to see them take shape."
        primaryAction={{ label: "Sign In", href: "/login" }}
        secondaryAction={{ label: "Back Home", href: "/" }}
      />
    );
  }

  // Guest gate — resolve immediately once auth is known; don't wait on data hooks.
  // Falls through to AwardsEmptyState which has the correct guest CTA.
  if (status !== "loading" && isGuest) {
    return (
      <AwardsEmptyState
        onSelectMovie={(movie) => {
          updateMovieRanking(movie.id, { seen_it: true, ranking: 10 });
        }}
      />
    );
  }

  if (loading || awardsLoading || status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-b-2 border-blue-600 rounded-full animate-spin dark:border-blue-400" />
          <p className="text-gray-600 dark:text-gray-300">Loading your awards...</p>
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

  return (
    <>
      <div className="max-w-screen-xl mx-auto">
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
      </div>

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

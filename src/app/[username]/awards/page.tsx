"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import EditableYearSection from "@/components/award/EditableYearSection";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import type { Movie } from "@/types/types";

interface YearData {
  year: string;
  winner: Movie | undefined;
  nominees: Movie[];
  allMovies: Movie[];
}

export default function ProfileAwardsPage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";
  const { movies, loading } = usePublicProfile(username);

  const [visibleYears, setVisibleYears] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const yearElementsRef = useRef<Record<string, HTMLDivElement | null>>({});

  const formattedYears = useMemo<YearData[]>(() => {
    if (movies.length === 0) return [];

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

        return {
          year,
          winner: defaultWinner,
          nominees: defaultNominees,
          allMovies: sorted,
        };
      })
      .filter((yearData) => yearData.allMovies.length >= 1)
      .sort((a, b) => Number(b.year) - Number(a.year));
  }, [movies]);

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
      { rootMargin: "400px", threshold: 0 }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const yearContainerRef = useCallback(
    (element: HTMLDivElement | null, year: string) => {
      yearElementsRef.current[year] = element;
      if (!element || !observerRef.current) return;
      observerRef.current.observe(element);
    },
    []
  );

  // GSAP scroll animation
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
          onEnter: () => gsap.to(prevEl, { y: -26, scale: 0.985, duration: 0.35, ease: "power2.out" }),
          onLeaveBack: () => gsap.to(prevEl, { y: 0, scale: 1, duration: 0.35, ease: "power2.out" }),
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 border-b-2 border-yellow-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading awards...</p>
        </div>
      </div>
    );
  }

  if (formattedYears.length === 0) {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-semibold text-white mb-2">No awards yet</h3>
        <p className="text-gray-400 text-sm">
          @{username} hasn&apos;t created any Best Picture awards yet.
        </p>
      </div>
    );
  }

  return (
    /* w-full min-w-0: flex item of AppShell's <main> (a flex column) — without
       min-w-0, wide intrinsic children propagate their width up here and
       inflate the page past the viewport on mobile (same guard as /awards). */
    <div className="w-full min-w-0 max-w-screen-xl mx-auto">
      {formattedYears.map((yearData) => {
        const isVisible = visibleYears.has(yearData.year);
        return (
          <div
            key={yearData.year}
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
                category="best-picture"
                mode="view"
                nomineeImageMode="poster"
              />
            ) : (
              <div className="flex items-center justify-center" style={{ minHeight: "600px" }}>
                <div className="text-gray-500 text-sm">Loading {yearData.year}...</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

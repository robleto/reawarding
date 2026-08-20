"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Trophy } from "lucide-react";
import EditableYearSection from "@/components/award/EditableYearSection";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useIsProfileOwner } from "@/hooks/useIsProfileOwner";
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
  const { profile, movies, awards, loading } = usePublicProfile(username);

  // LOOP-M1/M2: this page renders ANY user's public ballot to ANY signed-in
  // visitor. EditableYearSection must only treat this as an editable, "my
  // own saved picks" surface when the viewer IS the profile owner.
  const viewerOwnsBallot = useIsProfileOwner(profile?.id);

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
        const savedNominees = savedAward?.nominee_ids?.length
          ? (savedAward.nominee_ids
              .map((id) => sorted.find((m) => String(m.id) === String(id)))
              .filter((m): m is Movie => Boolean(m)))
          : null;

        const savedWinner = savedAward?.winner_id
          ? (sorted.find((m) => String(m.id) === String(savedAward.winner_id)) ?? null)
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
    // Ownership-agnostic: viewerOwnsBallot is unconditionally false for the
    // entire loading window (usePublicProfile's `profile` stays null until
    // the same effect that flips `loading` off), so this can't branch on it.
    return (
      <div className="w-full min-w-0 max-w-screen-xl mx-auto">
        {/* award-editable-section: shares the real year sections' mobile
            full-bleed treatment (globals.css) so this placeholder doesn't
            visibly shrink/reflow once real content replaces it. */}
        <div className="award-editable-section dark-glass rounded-xl p-4 md:p-8 space-y-6">
          <div className="flex flex-col gap-6 md:flex-row md:gap-8">
            <div className="w-full md:w-1/3 space-y-3">
              <div className="award-skeleton-block w-full aspect-[2/3] rounded-xl" />
              <div className="award-skeleton-block h-3 w-2/3 mx-auto" />
            </div>
            <div className="hidden w-px bg-gray-700/40 md:block" />
            <div className="w-full md:w-2/3 grid grid-cols-3 sm:grid-cols-5 gap-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="award-skeleton-block aspect-[2/3] rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (formattedYears.length === 0) {
    return (
      <div className="w-full min-w-0 max-w-screen-xl mx-auto">
        <div className="dark-glass rounded-xl px-6 py-16 text-center">
          <Trophy className="mx-auto mb-4 h-8 w-8 text-gold-400" />
          {viewerOwnsBallot ? (
            <>
              <h3 className="text-lg font-semibold text-white mb-2">No awards yet</h3>
              <p className="text-gray-400 text-sm max-w-sm mx-auto">
                Rate a few films you loved — your first ballot starts here.
              </p>
              <Link href="/" className="mt-6 inline-block text-sm font-medium text-gold-400 hover:text-gold-300">
                Find something to rate
              </Link>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-white mb-2">No awards yet</h3>
              <p className="text-gray-400 text-sm">
                @{username} hasn&apos;t created any Best Picture awards yet.
              </p>
            </>
          )}
        </div>
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
                viewerOwnsBallot={viewerOwnsBallot}
              />
            ) : (
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
    </div>
  );
}

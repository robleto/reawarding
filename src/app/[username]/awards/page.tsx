"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Trophy } from "lucide-react";
import EditableYearSection from "@/components/award/EditableYearSection";
import MuseumYearTimeline from "@/components/home/MuseumYearTimeline";
import { AwardsTabs, CATEGORY_LABELS, type AwardsTabKey } from "@/components/award/AwardsTabs";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useIsProfileOwner } from "@/hooks/useIsProfileOwner";
import { usePrefersReducedMotion } from "@/lib/motion";
import { isEligibleForCategory } from "@/utils/categoryEligibility";
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
  const [category, setCategory] = useState<AwardsTabKey>("best-picture");
  const { profile, movies, awards, loading } = usePublicProfile(username, category);

  // LOOP-M1/M2: this page renders ANY user's public ballot to ANY signed-in
  // visitor. EditableYearSection must only treat this as an editable, "my
  // own saved picks" surface when the viewer IS the profile owner.
  const viewerOwnsBallot = useIsProfileOwner(profile?.id);

  const [visibleYears, setVisibleYears] = useState<Set<string>>(new Set());
  // Drives the year-timeline scrubber's highlighted chip — Home has this
  // same "which year is centered in view" tracking (spyObserverRef there);
  // this page had the lazy-load visibility observer but nothing driving an
  // active-year highlight, since it had no timeline to highlight anything on.
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const spyObserverRef = useRef<IntersectionObserver | null>(null);
  const yearElementsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const reducedMotion = usePrefersReducedMotion();

  const formattedYears = useMemo<YearData[]>(() => {
    if (movies.length === 0) return [];

    const moviesWithRankings = movies.filter(
      (movie) =>
        movie.rankings &&
        movie.rankings.length > 0 &&
        movie.rankings[0].ranking !== null &&
        isEligibleForCategory(movie, category)
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
  }, [movies, awards, category]);

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

    // Same "-25% 0px -60% 0px" band Home's own scrollspy uses — a year only
    // counts as active once it's crossed into the upper-middle of the
    // viewport, not the instant it appears at the bottom edge.
    spyObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const year = entry.target.getAttribute("data-year");
          if (year && entry.isIntersecting) {
            setActiveYear(Number(year));
          }
        });
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: 0 }
    );

    return () => {
      observerRef.current?.disconnect();
      spyObserverRef.current?.disconnect();
    };
  }, []);

  const yearContainerRef = useCallback(
    (element: HTMLDivElement | null, year: string) => {
      yearElementsRef.current[year] = element;
      if (!element) return;
      observerRef.current?.observe(element);
      spyObserverRef.current?.observe(element);
    },
    []
  );

  // Adapted from Home's scrollToYear: jump to the target year, then keep
  // re-aiming (snap, not animate, so it doesn't fight the initial smooth
  // scroll) for a couple seconds while lazy sections above it settle into
  // their real height — a single scrollIntoView call drifts further off
  // target the more not-yet-loaded sections sit above the jump target.
  const scrollToYear = useCallback(
    (year: number) => {
      setVisibleYears((prev) => {
        const next = new Set(prev);
        Object.keys(yearElementsRef.current).forEach((y) => next.add(y));
        return next.size === prev.size ? prev : next;
      });

      const yearKey = String(year);
      const behavior = reducedMotion ? "auto" : "smooth";
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
        <AwardsTabs value={category} onChange={setCategory} />
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
    const categoryLabel = CATEGORY_LABELS[category];
    return (
      <div className="w-full min-w-0 max-w-screen-xl mx-auto">
        <AwardsTabs value={category} onChange={setCategory} />
        <div className="dark-glass rounded-xl px-6 py-16 text-center">
          <Trophy className="mx-auto mb-4 h-8 w-8 text-gold-400" />
          {viewerOwnsBallot ? (
            <>
              <h3 className="text-lg font-semibold text-white mb-2">No {categoryLabel} awards yet</h3>
              <p className="text-gray-400 text-sm max-w-sm mx-auto">
                {category === "best-picture"
                  ? "Rate a few films you loved — your first ballot starts here."
                  : "Rate a few eligible films you loved — your first ballot starts here."}
              </p>
              <Link href="/" className="mt-6 inline-block text-sm font-medium text-gold-400 hover:text-gold-300">
                Find something to rate
              </Link>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-white mb-2">No {categoryLabel} awards yet</h3>
              <p className="text-gray-400 text-sm">
                @{username} hasn&apos;t created any {categoryLabel} awards yet.
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
      <AwardsTabs value={category} onChange={setCategory} />
      {/* Same sticky year scrubber Home uses above its own archive — this
          page rendered the identical EditableYearSection list with no
          navigation chrome at all above it. */}
      {formattedYears.length > 1 && (
        // No background — see src/app/page.tsx's identical bar for why.
        <div className="sticky top-[var(--header-height,calc(4.3rem+env(safe-area-inset-top)))] z-30 pt-2 mb-4 [&>div]:mb-0">
          <MuseumYearTimeline
            years={formattedYears.map((y) => ({
              year: Number(y.year),
              nomineeCount: y.nominees.length,
            }))}
            activeYear={activeYear ?? Number(formattedYears[0].year)}
            onSelectYear={scrollToYear}
            showSubLabel={false}
          />
        </div>
      )}
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
                category={category}
                mode="view"
                nomineeImageMode="poster"
                viewerOwnsBallot={viewerOwnsBallot}
                profileUsername={username}
                // PERF-1 (docs/audits/2026-08-21-launch-readiness-round3.md):
                // usePublicProfile already fetched every year's award above
                // (see the savedAward lookup) — skip this instance's own
                // /api/awards round trip. Safe to compute unconditionally
                // here (unlike Home): this component already returns early
                // above while `loading` is true, so `awards` is fully
                // resolved by the time this renders.
                preloadedNomination={(() => {
                  const found = awards.find((a) => a.year === Number(yearData.year));
                  return found
                    ? {
                        nominee_ids: found.nominee_ids.map(String),
                        winner_id: found.winner_id != null ? String(found.winner_id) : null,
                      }
                    : null;
                })()}
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

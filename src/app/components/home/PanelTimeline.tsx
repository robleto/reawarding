"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import AwardCard from "@/components/home/AwardCard";
import { useMotionReveal } from "@/hooks/useMotionReveal";
import { useHomePanelPosters } from "./useHomePanelPosters";

type PanelTimelineProps = {
  reducedMotion: boolean;
};

// Curated demo canon — the user's personal ReAwarded picks across decades.
// 1994 (Shawshank) and 2010 (Social Network) deliberately echo the panels above.
// AwardCard's internal getActualWinner() auto-surfaces "Over Forrest Gump"
// and "Over The King's Speech" for those two entries — free narrative payoff.
const DEMO_AWARDS = [
	{
		year: 1994,
		winnerTitle: "The Shawshank Redemption",
		winnerPoster:
			"https://image.tmdb.org/t/p/w342/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
    posterKey: "1994:shawshank",
		nomineeCount: 6,
	},
	{
		year: 1999,
		winnerTitle: "Magnolia",
		winnerPoster:
			"https://image.tmdb.org/t/p/w342/oMhFkTMSLY8kE3bYcJnqMfWIJwT.jpg",
    posterKey: "1999:magnolia",
		nomineeCount: 4,
	},
	{
		year: 2004,
		winnerTitle: "Eternal Sunshine of the Spotless Mind",
		winnerPoster:
			"https://image.tmdb.org/t/p/w342/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg",
    posterKey: "2004:eternal",
		nomineeCount: 5,
	},
	{
		year: 2007,
		winnerTitle: "There Will Be Blood",
		winnerPoster:
			"https://image.tmdb.org/t/p/w342/fa0RDkAlCec0STeMNAhPaF89q6U.jpg",
    posterKey: "2007:twbb",
		nomineeCount: 5,
	},

	{
		year: 2008,
		winnerTitle: "The Dark Knight",
		winnerPoster:
			"https://image.tmdb.org/t/p/w342/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    posterKey: "2008:tdk",
		nomineeCount: 5,
	},
	{
		year: 2010,
		winnerTitle: "The Social Network",
		winnerPoster:
			"https://image.tmdb.org/t/p/w342/n0ybibhJtQ5icDqTp8eRytcIHJx.jpg",
    posterKey: "2010:tsn",
		nomineeCount: 6,
	},
	{
		year: 2019,
		winnerTitle: "Parasite",
		winnerPoster:
			"https://image.tmdb.org/t/p/w342/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    posterKey: "2019:parasite",
		nomineeCount: 5,
	},
] as const;

export default function PanelTimeline({ reducedMotion }: PanelTimelineProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stripViewportRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const isVisible = useMotionReveal(reducedMotion, sectionRef);
  const posters = useHomePanelPosters(
    DEMO_AWARDS.map((award) => ({
      key: award.posterKey,
      title: award.winnerTitle,
      year: award.year,
      fallbackUrl: award.winnerPoster,
    }))
  );

  // Pinned scroll:
  // - mobile: vertical scroll scrubs the horizontal strip before release
  // - desktop: cards reveal one at a time
  useEffect(() => {
    if (reducedMotion) return;
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    const stripViewport = stripViewportRef.current;
    const grid = gridRef.current;
    if (!section || !grid || !stripViewport) return;

    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>("[data-award-card]")
    );
    const count = cards.length;

    const mm = gsap.matchMedia();

    mm.add("(max-width: 639px)", () => {
      gsap.set(cards, { opacity: 1, y: 0, scale: 1, clearProps: "opacity,transform" });
      cards.forEach((card) => {
        delete card.dataset.tlVisible;
      });
      gsap.set(grid, { x: 0, clearProps: "opacity" });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          pin: true,
          pinSpacing: true,
          scrub: 1,
          anticipatePin: 1,
          start: "top top",
          end: () => {
            const travel = Math.max(0, grid.scrollWidth - stripViewport.clientWidth);
            // One horizontal pass plus a brief settle at the end.
            return `+=${Math.round(Math.max(window.innerHeight * 0.95, travel + 120))}`;
          },
          invalidateOnRefresh: true,
          refreshPriority: 10,
          preventOverlaps: "home-panels",
        },
      });

      tl.to(grid, {
        x: () => {
          const travel = Math.max(0, grid.scrollWidth - stripViewport.clientWidth);
          return -travel;
        },
        ease: "none",
        duration: 0.86,
      });
      tl.to({}, { duration: 0.14 });

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
      };
    });

    mm.add("(min-width: 640px)", () => {
      gsap.set(grid, { x: 0 });
      gsap.set(cards, { opacity: 0, y: 18, scale: 0.93 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          pin: true,
          pinSpacing: true,
          scrub: 1,
          anticipatePin: 1,
          start: "top top",
          // Keep bounded to this section so it cannot linger into the next panel.
          end: () => `+=${Math.round(window.innerHeight * 1.0)}`,
          invalidateOnRefresh: true,
          refreshPriority: 10,
          preventOverlaps: "home-panels",
          onUpdate: (self) => {
            const p = self.progress;
            cards.forEach((card, i) => {
              const threshold = i / count;
              const revealed = p >= threshold;
              const wasVisible = parseFloat(card.dataset.tlVisible || "0") === 1;
              if (revealed && !wasVisible) {
                card.dataset.tlVisible = "1";
                gsap.to(card, {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  duration: 0.4,
                  ease: "power2.out",
                  overwrite: true,
                });
              } else if (!revealed && wasVisible) {
                card.dataset.tlVisible = "0";
                gsap.to(card, {
                  opacity: 0,
                  y: 18,
                  scale: 0.93,
                  duration: 0.2,
                  ease: "power2.in",
                  overwrite: true,
                });
              }
            });
          },
        },
      });

      tl.to({}, { duration: 1 });

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
      };
    });

    return () => mm.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="panel-timeline"
      data-panel-id="panel-timeline"
      className="home-panel"
      aria-labelledby="panel-timeline-heading"
    >
      <div className="home-panel__inner">
        <header className="max-w-3xl space-y-4">
          <h2
            id="panel-timeline-heading"
            className={`motion-reveal ${isVisible ? "motion-reveal--visible" : ""}`}
          >
            Build your timeline.
          </h2>
          <p
            className={`home-panel__body motion-reveal ${isVisible ? "motion-reveal--visible" : ""}`}
            style={{ transitionDelay: "120ms" }}
          >
            As you go, you create a personal run of winners across decades—your
            own evolving Academy, with receipts.
          </p>
        </header>

        {/* Award card gallery — horizontal scroll on mobile, 7-column grid on desktop */}
        <div
          ref={stripViewportRef}
          className="px-4 -mx-4 overflow-hidden sm:-mx-0 sm:px-0 sm:overflow-visible"
        >
          <div
            ref={gridRef}
            className="flex w-max gap-3 pb-3 will-change-transform sm:grid sm:w-auto sm:grid-cols-4 lg:grid-cols-7 sm:pb-0"
          >
            {DEMO_AWARDS.map((award) => (
              <div
                key={award.year}
                data-award-card=""
                className="flex-shrink-0 w-[140px] sm:w-auto snap-start"
                style={{ opacity: reducedMotion ? 1 : 0, transform: reducedMotion ? "none" : undefined }}
              >
                <AwardCard
                  year={award.year}
                  winnerTitle={award.winnerTitle}
                  winnerPoster={posters.get(award.posterKey) || award.winnerPoster}
                  nomineeCount={award.nomineeCount}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

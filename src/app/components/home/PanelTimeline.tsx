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

  // Pinned scroll — cards reveal one at a time as user scrolls
  useEffect(() => {
    if (reducedMotion) return;
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    const grid = gridRef.current;
    if (!section || !grid) return;

    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>("[data-award-card]")
    );
    const count = cards.length;

    // Start all cards invisible
    gsap.set(cards, { opacity: 0, y: 18, scale: 0.93 });

    const ctx = gsap.context(() => {
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
              // Card i reveals when progress passes i/count threshold
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

      // Minimal tween so GSAP has something to scrub
      tl.to({}, { duration: 1 });
    }, section);

    return () => ctx.revert();
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
        <div className="px-4 -mx-4 sm:-mx-0 sm:px-0">
          <div
            ref={gridRef}
            className="flex gap-3 pb-3 overflow-x-auto snap-x snap-mandatory sm:grid sm:grid-cols-4 lg:grid-cols-7 sm:overflow-visible sm:pb-0"
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

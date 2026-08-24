"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionReveal } from "@/hooks/useMotionReveal";
import { GUEST_SAVE } from "@/copy/loggedOutHome";

type PanelReassuranceProps = {
  reducedMotion: boolean;
};

const CARDS = [
  {
    stat: "Any year",
    label: "Start anywhere in Oscar history",
    sub: "From 1927 to last night.",
  },
  {
    stat: "Your call",
    label: "No right answer",
    sub: "Disagree with us. Disagree with everyone.",
  },
  {
    stat: "No login",
    label: "Start immediately",
    sub: "One film. That's all it takes.",
  },
  // Was "Forever / Your canon, on record / Your picks. Your history.
  // Permanent." — a permanence promise made to a visitor with no account,
  // which the app itself contradicts downstream ("These don't auto-save").
  // What's actually true is portability: guest ratings migrate to the account
  // on signup via useAuthMigration (wired in providers.tsx). Claim that
  // instead. See docs/design/logged-out-native-home.md.
  {
    stat: GUEST_SAVE.stat,
    label: GUEST_SAVE.label,
    sub: GUEST_SAVE.sub,
  },
];

export default function PanelReassurance({ reducedMotion }: PanelReassuranceProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const isVisible = useMotionReveal(reducedMotion, sectionRef);

  // Pinned scroll — cards reveal one at a time as user scrolls
  useEffect(() => {
    if (reducedMotion) return;
    if (window.innerWidth < 640) return; // no pin on mobile viewports
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    const grid = gridRef.current;
    if (!section || !grid) return;

    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>("[data-reassurance-card]")
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
          // Keep pin bounded to one viewport to prevent top-edge bleed from
          // the previous timeline strip on fast scroll.
          end: () => `+=${Math.round(window.innerHeight * 1.0)}`,
          invalidateOnRefresh: true,
          // Priority 8: one below YearFormationDemo (9) so this panel's spacer
          // is always measured after its predecessor — prevents cumulative
          // mis-calculation in the preventOverlaps: "home-panels" group.
          refreshPriority: 8,
          preventOverlaps: "home-panels",
          onUpdate: (self) => {
            const p = self.progress;
            cards.forEach((card, i) => {
              const threshold = i / count;
              const revealed = p >= threshold;
              const wasVisible = parseFloat(card.dataset.raVisible || "0") === 1;
              if (revealed && !wasVisible) {
                card.dataset.raVisible = "1";
                gsap.to(card, {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  duration: 0.4,
                  ease: "power2.out",
                  overwrite: true,
                });
              } else if (!revealed && wasVisible) {
                card.dataset.raVisible = "0";
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
      id="panel-reassurance"
      data-panel-id="panel-reassurance"
      className="home-panel"
      aria-labelledby="panel-reassurance-heading"
    >
      <div className="home-panel__inner">
        <header className="space-y-4 max-w-3xl">
          <h2
            id="panel-reassurance-heading"
            className={`motion-reveal ${isVisible ? "motion-reveal--visible" : ""}`}
          >
            No rules. No wrong answers.
          </h2>
          <p
            className={`home-panel__body motion-reveal ${isVisible ? "motion-reveal--visible" : ""}`}
            style={{ transitionDelay: "120ms" }}
          >
            Reawarding has no right answer. Disagree with us, with the Academy,
            with everyone. Your canon is yours.
          </p>
        </header>

        {/* Stat grid — cards reveal one at a time during pinned scroll */}
        <div ref={gridRef} className="reassurance-grid">
          {CARDS.map((card) => (
            <div
              key={card.stat}
              data-reassurance-card=""
              className="reassurance-card"
              style={{ opacity: reducedMotion ? 1 : 0, transform: reducedMotion ? "none" : undefined }}
            >
              <span className="reassurance-card__stat">{card.stat}</span>
              <span className="reassurance-card__label">{card.label}</span>
              <span className="reassurance-card__sub">{card.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

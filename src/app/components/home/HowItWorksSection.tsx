"use client";

import { useRef } from "react";
import { useMotionReveal } from "@/hooks/useMotionReveal";
import YearFormationDemo from "./YearFormationDemo";

const STEPS = [
  {
    number: 1,
    title: "Search for any movie you love.",
    body: "Start rating films naturally, as they come to mind.",
  },
  {
    number: 2,
    title: "Each rating finds its year.",
    body: "Your scores quietly shape each ballot.",
  },
  {
    number: 3,
    title: "Watch the years take form.",
    body: "Nominees and winners emerge automatically.",
  },
  {
    number: 4,
    title: "Change anything you disagree with.",
    body: "Your Academy. Your final say.",
  },
];

type HowItWorksSectionProps = {
  reducedMotion: boolean;
};

export default function HowItWorksSection({ reducedMotion }: HowItWorksSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const isVisible = useMotionReveal(reducedMotion, sectionRef);

  return (
    <section
      ref={sectionRef}
      id="panel-how-it-works"
      data-panel-id="panel-how-it-works"
      className="home-panel"
      aria-labelledby="panel-how-it-works-heading"
    >
      <div className="home-panel__inner">
        <header className="max-w-3xl space-y-4">
          <h2
            id="panel-how-it-works-heading"
            className={`motion-reveal ${isVisible ? "motion-reveal--visible" : ""}`}
          >
            How it works
          </h2>
          <p
            className={`home-panel__body motion-reveal ${isVisible ? "motion-reveal--visible" : ""}`}
            style={{ transitionDelay: "120ms" }}
          >
            Just rate movies. The rest forms around you.
          </p>
        </header>

        {/* Two-column: steps left, UI mockup right */}
        <div
          className={`hiw-layout motion-reveal ${isVisible ? "motion-reveal--visible" : ""}`}
          style={{ transitionDelay: "240ms" }}
        >
          {/* Steps */}
          <div className="hiw-steps">
            {STEPS.map((step, i) => (
              <div
                key={step.number}
                className={`hiw-step motion-reveal ${isVisible ? "motion-reveal--visible" : ""}`}
                style={{ transitionDelay: isVisible ? `${300 + i * 100}ms` : "0ms" }}
              >
                <span className="hiw-step__num" aria-hidden="true">
                  {step.number}
                </span>
                <div>
                  <p className="hiw-step__title">{step.title}</p>
                  <p className="hiw-step__body">{step.body}</p>
                </div>
              </div>
            ))}
          </div>

          <YearFormationDemo year={2010} primaryFilm="Inception" reducedMotion={reducedMotion} />
        </div>
      </div>
    </section>
  );
}

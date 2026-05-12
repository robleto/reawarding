"use client";

import { useRef } from "react";
import MovieSearchPicker from "@/components/home/MovieSearchPicker";
import { useMotionReveal } from "@/hooks/useMotionReveal";
import type { Movie } from "@/types/types";

type PanelFinalCTAProps = {
  reducedMotion: boolean;
  onSelectMovie: (movie: Movie) => void;
};

export default function PanelFinalCTA({
  reducedMotion,
  onSelectMovie,
}: PanelFinalCTAProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const isVisible = useMotionReveal(reducedMotion, sectionRef);

  return (
    <section
      ref={sectionRef}
      id="panel-final-cta"
      data-panel-id="panel-final-cta"
      className="home-panel panel-final-cta"
      aria-labelledby="panel-final-cta-heading"
    >
      <div className="home-panel__inner">
        <header className="space-y-4">
          <h2
            id="panel-final-cta-heading"
            className={`motion-reveal ${isVisible ? "motion-reveal--visible" : ""}`}
          >
            The record doesn&apos;t<br />write itself.
          </h2>
          <p
            className={`home-panel__body motion-reveal ${isVisible ? "motion-reveal--visible" : ""}`}
            style={{ transitionDelay: "120ms" }}
          >
            Start with one film. The rest follows.
          </p>
        </header>

        <div
          className={`final-cta-search-wrap motion-reveal ${isVisible ? "motion-reveal--visible" : ""}`}
          style={{ transitionDelay: "240ms" }}
        >
          <MovieSearchPicker
            onSelect={onSelectMovie}
            placeholder="Search for a film you've watched"
          />
          <p className="final-cta-microcopy">
            No account needed. Your call, your canon.
          </p>
        </div>
      </div>
    </section>
  );
}

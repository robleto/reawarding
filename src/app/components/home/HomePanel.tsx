"use client";

import { useRef, type ReactNode } from "react";
import { useMotionReveal } from "@/hooks/useMotionReveal";

type HomePanelProps = {
  id: string;
  headline: string;
  body: string;
  children?: ReactNode;
  className?: string;
  reducedMotion?: boolean;
};

export default function HomePanel({
  id,
  headline,
  body,
  children,
  className = "",
  reducedMotion = false,
}: HomePanelProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const isVisible = useMotionReveal(reducedMotion, panelRef, 0.4);

  return (
    <section
      ref={panelRef}
      id={id}
      data-panel-id={id}
      className={`home-panel ${className}`}
      aria-labelledby={`${id}-heading`}
    >
      <div className="home-panel__inner">
        <header className="max-w-3xl space-y-6">
          <h2
            id={`${id}-heading`}
            className={`motion-reveal ${isVisible ? "motion-reveal--visible" : ""}`}
          >
            {headline}
          </h2>
          <p
            className={`home-panel__body motion-reveal ${
              isVisible ? "motion-reveal--visible" : ""
            }`}
            style={{ transitionDelay: "120ms" }}
          >
            {body}
          </p>
        </header>

        {children && (
          <div
            className={`motion-reveal motion-crossfade ${isVisible ? "motion-reveal--visible" : ""}`}
            style={{ transitionDelay: "240ms" }}
          >
            {children}
          </div>
        )}
      </div>
    </section>
  );
}

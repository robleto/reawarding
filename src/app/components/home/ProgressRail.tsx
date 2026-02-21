"use client";

import { useEffect, useRef } from "react";

type Step = {
  readonly number: number;
  readonly title: string;
  readonly body: string;
};

type ProgressRailProps = {
  steps: readonly Step[];
  activeStep: number;
  reducedMotion: boolean;
};

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProgressRail({ steps, activeStep, reducedMotion }: ProgressRailProps) {
  const lineRef = useRef<HTMLDivElement>(null);

  // Update the gold fill percentage on the rail line
  useEffect(() => {
    if (!lineRef.current) return;
    const pct = steps.length <= 1 ? 0 : (activeStep / (steps.length - 1)) * 100;
    lineRef.current.style.setProperty("--fill-pct", `${pct}%`);
  }, [activeStep, steps.length]);

  return (
    <nav className="hiw-rail" aria-label="How it works steps">
      <div ref={lineRef} className="hiw-rail__line" aria-hidden="true" />
      {steps.map((step, i) => {
        const isActive = i === activeStep;
        const isDone = i < activeStep;
        return (
          <div
            key={step.number}
            className="hiw-rail__step"
            aria-current={isActive ? "step" : undefined}
          >
            <div
              className={[
                "hiw-rail__marker",
                isActive ? "hiw-rail__marker--active" : "",
                isDone ? "hiw-rail__marker--done" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-hidden="true"
            >
              {isDone && !reducedMotion ? <CheckIcon /> : step.number}
            </div>
            <div
              className={[
                "hiw-rail__label",
                isActive ? "hiw-rail__label--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="hiw-rail__title">{step.title}</span>
              <span className="hiw-rail__body">{step.body}</span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

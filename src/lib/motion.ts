"use client";

import { useEffect, useState } from "react";

export const MOTION = {
  easingPrimary: "cubic-bezier(0.22, 1, 0.36, 1)",
  easingSecondary: "cubic-bezier(0.16, 1, 0.3, 1)",
  durationMicroMs: 180,
  durationRevealMs: 700,
  durationHeroMs: 900,
  staggerMs: 120,
  revealOffsetPx: 16,
  revealScaleFrom: 0.98,
  gsapEasePrimary: "power3.out",
  gsapEaseSecondary: "power2.out",
} as const;

export function parseYearFromQuery(value: string): number | null {
  const match = value.match(/\((\d{4})\)/);
  if (!match) return null;

  const year = Number(match[1]);
  if (!Number.isInteger(year) || year < 1888 || year > 2100) return null;
  return year;
}

export function scrollToElementById(id: string, reducedMotion: boolean) {
  const element = document.getElementById(id);
  if (!element) return;

  element.scrollIntoView({
    behavior: reducedMotion ? "auto" : "smooth",
    block: "start",
  });
}

export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  return prefersReducedMotion;
}

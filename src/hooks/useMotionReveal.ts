import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Encapsulates the isVisible reveal pattern used across home panels.
 *
 * - If a `ref` is provided: watches via IntersectionObserver (fires once).
 * - If no `ref`: falls back to a short setTimeout (for above-the-fold heros).
 *
 * With reducedMotion=true, visibility is immediate with no observer or timer.
 */
export function useMotionReveal(
  reducedMotion: boolean,
  ref?: RefObject<Element | null>,
  threshold = 0.15,
): boolean {
  const [isVisible, setIsVisible] = useState(reducedMotion);

  // Keep a stable ref to the options so the effect doesn't recreate
  // unnecessarily when threshold changes (rare in practice).
  const thresholdRef = useRef(threshold);
  thresholdRef.current = threshold;

  useEffect(() => {
    if (reducedMotion) {
      setIsVisible(true);
      return;
    }

    const node = ref?.current;

    if (node) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { threshold: thresholdRef.current },
      );
      observer.observe(node);
      return () => observer.disconnect();
    }

    // No ref supplied (e.g. HomeHero above the fold) — simple delay
    const timer = setTimeout(() => setIsVisible(true), 80);
    return () => clearTimeout(timer);
  }, [reducedMotion, ref]);

  return isVisible;
}

"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { hapticLight } from "@/lib/haptics";

interface BackToTopButtonProps {
  /**
   * Returns the element to watch/scroll. Omit for ordinary pages, where the
   * window itself scrolls. Pass this for a fixed-position overlay with its
   * own internal `overflow-y-auto` container (the Collection/List/Ready-Made
   * expand overlays) — called lazily so it's safe even if the container
   * isn't mounted yet on the first render.
   */
  getContainer?: () => HTMLElement | null;
  /** px scrolled before the button appears. Defaults to one viewport height
   * — "a page or so down". */
  threshold?: number;
  className?: string;
}

export default function BackToTopButton({ getContainer, threshold, className = "" }: BackToTopButtonProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = getContainer?.();
    const target: HTMLElement | Window = container ?? window;
    const limit = threshold ?? window.innerHeight;

    const onScroll = () => {
      const scrollTop = target === window ? window.scrollY : (target as HTMLElement).scrollTop;
      setVisible(scrollTop > limit);
    };

    onScroll();
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, [getContainer, threshold]);

  const handleClick = () => {
    void hapticLight();
    const container = getContainer?.();
    (container ?? window).scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={handleClick}
          initial={{ opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 8 }}
          transition={{ duration: 0.18 }}
          aria-label="Back to top"
          title="Back to top"
          className={`fixed z-40 flex items-center justify-center w-11 h-11 rounded-full border border-white/10 bg-white/10 backdrop-blur-sm text-gray-200 shadow-lg hover:bg-white/20 hover:text-white transition-colors active:scale-95 ${className}`}
        >
          <ArrowUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

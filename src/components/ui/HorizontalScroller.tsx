"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  children: React.ReactNode;
  className?: string; // outer wrapper
  innerClassName?: string; // inner flex row
  showArrows?: boolean;
  scrollBy?: number; // px
};

// Shared horizontal scroller wrapper matching home page FYC pattern, with fades and arrows
export default function HorizontalScroller({ children, className = "", innerClassName = "", showArrows = true, scrollBy = 600 }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    const onScroll = () => updateScrollState();
    el.addEventListener("scroll", onScroll, { passive: true });
    const onResize = () => updateScrollState();
    window.addEventListener("resize", onResize);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const scroll = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * scrollBy, behavior: "smooth" });
  };

  return (
    <div className={`relative -mx-10 sm:-mx-6 px-10 sm:px-6 ${className}`}>
      {/* Arrows */}
      {showArrows && (
        <>
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scroll(-1)}
            className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-gray-800/80 border border-yellow-500/20 text-yellow-300 hover:bg-gray-700/80 ${canScrollLeft ? '' : 'opacity-0 pointer-events-none'} transition-opacity`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scroll(1)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-gray-800/80 border border-yellow-500/20 text-yellow-300 hover:bg-gray-700/80 ${canScrollRight ? '' : 'opacity-0 pointer-events-none'} transition-opacity`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      <div ref={scrollRef} className={`flex gap-4 pb-4 overflow-x-auto snap-x snap-mandatory pr-8 sm:pr-10 ${innerClassName}`}>
        {children}
      </div>
    </div>
  );
}

"use client";

import { cloneElement, useEffect, useRef, useState, type ReactElement } from "react";
import type { ReadyMadeCardProps } from "@/components/lists/ReadyMadeCard";
import ReadyMadeExpandOverlay from "@/components/lists/ReadyMadeExpandOverlay";
import type { ReadyMadeSuggestionDetailProps } from "@/components/lists/ReadyMadeSuggestionDetail";

export type ReadyMadeCategory = "directors" | "actors" | "genres" | "decades";

export type ReadyMadeSlide = {
  key: string;
  category: ReadyMadeCategory;
  // A fully server-rendered <ReadyMadeCard /> element — its primaryAction/
  // dismissForm slots hold real server-action forms, assembled server-side.
  // The carousel only overrides fillHeight/focused on a clone of it; it
  // never needs to know anything else about what's inside.
  node: ReactElement<ReadyMadeCardProps>;
  // The same suggestion, rendered as a <ReadyMadeSuggestionDetail /> — shown
  // full-screen in ReadyMadeExpandOverlay when the card above is tapped,
  // mirroring how the Lists carousel opens ListDetailView in an overlay
  // instead of navigating to a routed page.
  detailNode: ReactElement<ReadyMadeSuggestionDetailProps>;
};

const CATEGORY_LABELS: Record<ReadyMadeCategory, string> = {
  directors: "Directors",
  actors: "Actors",
  genres: "Genres",
  decades: "Decades",
};

const CATEGORY_ORDER: ReadyMadeCategory[] = ["directors", "actors", "genres", "decades"];

export default function ReadyMadeCarousel({ slides }: { slides: ReadyMadeSlide[] }) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Same measurement technique as the Lists home carousel: find whichever
  // card's rendered center is closest to the row's center, rather than
  // guessing from scroll position math.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    let raf = 0;
    const updateFocusedCard = () => {
      const cards = Array.from(row.children) as HTMLElement[];
      if (cards.length === 0) return;
      const rowRect = row.getBoundingClientRect();
      const rowCenter = rowRect.left + rowRect.width / 2;
      let closestIndex = 0;
      let closestDistance = Infinity;
      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const distance = Math.abs(cardCenter - rowCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });
      setFocusedIndex(closestIndex);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateFocusedCard);
    };
    updateFocusedCard();
    row.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      row.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [slides.length]);

  const activeCategory = slides[focusedIndex]?.category;

  const scrollToCategory = (category: ReadyMadeCategory) => {
    const index = slides.findIndex((s) => s.category === category);
    const row = rowRef.current;
    if (index === -1 || !row) return;
    const card = row.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  if (slides.length === 0) return null;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Tabs highlight whichever category is centered in the carousel below
          and jump-scroll there on tap — no page navigation, no refetch. */}
      <div className="flex-shrink-0 mb-3 flex gap-1 sm:gap-2 border-b border-gray-700 overflow-x-auto [scrollbar-width:none]">
        {CATEGORY_ORDER.map((category) => {
          const count = slides.filter((s) => s.category === category).length;
          if (count === 0) return null;
          return (
            <button
              key={category}
              type="button"
              onClick={() => scrollToCategory(category)}
              className={`px-2.5 sm:px-4 py-2.5 sm:py-3 text-sm font-medium transition-colors relative whitespace-nowrap flex-shrink-0 ${
                activeCategory === category
                  ? "text-gold-400 border-b-2 border-gold-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              {CATEGORY_LABELS[category]}
              <span className="ml-1.5 font-mono text-xs text-gray-500">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 relative overflow-visible">
        <div
          ref={rowRef}
          className="h-full flex gap-5 overflow-x-auto pb-4 pt-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
          style={{
            // Symmetric inset matching each card's width (w-[78vw] max-w-[280px])
            // so the first and last cards can scroll to a centered position too.
            paddingLeft: "calc((100% - min(78vw, 280px)) / 2)",
            paddingRight: "calc((100% - min(78vw, 280px)) / 2)",
          }}
        >
          {slides.map((slide, index) => (
            <div
              key={slide.key}
              className="h-full w-[78vw] max-w-[280px] flex-shrink-0 overflow-visible snap-center snap-always"
            >
              {cloneElement(slide.node, {
                fillHeight: true,
                focused: index === focusedIndex,
                onOpen: () => setExpandedIndex(index),
              })}
            </div>
          ))}
        </div>
      </div>

      {expandedIndex !== null && (
        <ReadyMadeExpandOverlay
          slides={slides.map((s) => ({ key: s.key, node: s.detailNode }))}
          initialIndex={expandedIndex}
          onClose={() => setExpandedIndex(null)}
        />
      )}
    </div>
  );
}

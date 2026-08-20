"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useMotionValue, animate, type PanInfo } from "framer-motion";
import { NetflixGlow } from "@/components/ui/NetflixGlow";
import BackToTopButton from "@/components/ui/BackToTopButton";
import CollectionDetailView from "@/components/collections/CollectionDetailView";
import type { UserCollectionProgress } from "@/hooks/useUserCollectionProgress";

interface CollectionExpandOverlayProps {
  collections: UserCollectionProgress[];
  userId: string | null;
  initialIndex: number;
  onClose: () => void;
  /** Forwards each slide's live seen/total counts up to the grid page, so
      its cards reflect a seen/rating change made in here immediately. */
  onProgressChange?: (collectionId: string, filmsSeen: number, totalFilms: number) => void;
}

// Same toss-to-dismiss/pager physics as ReadyMadeExpandOverlay
// (src/components/lists/ReadyMadeExpandOverlay.tsx) and ListExpandOverlay —
// kept as its own copy per that established pattern (each variant skips
// branches the others need; Collections has no edit/reorder mode, same as
// Ready-Made, so it doesn't need cloneElement injection of pre-assembled
// server-composed elements — CollectionDetailView is a plain client
// component, so slides just carry the data and render it directly).
const VERTICAL_VELOCITY_THRESHOLD = 420;
const VERTICAL_DISTANCE_RATIO = 0.22;
const AXIS_LOCK_DEADZONE = 4;
const SPRING_BACK = { type: "spring", stiffness: 380, damping: 34 } as const;
const TOSS_AWAY = { duration: 0.22, ease: "easeIn" } as const;
const ENTRANCE = { duration: 0.32, ease: "easeOut" } as const;
const PAGE_SPRING = { type: "spring", stiffness: 300, damping: 32 } as const;

export default function CollectionExpandOverlay({ collections, userId, initialIndex, onClose, onProgressChange }: CollectionExpandOverlayProps) {
  const [index, setIndex] = useState(initialIndex);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const pageWidthRef = useRef(0);
  const dismissingRef = useRef(false);
  const axisRef = useRef<"x" | "y" | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useLayoutEffect(() => {
    pageWidthRef.current = containerRef.current?.clientWidth ?? window.innerWidth;
    x.set(-index * pageWidthRef.current);
    y.set(window.innerHeight);
    animate(y, 0, ENTRANCE);
  }, []);

  useEffect(() => {
    const onResize = () => {
      pageWidthRef.current = containerRef.current?.clientWidth ?? window.innerWidth;
      x.set(-index * pageWidthRef.current);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [index]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const dismiss = () => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    animate(y, window.innerHeight + 200, TOSS_AWAY).then(() => {
      onClose();
    });
  };

  const handlePanStart = () => {
    axisRef.current = null;
  };

  const handlePan = (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (dismissingRef.current) return;

    if (axisRef.current === null) {
      if (Math.abs(info.offset.x) < AXIS_LOCK_DEADZONE && Math.abs(info.offset.y) < AXIS_LOCK_DEADZONE) return;
      axisRef.current = Math.abs(info.offset.y) > Math.abs(info.offset.x) ? "y" : "x";
    }

    if (axisRef.current === "y") {
      const activeScroll = scrollRefs.current.get(index);
      const atTop = !activeScroll || activeScroll.scrollTop <= 0;
      if (info.offset.y > 0 && atTop) {
        y.set(info.offset.y);
      }
    } else {
      const width = pageWidthRef.current || 1;
      x.set(-index * width + info.offset.x);
    }
  };

  const handlePanEnd = (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (dismissingRef.current) return;
    const axis = axisRef.current;
    axisRef.current = null;

    if (axis === "y") {
      const flung = info.velocity.y > VERTICAL_VELOCITY_THRESHOLD;
      const dragged = info.offset.y > window.innerHeight * VERTICAL_DISTANCE_RATIO;
      if (flung || dragged) {
        dismiss();
      } else {
        animate(y, 0, SPRING_BACK);
      }
      return;
    }

    if (axis === "x") {
      const width = pageWidthRef.current || 1;
      const power = info.offset.x + info.velocity.x * 0.2;
      let nextIndex = index;
      if (power < -width * 0.2) nextIndex = Math.min(index + 1, collections.length - 1);
      else if (power > width * 0.2) nextIndex = Math.max(index - 1, 0);
      setIndex(nextIndex);
      animate(x, -nextIndex * width, PAGE_SPRING);
    }
  };

  // Only the current page +/- 1 neighbor actually mounts real detail
  // content — the rest render an inert placeholder.
  const visibleRange = useMemo(
    () => ({ start: Math.max(0, index - 1), end: Math.min(collections.length - 1, index + 1) }),
    [index, collections.length]
  );

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-charcoal-900 overflow-hidden"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 16px)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <NetflixGlow />
      <div
        className="pointer-events-none absolute left-1/2 z-10 h-1 w-9 -translate-x-1/2 rounded-full bg-white/25"
        style={{ top: "calc(env(safe-area-inset-top) + 8px)" }}
      />
      <motion.div
        className="flex h-full w-full"
        style={{ x, y, touchAction: "pan-y" }}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
      >
        {collections.map((collection, i) => (
          <div
            key={collection.collectionId}
            className="h-full w-full flex-shrink-0 overflow-y-auto px-4 sm:px-6"
            ref={(el) => {
              scrollRefs.current.set(i, el);
            }}
          >
            {i >= visibleRange.start && i <= visibleRange.end ? (
              <CollectionDetailView
                collectionId={collection.collectionId}
                title={collection.title}
                description={collection.description}
                filmsSeen={collection.filmsSeen}
                totalFilms={collection.totalFilms}
                isCompleted={collection.isCompleted}
                userId={userId}
                variant="overlay"
                onRequestClose={dismiss}
                onProgressChange={
                  onProgressChange
                    ? (seen, total) => onProgressChange(collection.collectionId, seen, total)
                    : undefined
                }
              />
            ) : (
              <div className="h-full w-full animate-pulse bg-charcoal-900/60" />
            )}
          </div>
        ))}
      </motion.div>
      <BackToTopButton
        getContainer={() => scrollRefs.current.get(index) ?? null}
        className="bottom-6 right-4 sm:right-6"
      />
    </div>,
    document.body
  );
}

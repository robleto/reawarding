"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useMotionValue, animate, type PanInfo } from "framer-motion";
import ListDetailView from "@/components/list/ListDetailView";
import { NetflixGlow } from "@/components/ui/NetflixGlow";
import BackToTopButton from "@/components/ui/BackToTopButton";

type MovieList = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  updated_at: string;
  movie_count?: number;
  posterUrls?: string[];
};

interface ListExpandOverlayProps {
  lists: MovieList[];
  initialIndex: number;
  onClose: () => void;
}

// Thresholds/animation timings ported from galactic-weather's
// TossToDismiss.swift / ContentView.swift tossGesture — either the velocity or
// the distance threshold alone triggers a dismiss; below both, it springs back.
const VERTICAL_VELOCITY_THRESHOLD = 420;
const VERTICAL_DISTANCE_RATIO = 0.22; // fraction of viewport height
const AXIS_LOCK_DEADZONE = 4; // px of movement before committing to an axis
const SPRING_BACK = { type: "spring", stiffness: 380, damping: 34 } as const;
const TOSS_AWAY = { duration: 0.22, ease: "easeIn" } as const;
const ENTRANCE = { duration: 0.32, ease: "easeOut" } as const;
const PAGE_SPRING = { type: "spring", stiffness: 300, damping: 32 } as const;

export default function ListExpandOverlay({ lists, initialIndex, onClose }: ListExpandOverlayProps) {
  const [index, setIndex] = useState(initialIndex);
  const [isEditingActive, setIsEditingActive] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const pageWidthRef = useRef(0);
  const dismissingRef = useRef(false);
  // Axis committed for the in-flight gesture — reset at the start of every pan.
  const axisRef = useRef<"x" | "y" | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Position on the current page immediately (no slide-in from index 0), then
  // rise up from below like galactic-weather's pager insertion transition.
  useLayoutEffect(() => {
    pageWidthRef.current = containerRef.current?.clientWidth ?? window.innerWidth;
    x.set(-index * pageWidthRef.current);
    y.set(window.innerHeight);
    animate(y, 0, ENTRANCE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onResize = () => {
      pageWidthRef.current = containerRef.current?.clientWidth ?? window.innerWidth;
      x.set(-index * pageWidthRef.current);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Both the gesture and any explicit close affordance (the X button inside
  // ListDetailView) go through the same animated dismiss, so the overlay always
  // leaves the same way — sliding fully off-screen before actually unmounting,
  // mirroring the Swift `completion:` closure that waits for the toss to finish.
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
      // Same guard as TossToDismiss.swift: abs(translation.height) > abs(translation.width).
      axisRef.current = Math.abs(info.offset.y) > Math.abs(info.offset.x) ? "y" : "x";
    }

    if (axisRef.current === "y") {
      // Only tosses when the active page is scrolled to the top — otherwise a
      // downward drag scrolls its content instead (same boundary check bottom
      // sheet libraries like vaul use).
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
      // Swipe "power" heuristic (distance + a velocity kick) to decide which
      // way to snap, the same idea as TabView(.page)'s momentum-based paging.
      const power = info.offset.x + info.velocity.x * 0.2;
      let nextIndex = index;
      if (power < -width * 0.2) nextIndex = Math.min(index + 1, lists.length - 1);
      else if (power > width * 0.2) nextIndex = Math.max(index - 1, 0);
      setIndex(nextIndex);
      animate(x, -nextIndex * width, PAGE_SPRING);
    }
  };

  // Only the current page +/- 1 neighbor actually mounts ListDetailView (and
  // fires its Supabase fetch) — the rest render an inert placeholder, mirroring
  // galactic-weather's loadNeighborhood(around:) neighbor-only loading.
  const visibleRange = useMemo(
    () => ({ start: Math.max(0, index - 1), end: Math.min(lists.length - 1, index + 1) }),
    [index, lists.length]
  );

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-charcoal-900 overflow-hidden"
      style={{
        // This portals straight to document.body, bypassing AppShell's <main>
        // (src/components/layout/AppShell.tsx), which is what normally gives
        // every routed page its top clearance below the fixed header and its
        // env(safe-area-inset-*) handling. Approximate the same breathing
        // room here so content doesn't sit flush against the notch/edges.
        paddingTop: "calc(env(safe-area-inset-top) + 16px)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {/* Same ambient gradient wash every page sits on (mounted once in
          RootLayout) — needed again here because this container's own
          opaque background (required to fix the transparency bug where the
          Lists row page bled through) otherwise cuts the overlay off from
          it entirely, leaving a flat slab instead of the app's usual tinted
          canvas. */}
      <NetflixGlow />
      {/* Native sheet grab handle — visually documents the toss-to-dismiss
          gesture (drag down from anywhere to close), the same affordance
          iOS's own sheets use. Purely decorative, sits above the pager. */}
      <div
        className="pointer-events-none absolute left-1/2 z-10 h-1 w-9 -translate-x-1/2 rounded-full bg-white/25"
        style={{ top: "calc(env(safe-area-inset-top) + 8px)" }}
      />
      <motion.div
        className="flex h-full w-full"
        style={{ x, y, touchAction: "pan-y" }}
        onPanStart={isEditingActive ? undefined : handlePanStart}
        onPan={isEditingActive ? undefined : handlePan}
        onPanEnd={isEditingActive ? undefined : handlePanEnd}
      >
        {lists.map((list, i) => (
          <div
            key={list.id}
            className="h-full w-full flex-shrink-0 overflow-y-auto px-4 sm:px-6"
            ref={(el) => {
              scrollRefs.current.set(i, el);
            }}
          >
            {i >= visibleRange.start && i <= visibleRange.end ? (
              <ListDetailView
                listId={list.id}
                variant="overlay"
                onRequestClose={dismiss}
                onEditingChange={i === index ? setIsEditingActive : undefined}
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

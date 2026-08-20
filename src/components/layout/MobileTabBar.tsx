"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Trophy, Film, List, LineChart } from "lucide-react";
import { hapticLight } from "@/lib/haptics";

// Bottom-nav destinations are intentionally 4: Awards, Films, Rankings, Lists —
// the surfaces someone returns to daily. Home is still reachable via the
// header logo and Settings via the user-avatar menu (UserMenu.tsx), so neither
// needs a tab slot. See PRODUCT_DECISION_LOG.md for prior tab-lineup history.

// In a BROWSER tab the bar hides while scrolling down (reading room on top of
// Safari's own chrome) and reveals on any upward scroll or near the page top.
// When installed as an app (display-mode: standalone — PWA today, native
// wrapper later) there's no browser chrome to compete with, so the bar stays
// persistent per platform convention. No rework needed at app time.
function useAutoHideOnScroll(pathname: string) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const downTravel = useRef(0);

  // Route changes land at the top of a new page — always start visible.
  useEffect(() => {
    downTravel.current = 0;
    setHidden(false);
  }, [pathname]);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = Math.max(0, window.scrollY);
      const delta = y - lastY.current;
      lastY.current = y;
      if (y < 80) {
        downTravel.current = 0;
        setHidden(false);
        return;
      }
      if (delta > 0) {
        downTravel.current += delta;
        if (downTravel.current > 24) setHidden(true);
      } else if (delta < 0) {
        downTravel.current = 0;
        setHidden(false);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return hidden;
}

const TABS = [
  // "/" counts as Awards too: /awards redirects straight to / (see
  // src/app/awards/page.tsx), and Home now renders the awards showcase
  // directly, so landing on either path should light up this tab.
  { href: "/awards", label: "Awards", icon: Trophy, match: (p: string) => p === "/" || p.startsWith("/awards") },
  { href: "/films", label: "Films", icon: Film, match: (p: string) => p.startsWith("/films") },
  { href: "/rankings", label: "Rankings", icon: LineChart, match: (p: string) => p.startsWith("/rankings") },
  { href: "/lists", label: "Lists", icon: List, match: (p: string) => p.startsWith("/lists") },
];

export default function MobileTabBar() {
  const pathname = usePathname() || "/";
  const hidden = useAutoHideOnScroll(pathname);
  const tabRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number } | null>(null);

  const activeIndex = TABS.findIndex((t) => t.match(pathname));

  // Sliding active-pill indicator — the same technique HeaderNav's desktop
  // nav-bubble uses (measure the active item's rect against its parent),
  // reused here instead of inventing a second one, so the "selected" language
  // reads the same top and bottom of the app.
  useLayoutEffect(() => {
    const el = tabRefs.current[activeIndex];
    const parent = el?.parentElement;
    if (!el || !parent) {
      setPillStyle(null);
      return;
    }
    const update = () => {
      const rect = el.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      setPillStyle({ left: rect.left - parentRect.left, width: rect.width });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [activeIndex]);

  return (
    <nav
      className={`md:hidden fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 transition-transform duration-200 motion-reduce:transition-none ${
        hidden ? "translate-y-[calc(100%+2rem)]" : "translate-y-0"
      }`}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}
      aria-label="Primary"
    >
      <ul className="mobile-tab-bar relative flex w-full max-w-md items-center gap-0.5 rounded-full border border-white/10 bg-charcoal-900/75 p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        {pillStyle && (
          <div
            className="nav-bubble absolute inset-y-1.5 rounded-full transition-all duration-300 ease-out motion-reduce:transition-none"
            style={{ left: pillStyle.left, width: pillStyle.width }}
            aria-hidden="true"
          />
        )}
        {TABS.map(({ href, label, icon: Icon, match }, i) => {
          const active = match(pathname);
          return (
            <li
              key={href}
              ref={(el) => { tabRefs.current[i] = el; }}
              className="relative z-10 flex-1"
            >
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  if (!active) void hapticLight();
                }}
                className={`mobile-tab-link flex min-h-[52px] w-full flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1.5 text-[11px] font-medium transition-all active:scale-95 ${
                  active ? "text-gold-300" : "text-gray-400 hover:text-gold-200"
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform duration-300 ${active ? "scale-110" : ""}`} aria-hidden="true" />
                <span className="leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

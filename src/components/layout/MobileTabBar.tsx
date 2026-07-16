"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Trophy, Film, List, LineChart } from "lucide-react";

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

export default function MobileTabBar() {
  const pathname = usePathname() || "/";
  const hidden = useAutoHideOnScroll(pathname);

  const tabs = [
    { href: "/awards", label: "Awards", icon: Trophy, match: (p: string) => p.startsWith("/awards") },
    { href: "/films", label: "Films", icon: Film, match: (p: string) => p.startsWith("/films") },
    { href: "/rankings", label: "Rankings", icon: LineChart, match: (p: string) => p.startsWith("/rankings") },
    { href: "/lists", label: "Lists", icon: List, match: (p: string) => p.startsWith("/lists") },
  ];

  return (
    <nav
      className={`mobile-tab-bar md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-700/60 bg-charcoal-900/90 backdrop-blur supports-[backdrop-filter]:backdrop-blur transition-transform duration-200 motion-reduce:transition-none ${
        hidden ? "translate-y-full" : "translate-y-0"
      }`}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px))" }}
      aria-label="Primary"
    >
      <ul className="grid grid-cols-4">
        {tabs.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex justify-center">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`mobile-tab-link flex flex-col items-center justify-center gap-1 min-h-[56px] w-full px-2 py-2 text-xs transition-colors ${
                  active
                    ? "text-gold-300"
                    : "text-gray-400 hover:text-gold-300"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "" : "opacity-90"}`} aria-hidden="true" />
                <span className="leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

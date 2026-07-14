"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, LineChart, User } from "lucide-react";

// Bottom-nav destinations are intentionally 4. Rankings replaced Films on
// 2026-07-13 (reversing the 2026-05-09 call): the Films catalog outgrew
// browsing — search in the header is now the primary way to find a film,
// and the + button covers adding one, so the tab goes to the surface an
// invested user returns to daily. Films stays in the header hamburger menu.
// See PRODUCT_DECISION_LOG.md.

export default function MobileTabBar() {
  const pathname = usePathname() || "/";

  const tabs = [
    { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
    { href: "/awards", label: "Awards", icon: Trophy, match: (p: string) => p.startsWith("/awards") },
    { href: "/rankings", label: "Rankings", icon: LineChart, match: (p: string) => p.startsWith("/rankings") },
    { href: "/profile", label: "Profile", icon: User, match: (p: string) => p.startsWith("/profile") },
  ];

  return (
    <nav
      className="mobile-tab-bar md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-700/60 bg-charcoal-900/90 backdrop-blur supports-[backdrop-filter]:backdrop-blur"
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, Film, User } from "lucide-react";

// Bottom-nav destinations were intentionally narrowed to 4 (from the earlier
// 5-tab Home/Awards/Rank/Films/Lists shape) per Greg's call on 2026-05-09:
// Films replaces Lists because it's the entry point for adding more films
// (the engine of the Watch → Rate → ReAward loop). Profile replaces Rank
// because Rank is internal scaffolding. See the project memory.

export default function MobileTabBar() {
  const pathname = usePathname() || "/";

  const tabs = [
    { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
    { href: "/awards", label: "Awards", icon: Trophy, match: (p: string) => p.startsWith("/awards") },
    { href: "/films", label: "Films", icon: Film, match: (p: string) => p.startsWith("/films") },
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

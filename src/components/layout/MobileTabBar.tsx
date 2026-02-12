"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, LineChart, Film } from "lucide-react";

export default function MobileTabBar() {
  const pathname = usePathname() || "/";

  const tabs = [
    { href: "/awards", label: "Awards", icon: Trophy, match: (p: string) => p.startsWith("/awards") },
    { href: "/rankings", label: "Rank", icon: LineChart, match: (p: string) => p.startsWith("/rankings") },
    { href: "/films", label: "Films", icon: Film, match: (p: string) => p.startsWith("/films") },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 dark:border-gray-800 bg-white/85 dark:bg-gray-900/85 backdrop-blur supports-[backdrop-filter]:backdrop-blur"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px))" }}
      aria-label="Primary"
    >
      <ul className="grid grid-cols-3 py-2">
        {tabs.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex justify-center">
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
                  active
                    ? "text-gold"
                    : "text-gray-600 dark:text-gray-300 hover:text-gold"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "" : "opacity-90"}`} />
                <span className="leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

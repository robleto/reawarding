"use client";

import React, { useEffect } from "react";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";

type StorybookTheme = "dark" | "light";
type StorybookLayout = "fullscreen" | "padded" | "centered" | string | undefined;

interface StorybookAppFrameProps {
  children: React.ReactNode;
  theme: StorybookTheme;
  layout?: StorybookLayout;
}

function getLayoutClassName(layout: StorybookLayout): string {
  switch (layout) {
    case "centered":
      return "flex min-h-[70vh] items-center justify-center px-6 py-10";
    case "fullscreen":
      return "w-full px-4 py-8 sm:px-6 lg:px-10";
    case "padded":
    default:
      return "mx-auto w-full max-w-screen-xl px-4 py-8 sm:px-6 lg:px-10";
  }
}

export function StorybookAppFrame({
  children,
  theme,
  layout,
}: StorybookAppFrameProps) {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  return (
    <ThemeProvider forcedTheme={theme} enableSystem={false}>
      <ToastProvider>
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 transition-colors duration-300 dark:bg-gray-950 dark:text-gray-100">
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-0 opacity-90"
          >
            <div className="absolute inset-0 bg-[linear-gradient(225deg,rgba(212,175,55,0.26)_0%,rgba(212,175,55,0)_48%)] dark:bg-[linear-gradient(225deg,rgba(212,175,55,0.22)_0%,rgba(212,175,55,0)_48%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_30%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.12),transparent_30%)]" />
          </div>
          <div className="relative z-10 min-h-screen">
            <main className={getLayoutClassName(layout)}>{children}</main>
          </div>
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}

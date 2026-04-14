"use client";

import React from "react";
import Link from "next/link";

interface ScreenStateProps {
  title: string;
  message: string;
  tone?: "default" | "error";
  primaryAction?: {
    label: string;
    href: string;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
  testId?: string;
}

export default function ScreenState({
  title,
  message,
  tone = "default",
  primaryAction,
  secondaryAction,
  testId,
}: ScreenStateProps) {
  const toneClasses =
    tone === "error"
      ? "border-red-500/30 bg-red-500/10 text-red-100"
      : "border-gray-700 bg-gray-900/70 text-gray-100";

  return (
    <div className="flex flex-1 items-center w-full">
      <div
        data-testid={testId}
        className={`w-full max-w-2xl rounded-2xl border p-6 md:p-10 ${toneClasses}`}
      >
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm text-gray-300">{message}</p>
        {(primaryAction || secondaryAction) && (
          <div className="mt-6 flex flex-wrap gap-3">
            {primaryAction && (
              <Link
                href={primaryAction.href}
                className="rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-black hover:bg-yellow-400"
              >
                {primaryAction.label}
              </Link>
            )}
            {secondaryAction && (
              <Link
                href={secondaryAction.href}
                className="rounded-md border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-800"
              >
                {secondaryAction.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

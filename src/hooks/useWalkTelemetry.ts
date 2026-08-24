"use client";

import { useCallback, useRef } from "react";
import type { WalkEventName } from "@/lib/walkEventsDb";

const SESSION_KEY = "reawarding.walk.session";

/**
 * One id per browser tab/session, mirroring useLandingTelemetry's
 * resolveSessionId (src/components/landing/useLandingTelemetry.ts).
 * sessionStorage, not localStorage: "where do people quit" is a question
 * about one sitting, and this keeps that boundary consistent with how the
 * rest of the app already answers it. A guest who closes the tab and resumes
 * the walk (position itself persists via guest awards) days later gets a new
 * session id — a known, accepted imprecision, same trade the landing test
 * already makes.
 */
function resolveSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    // Private mode / blocked storage: a per-mount id still counts the event,
    // it just can't be correlated with this guest's other events.
    return crypto.randomUUID();
  }
}

export type WalkSurface = "native" | "web";

/**
 * Instrumentation for the guest year-walk — see
 * docs/design/first-rating-payoff.md, Act 2, "Instrumentation", and the
 * schema comment in 20260824000000_create_walk_events.sql.
 *
 * The year list (CONTESTED_YEARS) is an editorial guess. This is the only way
 * to learn whether it's right — which years actually earn a verdict, and
 * where sessions stop.
 */
export function useWalkTelemetry(surface: WalkSurface) {
  const sessionIdRef = useRef<string>("");
  if (!sessionIdRef.current && typeof window !== "undefined") {
    sessionIdRef.current = resolveSessionId();
  }

  return useCallback(
    (event: WalkEventName, opts?: { year?: number; position?: number }) => {
      if (typeof window === "undefined") return;
      void fetch("/api/walk/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          event,
          year: opts?.year ?? null,
          position: opts?.position ?? null,
          surface,
        }),
        // Lets the request complete even if a tap navigates away right after
        // firing — same reasoning as useLandingTelemetry's identical option.
        keepalive: true,
      }).catch(() => {
        /* fire-and-forget — analytics must never be able to break the walk */
      });
    },
    [surface]
  );
}

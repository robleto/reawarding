"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

// Shows which web build this session is actually running, plus a manual
// update check. Two jobs:
//   1. Beta testers can report "I'm on build a1b2c3d" in a bug report, so a
//      report can be tied to an exact deploy.
//   2. A visible, checkable answer to "did my change actually reach the
//      phone?" — the native shell's version in TestFlight never changes
//      when only web content is redeployed, so it can't answer that.
// NativeUpdateBridge handles this automatically on foreground; this is the
// manual escape hatch.

type CheckState = "idle" | "checking" | "current" | "updating";

export default function BuildInfo() {
  const localBuildId = process.env.NEXT_PUBLIC_BUILD_ID ?? "unknown";
  const [state, setState] = useState<CheckState>("idle");
  const [inAppShell, setInAppShell] = useState(false);

  useEffect(() => {
    setInAppShell(navigator.userAgent.includes("ReawardingApp"));
  }, []);

  const checkForUpdate = useCallback(async () => {
    setState("checking");
    try {
      const res = await fetch("/api/build-id", { cache: "no-store" });
      const data: unknown = await res.json();
      const serverBuildId = (data as { buildId?: unknown })?.buildId;

      if (typeof serverBuildId === "string" && serverBuildId !== localBuildId) {
        setState("updating");
        window.location.reload();
        return;
      }
      setState("current");
    } catch {
      setState("idle");
    }
  }, [localBuildId]);

  const shortId = localBuildId.slice(0, 7);

  return (
    <div className="mt-10 border-t border-gray-800 pt-5 text-xs text-gray-500">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span>
          Web build{" "}
          <span className="font-mono text-gray-400">{shortId}</span>
        </span>
        <span>{inAppShell ? "Running in app" : "Running in browser"}</span>

        <button
          type="button"
          onClick={checkForUpdate}
          disabled={state === "checking" || state === "updating"}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-2.5 py-1.5 text-gray-300 transition-all active:scale-[0.97] disabled:opacity-60"
        >
          <RefreshCw
            className={`h-3 w-3 ${state === "checking" ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          {state === "checking"
            ? "Checking…"
            : state === "updating"
            ? "Updating…"
            : "Check for updates"}
        </button>

        {state === "current" && (
          <span className="text-emerald-400">You&rsquo;re up to date</span>
        )}
      </div>
    </div>
  );
}

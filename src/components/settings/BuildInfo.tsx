"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Stethoscope } from "lucide-react";

// Shows which web build this session is actually running, plus a manual
// update check and a native-bridge diagnostic. Three jobs:
//   1. Beta testers can report "I'm on build a1b2c3d" in a bug report.
//   2. A visible answer to "did my change reach the phone?" — TestFlight's
//      version never changes when only web content is redeployed.
//   3. "Run diagnostics" reports what the Capacitor bridge actually says on
//      this device and fires a real haptic, so native-detection problems are
//      readable on-screen instead of guessed at.
// NativeUpdateBridge handles updates automatically on foreground; the button
// here is the manual escape hatch.

type CheckState = "idle" | "checking" | "current" | "updating";

export default function BuildInfo() {
  const localBuildId = process.env.NEXT_PUBLIC_BUILD_ID ?? "unknown";
  const [state, setState] = useState<CheckState>("idle");
  const [inAppShell, setInAppShell] = useState(false);
  const [diagnostics, setDiagnostics] = useState<string[] | null>(null);
  const [running, setRunning] = useState(false);

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

  // Deliberately calls the plugin directly, with no isNativeApp() guard, so a
  // failure surfaces its real error instead of being silently skipped.
  const runDiagnostics = useCallback(async () => {
    setRunning(true);
    const lines: string[] = [];

    lines.push(`UA: ${navigator.userAgent}`);
    lines.push(`UA has ReawardingApp: ${navigator.userAgent.includes("ReawardingApp")}`);

    try {
      const { Capacitor } = await import("@capacitor/core");
      lines.push(`isNativePlatform: ${Capacitor.isNativePlatform()}`);
      lines.push(`getPlatform: ${Capacitor.getPlatform()}`);
      lines.push(`Haptics registered: ${String(Capacitor.isPluginAvailable?.("Haptics"))}`);
    } catch (err) {
      lines.push(`@capacitor/core failed: ${String(err)}`);
    }

    try {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle.Medium });
      lines.push("haptic call: returned OK (phone should have pulsed)");
    } catch (err) {
      lines.push(`haptic call threw: ${String(err)}`);
    }

    setDiagnostics(lines);
    setRunning(false);
  }, []);

  const shortId = localBuildId.slice(0, 7);

  return (
    <div className="mt-10 border-t border-gray-800 pt-5 text-xs text-gray-500">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span>
          Web build <span className="font-mono text-gray-400">{shortId}</span>
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

        <button
          type="button"
          onClick={runDiagnostics}
          disabled={running}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-2.5 py-1.5 text-gray-300 transition-all active:scale-[0.97] disabled:opacity-60"
        >
          <Stethoscope className="h-3 w-3" aria-hidden="true" />
          {running ? "Running…" : "Run diagnostics"}
        </button>

        {state === "current" && (
          <span className="text-emerald-400">You&rsquo;re up to date</span>
        )}
      </div>

      {diagnostics && (
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-gray-800 bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-gray-300">
          {diagnostics.join("\n")}
        </pre>
      )}
    </div>
  );
}

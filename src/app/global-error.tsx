"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0f172a", color: "#f1f5f9", fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎬</p>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>Something went wrong</h1>
          <p style={{ color: "#94a3b8", marginBottom: "1.5rem", fontSize: "0.875rem" }}>The error has been reported. Try again or refresh the page.</p>
          <button
            onClick={reset}
            style={{ padding: "0.5rem 1.5rem", borderRadius: "0.5rem", background: "#2563eb", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.875rem" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

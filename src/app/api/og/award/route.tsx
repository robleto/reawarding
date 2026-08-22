import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// ── Sizes ─────────────────────────────────────────────────────────────────────
const SIZES = {
  og: { width: 1200, height: 630 },      // Standard OG / Twitter card
  square: { width: 1080, height: 1080 }, // Instagram / TikTok
} as const;

type Format = keyof typeof SIZES;

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const year = searchParams.get("year") ?? "????";
  const winner = searchParams.get("winner") ?? "—";
  const nomineesRaw = searchParams.get("nominees") ?? "";
  const username = searchParams.get("username") ?? "";
  const categoryLabel = searchParams.get("category") || "Best Picture";
  const format: Format = (searchParams.get("format") as Format) ?? "og";

  const nominees = nomineesRaw
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 5);

  const { width, height } = SIZES[format] ?? SIZES.og;
  const isSquare = format === "square";

  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          background: "#0a0a0a",
          display: "flex",
          flexDirection: "column",
          padding: isSquare ? 80 : 64,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle gold gradient accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, #f59e0b, #d97706)",
          }}
        />

        {/* Wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: isSquare ? 60 : 40,
          }}
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#f59e0b",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Reawarding
          </span>
        </div>

        {/* Year */}
        <div
          style={{
            fontSize: isSquare ? 80 : 72,
            fontWeight: 800,
            color: "rgba(255,255,255,0.15)",
            lineHeight: 1,
            marginBottom: 8,
          }}
        >
          {year}
        </div>

        {/* Category label */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#6b7280",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          {categoryLabel}
        </div>

        {/* Winner */}
        <div
          style={{
            fontSize: isSquare ? 52 : 48,
            fontWeight: 800,
            color: "#fbbf24",
            lineHeight: 1.1,
            marginBottom: isSquare ? 48 : 36,
            maxWidth: "85%",
          }}
        >
          {winner}
        </div>

        {/* Nominees */}
        {nominees.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#4b5563",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Also nominated
            </div>
            {nominees.map((n, i) => (
              <div
                key={i}
                style={{
                  fontSize: isSquare ? 22 : 20,
                  color: "#9ca3af",
                  lineHeight: 1.2,
                }}
              >
                {n}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: isSquare ? 80 : 56,
            right: isSquare ? 80 : 64,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 2,
          }}
        >
          {username && (
            <span style={{ fontSize: 14, color: "#6b7280" }}>
              @{username}
            </span>
          )}
          <span style={{ fontSize: 12, color: "#374151" }}>
            reawarding.com
          </span>
        </div>
      </div>
    ),
    { width, height }
  );
}

"use client";

import { useCallback, useState } from "react";
import {
  X,
  Download,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ShareSheetProps = {
  year: number | string;
  winner: string;
  /** Up to 5 other nominees */
  nominees?: string[];
  username?: string;
  /** Canonical URL for this ballot, e.g. "/greg/awards/2023" */
  awardUrl?: string;
  onClose: () => void;
};

// ── Platform configs ──────────────────────────────────────────────────────────

function buildShareText(year: number | string, winner: string, url: string) {
  return `My Best Picture for ${year}: ${winner}. See my full ballot → ${url} #Reawarding`;
}

function buildOgUrl(
  year: number | string,
  winner: string,
  nominees: string[],
  username: string,
  format: "og" | "square"
) {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams({
    year: String(year),
    winner,
    nominees: nominees.join(","),
    username,
    format,
  });
  return `${base}/api/og/award?${params.toString()}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ShareSheet({
  year,
  winner,
  nominees = [],
  username = "",
  awardUrl,
  onClose,
}: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const canonicalUrl =
    awardUrl
      ? `${typeof window !== "undefined" ? window.location.origin : ""}${awardUrl}`
      : typeof window !== "undefined"
      ? window.location.href
      : "";

  const shareText = buildShareText(year, winner, canonicalUrl);
  const ogUrl = buildOgUrl(year, winner, nominees, username, "og");
  const squareUrl = buildOgUrl(year, winner, nominees, username, "square");

  // ── Text platforms ────────────────────────────────────────────────────────

  const textPlatforms: { label: string; href: string; color: string }[] = [
    {
      label: "Twitter / X",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      color: "text-gray-200",
    },
    {
      label: "Bluesky",
      href: `https://bsky.app/intent/compose?text=${encodeURIComponent(shareText)}`,
      color: "text-sky-300",
    },
    {
      label: "Threads",
      href: `https://www.threads.net/intent/post?text=${encodeURIComponent(shareText)}`,
      color: "text-gray-300",
    },
    {
      label: "WhatsApp",
      href: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`,
      color: "text-green-400",
    },
    {
      label: "Messenger",
      href: `fb-messenger://share?link=${encodeURIComponent(canonicalUrl)}`,
      color: "text-blue-400",
    },
  ];

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  }, [canonicalUrl]);

  const handleDownload = useCallback(
    async (format: "og" | "square") => {
      const url = format === "square" ? squareUrl : ogUrl;
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `reawarding-${year}-${format}.png`;
      a.click();
      URL.revokeObjectURL(objectUrl);
    },
    [ogUrl, squareUrl, year]
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-700/40 bg-gray-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/60">
          <h2 className="text-sm font-semibold text-white">
            Share your {year} ballot
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-6">
          {/* OG image preview */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
              Preview
            </p>
            <div
              className={`relative rounded-xl overflow-hidden bg-gray-900 border border-gray-800 transition-opacity ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              style={{ aspectRatio: "1200/630" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ogUrl}
                alt={`${year} ballot card`}
                className="w-full h-full object-cover"
                onLoad={() => setImgLoaded(true)}
              />
            </div>
            {!imgLoaded && (
              <div className="rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center" style={{ aspectRatio: "1200/630" }}>
                <div className="h-5 w-5 rounded-full border-2 border-yellow-400/30 border-t-yellow-400 animate-spin" />
              </div>
            )}

            {/* Download buttons */}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => void handleDownload("square")}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-700/40 bg-gray-900/40 px-3 py-2 text-xs font-medium text-gray-300 hover:border-yellow-500/30 hover:text-yellow-200 transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                Square (Instagram / TikTok)
              </button>
              <button
                type="button"
                onClick={() => void handleDownload("og")}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-700/40 bg-gray-900/40 px-3 py-2 text-xs font-medium text-gray-400 hover:text-gray-200 transition-all"
                title="Download 1200×630 (Twitter/OG)"
              >
                <Download className="h-3.5 w-3.5" />
                Wide
              </button>
            </div>
          </div>

          {/* Text platforms */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
              Share a link
            </p>
            <div className="space-y-1">
              {textPlatforms.map((p) => (
                <a
                  key={p.label}
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-gray-800/50 transition-colors ${p.color}`}
                >
                  <span className="text-sm font-medium">{p.label}</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                </a>
              ))}

              {/* Copy link */}
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-gray-800/50 transition-colors text-gray-400"
              >
                <span className="text-sm font-medium">Copy link</span>
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 opacity-50" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

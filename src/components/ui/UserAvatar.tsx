"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { normalizeImageUrl } from "@/utils/imageUrl";

interface UserAvatarProps {
  imageUrl?: string | null;
  name?: string | null;
  username?: string | null;
  size?: number;
  className?: string;
  alt?: string;
}

function getInitials(name?: string | null, username?: string | null): string {
  const source = (name || username || "U").trim();
  if (!source) return "U";

  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export default function UserAvatar({
  imageUrl,
  name,
  username,
  size = 32,
  className = "",
  alt = "User avatar",
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const resolvedUrl = normalizeImageUrl(imageUrl);
  const initials = useMemo(() => getInitials(name, username), [name, username]);
  const hasSizeClass = /\bw-\S+|\bh-\S+/.test(className);
  const fontSize = Math.max(12, Math.round(size * 0.42));
  const isCompact = size <= 40;

  if (resolvedUrl && !imageFailed) {
    return (
      <Image
        src={resolvedUrl}
        alt={alt}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      aria-label={alt}
      className={`relative overflow-hidden rounded-full border border-white/60 font-semibold inline-flex items-center justify-center text-white shadow-[0_6px_20px_rgba(16,49,110,0.26)] ${className}`}
      style={
        hasSizeClass
          ? {
              fontSize,
              lineHeight: 1,
              fontWeight: 700,
              boxShadow: isCompact ? "0 2px 8px rgba(0,0,0,0.22)" : undefined,
            }
          : {
              width: size,
              height: size,
              fontSize,
              lineHeight: 1,
              fontWeight: 700,
              boxShadow: isCompact ? "0 2px 8px rgba(0,0,0,0.22)" : undefined,
            }
      }
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 22% 18%, rgba(255,255,255,0.08), transparent 42%), linear-gradient(145deg, #5a677a 0%, #4a5568 40%, #3f495c 72%, #374153 100%)",
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[3%] rounded-full border"
        style={{
          borderColor: "rgba(212,175,55,0.3)",
          opacity: isCompact ? 0 : 1,
        }}
      />
      <span
        className="relative z-10 tracking-[0.01em]"
        style={{ color: "rgba(243,244,246,0.98)", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
      >
        {initials}
      </span>
    </div>
  );
}

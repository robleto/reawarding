"use client";

import { UserPlus, UserCheck } from "lucide-react";

interface FollowButtonProps {
  targetProfileId: string;
  isFollowing: boolean;
  isOwnProfile: boolean;
  onToggle: (targetProfileId: string) => Promise<{ success: boolean; error?: string }>;
  size?: "sm" | "md";
}

export default function FollowButton({
  targetProfileId,
  isFollowing,
  isOwnProfile,
  onToggle,
  size = "md",
}: FollowButtonProps) {
  if (isOwnProfile) return null;

  const compact = size === "sm";

  return (
    // Visual chip stays sized by `compact` (px-3 py-1.5 text-xs on mobile
    // headers) — the before:-inset-y-2.5 pseudo-element pads the real
    // tappable area out to 44px+ tall on touch without enlarging the visible
    // pill. Horizontal expansion is intentionally zero (before:inset-x-0):
    // the neighboring Share Profile button sits only a gap-2 (8px) away, and
    // this pill's own text ("Follow"/"Following") already makes it far wider
    // than 44px, so there's nothing to gain by reaching sideways — only risk
    // of colliding with Share's hit-box. z-10 is defense in depth: if a
    // future edit reintroduces any horizontal overlap, taps on this button's
    // own visible pixels still resolve to Follow, not Share.
    <button
      type="button"
      onClick={() => void onToggle(targetProfileId)}
      className={`relative z-10 inline-flex items-center gap-1.5 rounded-lg border font-medium transition-all before:content-[''] before:absolute before:inset-x-0 before:-inset-y-2.5 ${
        compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
      } ${
        isFollowing
          ? "border-gray-600/40 bg-gray-800/40 text-gray-400 hover:border-red-500/30 hover:text-red-400"
          : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20"
      }`}
    >
      {isFollowing ? (
        <>
          <UserCheck className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          Following
        </>
      ) : (
        <>
          <UserPlus className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          Follow
        </>
      )}
    </button>
  );
}

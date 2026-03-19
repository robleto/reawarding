"use client";

import { UserPlus, UserCheck } from "lucide-react";

interface FollowButtonProps {
  targetProfileId: string;
  isFollowing: boolean;
  isOwnProfile: boolean;
  onToggle: (targetProfileId: string) => Promise<void>;
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
    <button
      type="button"
      onClick={() => void onToggle(targetProfileId)}
      className={`inline-flex items-center gap-1.5 rounded-lg border font-medium transition-all ${
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

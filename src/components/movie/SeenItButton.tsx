import React from "react";
import { Eye, EyeOff } from "lucide-react";

interface SeenItButtonProps {
  seenIt: boolean;
  onClick: () => void;
  watchedLabel?: string;
  unseenLabel?: string;
  className?: string;
}

export default function SeenItButton({
  seenIt,
  onClick,
  watchedLabel = "Seen It",
  unseenLabel = "Unseen",
  className = ""
}: SeenItButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 text-sm font-medium focus:outline-none ${className}`}
    >
      {seenIt ? (
        <>
          <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-blue-600 dark:text-blue-400">{watchedLabel}</span>
        </>
      ) : (
        <>
          <EyeOff className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <span className="text-gray-400 dark:text-gray-500">{unseenLabel}</span>
        </>
      )}
    </button>
  );
}

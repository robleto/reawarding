import React from "react";
import { Eye, EyeOff } from "lucide-react";

interface SeenItButtonProps {
  seenIt: boolean;
  onClick: () => void;
  showText?: boolean; // Controls whether to show text labels
  size?: 'sm' | 'md' | 'lg'; // Controls icon size
  variant?: 'default' | 'compact'; // Controls button styling
  className?: string;
}

export default function SeenItButton({
  seenIt,
  onClick,
  showText = true,
  size = 'md',
  variant = 'default',
  className = ""
}: SeenItButtonProps) {
  // Icon size based on size prop
  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4", 
    lg: "w-5 h-5"
  };

  // Base styles for different variants
  const variants = {
    default: "flex items-center gap-1 text-sm font-medium focus:outline-none",
    compact: "flex items-center justify-center p-1 rounded transition-colors focus:outline-none"
  };

  // Color styles based on seen state
  const seenStyles = seenIt 
    ? "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400";

  const compactHoverStyles = variant === 'compact' 
    ? (seenIt ? "hover:bg-blue-50 dark:hover:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800")
    : "";

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`${variants[variant]} ${seenStyles} ${compactHoverStyles} ${className}`}
      title={seenIt ? 'Mark as unseen' : 'Mark as seen'}
    >
      {seenIt ? (
        <>
          <Eye className={iconSizes[size]} />
          {showText && <span>{variant === 'compact' ? 'Seen' : 'Seen'}</span>}
        </>
      ) : (
        <>
          <EyeOff className={iconSizes[size]} />
          {showText && <span>{variant === 'compact' ? 'Unseen' : 'Unseen'}</span>}
        </>
      )}
    </button>
  );
}

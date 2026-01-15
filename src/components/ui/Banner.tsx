"use client";

import { X, LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export type BannerVariant = "gold" | "amber" | "blue" | "gray";

interface BannerProps {
  variant?: BannerVariant;
  icon?: LucideIcon;
  title?: string;
  message: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  className?: string;
}

const variantStyles: Record<BannerVariant, {
  container: string;
  icon: string;
  title: string;
  text: string;
  button: string;
  dismiss: string;
}> = {
  gold: {
    container: "bg-gray-900/60 border-yellow-500/20",
    icon: "bg-yellow-500/10 text-yellow-400",
    title: "text-yellow-300",
    text: "text-gray-200",
    button: "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30",
    dismiss: "text-yellow-400/60 hover:text-yellow-300",
  },
  amber: {
    container: "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800",
    icon: "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400",
    title: "text-amber-900 dark:text-amber-100",
    text: "text-amber-700 dark:text-amber-300",
    button: "bg-amber-600 dark:bg-amber-700 text-white hover:bg-amber-700 dark:hover:bg-amber-800",
    dismiss: "text-amber-400 hover:text-amber-600 dark:text-amber-500 dark:hover:text-amber-300",
  },
  blue: {
    container: "bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50",
    icon: "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",
    title: "text-blue-700 dark:text-blue-400",
    text: "text-gray-700 dark:text-gray-300",
    button: "bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800",
    dismiss: "text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300",
  },
  gray: {
    container: "bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700",
    icon: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
    title: "text-gray-900 dark:text-gray-100",
    text: "text-gray-600 dark:text-gray-300",
    button: "bg-gray-700 dark:bg-gray-600 text-white hover:bg-gray-800 dark:hover:bg-gray-700",
    dismiss: "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300",
  },
};

export default function Banner({
  variant = "gold",
  icon: Icon,
  title,
  message,
  action,
  secondaryAction,
  onDismiss,
  className = "",
}: BannerProps) {
  const styles = variantStyles[variant];

  return (
    <div className={`rounded-lg p-4 ${styles.container} ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          {Icon && (
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${styles.icon}`}>
              <Icon className="w-4 h-4" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            {title && (
              <p className={`font-medium text-sm mb-1 ${styles.title}`}>
                {title}
              </p>
            )}
            <div className={`text-sm ${styles.text}`}>
              {message}
            </div>
            
            {(action || secondaryAction) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {action && (
                  <button
                    onClick={action.onClick}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${styles.button}`}
                  >
                    {action.label}
                  </button>
                )}
                {secondaryAction && (
                  <button
                    onClick={secondaryAction.onClick}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${styles.container}`}
                  >
                    {secondaryAction.label}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`flex-shrink-0 p-1 rounded transition-colors ${styles.dismiss}`}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

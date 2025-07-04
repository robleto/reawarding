"use client";

import { X } from "lucide-react";

interface SavePromptBannerProps {
  visible: boolean;
  onDismiss: () => void;
  onSignUp: () => void;
}

export default function SavePromptBanner({
  visible,
  onDismiss,
  onSignUp,
}: SavePromptBannerProps) {
  if (!visible) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-blue-900 font-medium text-sm mb-1">
                Loving this? Sign up to save your Best Picture picks.
              </p>
              <p className="text-blue-700 text-xs">
                Create a free account to keep your rankings safe and access them anywhere.
              </p>
            </div>
          </div>
          <div className="mt-3 ml-13">
            <button
              onClick={onSignUp}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Create Free Account
            </button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 text-blue-400 hover:text-blue-600 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import { hasGuestInteracted } from "@/utils/guestMode";

interface GuestDataBannerProps {
  onSignupClick: () => void;
}

const BANNER_DISMISSED_KEY = "oscarworthy_banner_dismissed";

export default function GuestDataBanner({ onSignupClick }: GuestDataBannerProps) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has interacted and banner hasn't been dismissed
    const hasInteracted = hasGuestInteracted();
    const wasDismissed = localStorage.getItem(BANNER_DISMISSED_KEY) === "true";
    
    setShow(hasInteracted && !wasDismissed);
    setDismissed(wasDismissed);
  }, []);

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem(BANNER_DISMISSED_KEY, "true");
  };

  if (!show || dismissed) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 dark:border-amber-500 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-amber-400 dark:text-amber-500 mr-3" />
          <div>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-medium">Heads up!</span> Your movie ratings are stored locally and will be lost if you clear your browser data.{" "}
              <button
                onClick={onSignupClick}
                className="underline hover:no-underline font-medium text-amber-800 dark:text-amber-200 hover:text-amber-900 dark:hover:text-amber-100"
              >
                Sign up to save them permanently.
              </button>
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-amber-400 dark:text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 ml-4 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

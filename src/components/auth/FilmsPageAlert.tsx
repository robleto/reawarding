"use client";

import { useState, useEffect } from "react";
import { X, Trophy, ArrowRight } from "lucide-react";
import { hasGuestInteracted, getTotalGuestInteractions } from "@/utils/guestMode";
import Link from "next/link";

interface FilmsPageAlertProps {
  onDismiss?: () => void;
}

const FILMS_ALERT_DISMISSED_KEY = "oscarworthy_films_alert_dismissed_session";

export default function FilmsPageAlert({ onDismiss }: FilmsPageAlertProps) {
  const [show, setShow] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);

  const checkAlertStatus = () => {
    const hasInteracted = hasGuestInteracted();
    const count = getTotalGuestInteractions();
    const wasDismissed = sessionStorage.getItem(FILMS_ALERT_DISMISSED_KEY) === "true";
    
    setInteractionCount(count);
    
    // Show alert if user has interacted and hasn't dismissed it (but don't wait for signup threshold)
    setShow(hasInteracted && count > 0 && !wasDismissed);
  };

  useEffect(() => {
    checkAlertStatus();
    
    // Set up an interval to check if the alert should appear after interactions
    const interval = setInterval(checkAlertStatus, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem(FILMS_ALERT_DISMISSED_KEY, "true");
    onDismiss?.();
  };

  if (!show) return null;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-amber-900 dark:text-amber-100 mb-3">
              <span className="font-medium">Nice choices!</span> You've made {interactionCount} movie {interactionCount === 1 ? 'interaction' : 'interactions'}. 
              Want to see how they rank against each other?
            </p>
            <Link
              href="/rankings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors"
            >
              <Trophy className="w-3.5 h-3.5" />
              View Your Rankings
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={handleDismiss}
            className="text-amber-400 dark:text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors p-1"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { X, Info, Sparkles } from "lucide-react";

interface GuestWelcomeBannerProps {
  onSignupClick: () => void;
}

const WELCOME_BANNER_KEY = "oscarworthy_guest_welcome_dismissed";

export default function GuestWelcomeBanner({ onSignupClick }: GuestWelcomeBannerProps) {
  const [show, setShow] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    
    // Check if banner was previously dismissed
    const wasDismissed = localStorage.getItem(WELCOME_BANNER_KEY) === "true";
    
    if (!wasDismissed) {
      // Show banner after a brief delay for better UX
      const timer = setTimeout(() => {
        setShow(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [hasMounted]);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(WELCOME_BANNER_KEY, "true");
  };

  // Prevent hydration mismatch
  if (!hasMounted || !show) return null;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4 mb-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <Sparkles className="w-5 h-5 text-purple-500 dark:text-purple-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-1">
              Welcome to ReAwarding! 🎬
            </h3>
            <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
              You can start rating movies right away. Your picks are saved locally in your browser. 
              Create a free account anytime to sync across devices and never lose your data.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={onSignupClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Create free account
              </button>
              <button
                onClick={handleDismiss}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-800 hover:bg-purple-200 dark:hover:bg-purple-700 rounded-md transition-colors"
              >
                Got it, continue as guest
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-purple-400 dark:text-purple-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors p-1 flex-shrink-0"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

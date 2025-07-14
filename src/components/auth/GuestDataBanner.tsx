"use client";

import { useState, useEffect } from "react";
import { X, AlertTriangle, User, UserPlus } from "lucide-react";
import { hasGuestInteracted, shouldShowSignupPrompt, getGuestInteractionCount } from "@/utils/guestMode";

interface GuestDataBannerProps {
  onSignupClick: () => void;
  onLoginClick?: () => void;
}

const BANNER_DISMISSED_KEY = "oscarworthy_banner_dismissed";
const BANNER_DISMISSED_SESSION_KEY = "oscarworthy_banner_dismissed_session";

export default function GuestDataBanner({ onSignupClick, onLoginClick }: GuestDataBannerProps) {
  const [show, setShow] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);

  const checkBannerStatus = () => {
    // Check if user has interacted and banner should be shown
    const hasInteracted = hasGuestInteracted();
    const shouldShow = shouldShowSignupPrompt();
    const wasDismissedPermanently = localStorage.getItem(BANNER_DISMISSED_KEY) === "true";
    const wasDismissedThisSession = sessionStorage.getItem(BANNER_DISMISSED_SESSION_KEY) === "true";
    
    // Check if this seems like a returning user (has previous data)
    const count = getGuestInteractionCount();
    
    setInteractionCount(count);
    setIsReturningUser(count > 5); // Consider returning user if they have 5+ interactions
    setShow(hasInteracted && shouldShow && !wasDismissedPermanently && !wasDismissedThisSession);
  };

  useEffect(() => {
    checkBannerStatus();
    
    // Set up an interval to periodically check if the banner should appear
    const interval = setInterval(checkBannerStatus, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    setShow(false);
    // Only dismiss for this session, not permanently
    sessionStorage.setItem(BANNER_DISMISSED_SESSION_KEY, "true");
  };

  const handleDismissPermanently = () => {
    setShow(false);
    localStorage.setItem(BANNER_DISMISSED_KEY, "true");
  };

  if (!show) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {isReturningUser ? (
            <User className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          ) : (
            <UserPlus className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1">
            <p className="text-sm text-blue-900 dark:text-blue-100 mb-2">
              {isReturningUser ? (
                <>
                  <span className="font-medium">Welcome back!</span> You have {interactionCount} movie ratings stored locally. 
                  They'll be lost if you clear your browser data.
                </>
              ) : (
                <>
                  <span className="font-medium">Great start!</span> You're building your movie preferences. 
                  Create an account to save them permanently across devices.
                </>
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={onSignupClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Sign up to save data
              </button>
              {isReturningUser && onLoginClick && (
                <button
                  onClick={onLoginClick}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 rounded-md transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  Already have an account?
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={handleDismiss}
            className="text-blue-400 dark:text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1"
            title="Hide for this session"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

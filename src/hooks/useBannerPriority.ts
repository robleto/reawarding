"use client";

import { useState, useEffect } from "react";
import { hasGuestInteracted, shouldShowSignupPrompt, getGuestInteractionCount } from "@/utils/guestMode";

export type BannerType = 
  | 'welcome'           // First-time user welcome banner
  | 'returning'         // Returning user with saved data
  | 'save-prompt'       // After threshold interactions
  | 'none';             // No banner should show

interface BannerPriorityState {
  activeBanner: BannerType;
  interactionCount: number;
  isReturningUser: boolean;
  shouldShowBanner: boolean;
}

const BANNER_DISMISSED_KEY = "oscarworthy_banner_dismissed";
const BANNER_DISMISSED_SESSION_KEY = "oscarworthy_banner_dismissed_session";

export function useBannerPriority(): BannerPriorityState & {
  dismissBanner: () => void;
  dismissPermanently: () => void;
} {
  const [state, setState] = useState<BannerPriorityState>({
    activeBanner: 'none',
    interactionCount: 0,
    isReturningUser: false,
    shouldShowBanner: false,
  });

  const calculateBannerPriority = (): BannerType => {
    const hasInteracted = hasGuestInteracted();
    const shouldShowPrompt = shouldShowSignupPrompt();
    const count = getGuestInteractionCount();
    const wasDismissedPermanently = localStorage.getItem(BANNER_DISMISSED_KEY) === "true";
    const wasDismissedThisSession = sessionStorage.getItem(BANNER_DISMISSED_SESSION_KEY) === "true";
    
    // If user dismissed banners, show nothing
    if (wasDismissedPermanently || wasDismissedThisSession) {
      return 'none';
    }

    // Priority 1: Returning user with significant data (5+ interactions) - Shows concrete numbers
    if (count >= 5) {
      return 'returning';
    }

    // Priority 2: User has hit interaction threshold for save prompt (10+ interactions)
    if (hasInteracted && shouldShowPrompt) {
      return 'save-prompt';
    }

    // Priority 3: First-time user welcome (no interactions yet)
    if (!hasInteracted) {
      return 'welcome';
    }

    // Default: No banner
    return 'none';
  };

  const updateState = () => {
    const count = getGuestInteractionCount();
    const activeBanner = calculateBannerPriority();
    
    setState({
      activeBanner,
      interactionCount: count,
      isReturningUser: count >= 5,
      shouldShowBanner: activeBanner !== 'none',
    });
  };

  useEffect(() => {
    updateState();
    
    // Check every second for state changes
    const interval = setInterval(updateState, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const dismissBanner = () => {
    sessionStorage.setItem(BANNER_DISMISSED_SESSION_KEY, "true");
    setState(prev => ({ ...prev, activeBanner: 'none', shouldShowBanner: false }));
  };

  const dismissPermanently = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, "true");
    setState(prev => ({ ...prev, activeBanner: 'none', shouldShowBanner: false }));
  };

  return {
    ...state,
    dismissBanner,
    dismissPermanently,
  };
}

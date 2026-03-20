"use client";

import { useState, useEffect } from "react";
import { hasGuestInteracted, shouldShowSignupPrompt, getGuestInteractionCount, getGuestAwardCount } from "@/utils/guestMode";
import { useAuthState } from "@/hooks/useAuthState";

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

const BANNER_DISMISSED_KEY = "reawarding_banner_dismissed";
const BANNER_DISMISSED_SESSION_KEY = "reawarding_banner_dismissed_session";

export function useBannerPriority(): BannerPriorityState & {
  dismissBanner: () => void;
  dismissPermanently: () => void;
} {
  const { status, user } = useAuthState();
  const actorKey = user?.id ?? "guest";
  const permanentDismissKey = `${BANNER_DISMISSED_KEY}:${actorKey}`;
  const sessionDismissKey = `${BANNER_DISMISSED_SESSION_KEY}:${actorKey}`;
  const [state, setState] = useState<BannerPriorityState>({
    activeBanner: 'none',
    interactionCount: 0,
    isReturningUser: false,
    shouldShowBanner: false,
  });

  const calculateBannerPriority = (): BannerType => {
    if (status === 'authenticated') {
      return 'none';
    }

    const hasInteracted = hasGuestInteracted();
    const shouldShowPrompt = shouldShowSignupPrompt();
    const count = getGuestInteractionCount();
    const awardCount = getGuestAwardCount();
    const wasDismissedPermanently = localStorage.getItem(permanentDismissKey) === "true";
    const wasDismissedThisSession = sessionStorage.getItem(sessionDismissKey) === "true";

    // If user dismissed banners, show nothing
    if (wasDismissedPermanently || wasDismissedThisSession) {
      return 'none';
    }

    // Priority 1: Guest with 3+ awards — urgency messaging
    if (awardCount >= 3) {
      return 'returning';
    }

    // Priority 2: Guest with 1+ award — save prompt
    if (awardCount >= 1) {
      return 'save-prompt';
    }

    // Priority 3: Returning user with significant rating data (5+ interactions)
    if (count >= 5) {
      return 'returning';
    }

    // Priority 4: User has hit interaction threshold for save prompt (10+ interactions)
    if (hasInteracted && shouldShowPrompt) {
      return 'save-prompt';
    }

    // Priority 5: First-time user welcome (no interactions yet)
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
  }, [status, permanentDismissKey, sessionDismissKey]);

  const dismissBanner = () => {
    sessionStorage.setItem(sessionDismissKey, "true");
    setState(prev => ({ ...prev, activeBanner: 'none', shouldShowBanner: false }));
  };

  const dismissPermanently = () => {
    localStorage.setItem(permanentDismissKey, "true");
    setState(prev => ({ ...prev, activeBanner: 'none', shouldShowBanner: false }));
  };

  return {
    ...state,
    dismissBanner,
    dismissPermanently,
  };
}

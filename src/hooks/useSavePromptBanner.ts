import { useState, useEffect } from "react";
import useGuestRankingStore from "@/hooks/useGuestRankingStore";

const SAVE_PROMPT_DISMISSED_KEY = "oscarworthy-save-prompt-dismissed";

export function useSavePromptBanner() {
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const guestStore = useGuestRankingStore();

  useEffect(() => {
    setHasMounted(true);
    // Check if banner was previously dismissed
    const dismissed = localStorage.getItem(SAVE_PROMPT_DISMISSED_KEY);
    setIsDismissed(dismissed === "true");
  }, []);

  const dismissBanner = () => {
    setIsDismissed(true);
    localStorage.setItem(SAVE_PROMPT_DISMISSED_KEY, "true");
  };

  const clearDismissal = () => {
    setIsDismissed(false);
    localStorage.removeItem(SAVE_PROMPT_DISMISSED_KEY);
  };

  // Show banner if:
  // - Component has mounted (to avoid SSR issues)
  // - User has made at least one ranking
  // - Banner hasn't been dismissed
  // - User is still a guest (hasGuestInteracted would be false for authenticated users)
  const shouldShow = hasMounted && 
                    guestStore.hasGuestInteracted() && 
                    guestStore.getInteractionCount() > 0 && 
                    !isDismissed;

  return {
    visible: shouldShow,
    onDismiss: dismissBanner,
    clearDismissal, // For when rankings are cleared
  };
}

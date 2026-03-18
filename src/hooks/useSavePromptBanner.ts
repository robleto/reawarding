import { useState, useEffect } from "react";
import useGuestRankingStore from "@/hooks/useGuestRankingStore";
import { useAuthState } from "@/hooks/useAuthState";

const SAVE_PROMPT_DISMISSED_KEY = "reawarding-save-prompt-dismissed";

export function useSavePromptBanner() {
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const guestStore = useGuestRankingStore();
  const { status, user } = useAuthState();
  const actorKey = user?.id ?? "guest";
  const dismissedKey = `${SAVE_PROMPT_DISMISSED_KEY}:${actorKey}`;

  useEffect(() => {
    setHasMounted(true);
    const dismissed = localStorage.getItem(dismissedKey);
    setIsDismissed(dismissed === "true");
  }, [dismissedKey]);

  const dismissBanner = () => {
    setIsDismissed(true);
    localStorage.setItem(dismissedKey, "true");
  };

  const clearDismissal = () => {
    setIsDismissed(false);
    localStorage.removeItem(dismissedKey);
  };

  // Show banner if:
  // - Component has mounted (to avoid SSR issues)
  // - User has made at least one ranking
  // - Banner hasn't been dismissed
  // - User is still a guest (hasGuestInteracted would be false for authenticated users)
  const shouldShow = hasMounted &&
                    status !== "authenticated" &&
                    guestStore.hasGuestInteracted() && 
                    guestStore.getInteractionCount() > 0 && 
                    !isDismissed;

  return {
    visible: shouldShow,
    onDismiss: dismissBanner,
    clearDismissal, // For when rankings are cleared
  };
}

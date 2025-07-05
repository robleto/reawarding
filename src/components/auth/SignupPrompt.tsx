"use client";

import { useState, useEffect } from "react";
import { X, Star, Shield, Clock } from "lucide-react";
import { getGuestInteractionCount, shouldShowSignupPrompt } from "@/utils/guestMode";

interface SignupPromptProps {
  onSignupClick: () => void;
  onDismiss: () => void;
}

export default function SignupPrompt({ onSignupClick, onDismiss }: SignupPromptProps) {
  const [show, setShow] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);

  useEffect(() => {
    const checkPrompt = () => {
      const shouldShow = shouldShowSignupPrompt();
      const count = getGuestInteractionCount();
      
      setShow(shouldShow);
      setInteractionCount(count);
    };

    // Check immediately and then every 5 seconds
    checkPrompt();
    const interval = setInterval(checkPrompt, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:max-w-sm bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 text-white p-4 rounded-lg shadow-lg dark:shadow-gray-800 z-40 animate-in slide-in-from-bottom-2 duration-300">
      <button
        onClick={() => {
          setShow(false);
          onDismiss();
        }}
        className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="pr-6">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-5 h-5 text-yellow-300" />
          <h3 className="font-semibold">Love rating movies?</h3>
        </div>
        
        <p className="text-sm text-white/90 mb-3">
          You&apos;ve rated {interactionCount} movie{interactionCount !== 1 ? "s" : ""}! 
          Create a free account to save your picks and discover more features.
        </p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-xs text-white/80">
            <Shield className="w-3 h-3" />
            <span>Save your rankings forever</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/80">
            <Clock className="w-3 h-3" />
            <span>Track your watch history</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/80">
            <Star className="w-3 h-3" />
            <span>Create custom movie lists</span>
          </div>
        </div>

        <button
          onClick={onSignupClick}
          className="w-full bg-white dark:bg-gray-100 text-blue-600 dark:text-blue-700 font-medium py-2 px-4 rounded-md hover:bg-gray-100 dark:hover:bg-gray-200 transition-colors"
        >
          Sign up free in 30 seconds
        </button>
      </div>
    </div>
  );
}

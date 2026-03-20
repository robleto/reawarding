"use client";

import { useEffect, useState } from "react";
import LoginModal from "./LoginModal";
import SignupModal from "./SignupModal";
import type { User } from "@supabase/auth-helpers-nextjs";

interface AuthModalManagerProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
  onAuthSuccess?: (user: User) => void;
}

export default function AuthModalManager({
  isOpen,
  onClose,
  initialMode = "login",
  onAuthSuccess,
}: AuthModalManagerProps) {
  const [currentMode, setCurrentMode] = useState<"login" | "signup">(initialMode);

  useEffect(() => {
    setCurrentMode(initialMode);
  }, [initialMode, isOpen]);

  const handleSwitchToSignup = () => {
    setCurrentMode("signup");
  };

  const handleSwitchToLogin = () => {
    setCurrentMode("login");
  };

  const handleClose = () => {
    // Reset to initial mode when closing
    setCurrentMode(initialMode);
    onClose();
  };

  const handleAuthSuccess = (user: User) => {
    // Reset to initial mode on success
    setCurrentMode(initialMode);
    onAuthSuccess?.(user);
  };

  if (currentMode === "signup") {
    return (
      <SignupModal
        key="signup"
        isOpen={isOpen}
        onClose={handleClose}
        onAuthSuccess={handleAuthSuccess}
        onSwitchToLogin={handleSwitchToLogin}
      />
    );
  }

  return (
    <LoginModal
      key="login"
      isOpen={isOpen}
      onClose={handleClose}
      onAuthSuccess={handleAuthSuccess}
      onSwitchToSignup={handleSwitchToSignup}
    />
  );
}

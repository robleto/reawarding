"use client";

import { useState } from "react";
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
        isOpen={isOpen}
        onClose={handleClose}
        onAuthSuccess={handleAuthSuccess}
        onSwitchToLogin={handleSwitchToLogin}
      />
    );
  }

  return (
    <LoginModal
      isOpen={isOpen}
      onClose={handleClose}
      onAuthSuccess={handleAuthSuccess}
      onSwitchToSignup={handleSwitchToSignup}
    />
  );
}

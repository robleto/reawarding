"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Github, Mail, Eye, EyeOff } from "lucide-react";
import type { Database } from "@/types/supabase";
import { useGuestRankingStoreWithMigration } from "@/hooks/useGuestRankingStore";
import { useGlobalToast } from "@/hooks/useGlobalToast";
import { supabase } from "@/lib/supabaseBrowser";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "login" | "signup";
  onModeChange: (mode: "login" | "signup") => void;
  onSuccess?: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  mode,
  onModeChange,
  onSuccess,
}: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migratingData, setMigratingData] = useState(false);
  const router = useRouter();
  const guestStore = useGuestRankingStoreWithMigration();
  const { showToast } = useGlobalToast();

  const handleSuccessfulAuth = async (userId: string, isSignup: boolean = false) => {
    // Check if there's guest data to migrate
    if (guestStore.hasGuestInteracted()) {
      setMigratingData(true);
      try {
        const result = await guestStore.migrateToSupabase(userId);
        if (result.success && result.migratedCount > 0) {
          // Close modal first
          onClose();
          
          // Show success toast and redirect to rankings
          if (isSignup) {
            showToast("Welcome! Your picks are saved.", "success");
            router.push("/rankings");
          } else {
            showToast(`Successfully migrated ${result.migratedCount} ratings to your account!`, "success");
          }
          
          onSuccess?.();
          return;
        } else if (!result.success && result.error) {
          console.error("Migration failed:", result.error);
          // Don't show migration errors to users - they can still use the app
        }
      } catch (error) {
        console.error("Migration error:", error);
      } finally {
        setMigratingData(false);
      }
    }
    
    if (isSignup) {
      onClose();
      showToast("Welcome! Your picks are saved.", "success");
      router.push("/rankings");
    } else {
      onSuccess?.();
      onClose();
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const redirectTo = typeof window !== "undefined" 
        ? `${window.location.origin}/rankings`
        : undefined;

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
          },
        });
        if (error) {
          setError(error.message);
          showToast(error.message, "error");
          setLoading(false);
          return;
        } else if (data.user) {
          if (data.user.email_confirmed_at) {
            await handleSuccessfulAuth(data.user.id, true);
          } else {
            const confirmMessage = "Please check your email to confirm your account!";
            setError(confirmMessage);
            showToast(confirmMessage, "info");
          }
        } else {
          const confirmMessage = "Please check your email to confirm your account!";
          setError(confirmMessage);
          showToast(confirmMessage, "info");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(error.message);
          showToast(error.message, "error");
          setLoading(false);
          return;
        } else if (data.user) {
          await handleSuccessfulAuth(data.user.id, false);
          showToast("Welcome back!", "success");
        } else {
          setError("No user returned from Supabase");
        }
      }
    } catch (err) {
      const errorMessage = "An unexpected error occurred: " + (err instanceof Error ? err.message : String(err));
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubAuth = async () => {
    setLoading(true);
    setError(null);

    const redirectTo = typeof window !== "undefined"
      ? `${window.location.origin}/rankings`
      : undefined;

    // Try Supabase redirect, fallback to manual redirect if url is returned
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo,
      },
    });
    console.log('OAuth result:', { data, error });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data?.url) {
      window.location.href = data.url;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Social Auth */}
        <button
          onClick={handleGitHubAuth}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors mb-4 disabled:opacity-50 text-gray-900 dark:text-gray-100"
        >
          <Github className="w-5 h-5" />
          {mode === "login" ? "Sign in with GitHub" : "Sign up with GitHub"}
        </button>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with email</span>
          </div>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Enter your password"
                required
                minLength={mode === "signup" ? 6 : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {(error || migratingData) && (
            <div className={`text-sm p-3 rounded-lg ${
              error?.includes("check your email") || error?.includes("Successfully migrated")
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700" 
                : migratingData
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700"
            }`}>
              {migratingData ? "Migrating your guest data..." : error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || migratingData}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading || migratingData ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {/* Mode Toggle */}
        <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => onModeChange("signup")}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => onModeChange("login")}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

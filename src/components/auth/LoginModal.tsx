"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Mail, Eye, EyeOff } from "lucide-react";
import type { Database } from "@/types/supabase";
import type { User } from "@supabase/auth-helpers-nextjs";
import { useGlobalToast } from "@/hooks/useGlobalToast";
import { supabase } from "@/lib/supabaseBrowser";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: (user: User) => void;
  showSignupLink?: boolean;
  onSwitchToSignup?: () => void;
}

export default function LoginModal({
  isOpen,
  onClose,
  onAuthSuccess,
  showSignupLink = true,
  onSwitchToSignup,
}: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const router = useRouter();
  const { showToast } = useGlobalToast();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        // Check if error is related to email confirmation
        if (error.message.toLowerCase().includes('email not confirmed') || 
            error.message.toLowerCase().includes('confirm your email') ||
            error.message.toLowerCase().includes('verification') ||
            error.message.toLowerCase().includes('invalid login credentials')) {
          setShowResendConfirmation(true);
        }
        setLoading(false);
        return;
      }
      if (data.user) {
        // Success
        showToast("Welcome back!", "success");
        onAuthSuccess?.(data.user);
        onClose();
        router.push("/rankings");
      } else {
        setError("No user returned from Supabase");
      }
    } catch (err) {
      setError("An unexpected error occurred: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'github') => {
    setLoading(true);
    setError(null);

    const redirectTo = typeof window !== "undefined"
      ? `${window.location.origin}/rankings`
      : undefined;

    // Try Supabase redirect, fallback to manual redirect if url is returned
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
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
    // No need to setLoading(false) here, as the page will redirect
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError("Please enter your email address first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined,
      });

      if (error) {
        setError(error.message);
      } else {
        setResetEmailSent(true);
        showToast("Password reset email sent!", "success");
      }
    } catch (err) {
      setError("An unexpected error occurred: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError("Please enter your email address first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: typeof window !== "undefined"
            ? `${window.location.origin}/rankings`
            : undefined,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setConfirmationEmailSent(true);
        setShowResendConfirmation(false);
        showToast("Confirmation email sent! Check your inbox.", "success");
      }
    } catch (err) {
      setError("An unexpected error occurred: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setError(null);
    setResetEmailSent(false);
    setConfirmationEmailSent(false);
    setShowResendConfirmation(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Welcome back
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Social Auth */}
        <div className="space-y-3 mb-4">
          <button
            onClick={() => handleOAuthLogin('github')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.809 1.304 3.495.997.108-.775.418-1.305.762-1.605-2.665-.304-5.466-1.332-5.466-5.931 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.984-.399 3.003-.404 1.019.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.119 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.803 5.625-5.475 5.921.43.371.823 1.102.823 2.222v3.293c0 .322.218.694.825.576C20.565 21.796 24 17.297 24 12c0-6.63-5.373-12-12-12z" />
            </svg>
            Continue with Github
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with email</span>
          </div>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={loading}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
            >
              Forgot password?
            </button>
          </div>

          {resetEmailSent && (
            <div className="text-sm p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">
              Password reset email sent! Check your inbox and follow the instructions.
            </div>
          )}

          {confirmationEmailSent && (
            <div className="text-sm p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">
              Confirmation email resent! Check your inbox and click the link to verify your account.
            </div>
          )}

          {error && (
            <div className="text-sm p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
              {error}
              {showResendConfirmation && (
                <div className="mt-2 pt-2 border-t border-red-300">
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={loading}
                    className="text-red-700 hover:text-red-800 font-medium underline disabled:opacity-50"
                  >
                    Resend confirmation email
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Signup Link */}
        {showSignupLink && (
          <div className="mt-4 text-center text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <button
              onClick={onSwitchToSignup}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign up
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

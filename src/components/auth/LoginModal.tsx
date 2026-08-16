"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, Mail, Eye, EyeOff } from "lucide-react";
import type { User } from "@supabase/auth-helpers-nextjs";
import { useGlobalToast } from "@/hooks/useGlobalToast";
import { supabase } from "@/lib/supabaseBrowser";
import { buildSiteUrl } from "@/utils/siteUrl";
import { sanitizeNextPath } from "@/utils/sanitizeNextPath";
import { startOAuthSignIn } from "@/utils/oauthSignIn";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: (user: User) => void;
  showSignupLink?: boolean;
  onSwitchToSignup?: () => void;
  /** Where to send the user after a successful sign-in. Defaults to '/'.
   *  Always sanitized to a same-origin relative path — never trust this
   *  directly as a redirect target. */
  next?: string;
}

export default function LoginModal({
  isOpen,
  onClose,
  onAuthSuccess,
  showSignupLink = true,
  onSwitchToSignup,
  next,
}: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const router = useRouter();
  const { showToast } = useGlobalToast();
  const safeNext = sanitizeNextPath(next);

  const completeLogin = (user: User) => {
    showToast("Welcome back!", "success");
    onAuthSuccess?.(user);
    onClose();
    router.push(safeNext);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setShowResendConfirmation(false);
    setConfirmationEmailSent(false);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        const msg = error.message || "Failed to sign in";
        const lower = msg.toLowerCase();
        const isUnconfirmed =
          lower.includes("email not confirmed") ||
          lower.includes("confirm your email") ||
          lower.includes("not confirmed");

        if (isUnconfirmed) {
          setError("Email not confirmed. Please confirm your email, or resend the confirmation link.");
          setShowResendConfirmation(true);
        } else {
          setError(msg);
        }
        setLoading(false);
        return;
      }
      if (data.user) {
        await completeLogin(data.user);
      } else {
        setError("No user returned from Supabase");
      }
    } catch (err) {
      setError("An unexpected error occurred: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'apple' | 'google' | 'facebook') => {
    setLoading(true);
    setError(null);

    const { error } = await startOAuthSignIn(supabase, provider, safeNext);
    if (error) {
      setError(error);
      setLoading(false);
    }
    // No need to setLoading(false) on success — the page/browser redirects.
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
          emailRedirectTo: buildSiteUrl(`/auth/callback?next=${encodeURIComponent(safeNext)}`) || undefined,
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
    setConfirmationEmailSent(false);
    setShowResendConfirmation(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 my-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Welcome back</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 text-gray-400 hover:text-white"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Social Auth */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleOAuthLogin("apple")}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-3.014 1.57-.12 0-.23-.02-.3-.03-.014-.1-.04-.32-.04-.55 0-1.14.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.077.36.077.59zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.4-1.25-3.4-2.6-1.55-2.11-2.75-5.55-2.75-8.5 0-4.36 2.63-6.67 5.24-6.67 1.398 0 2.55.94 3.42.94.84 0 2.02-1 3.62-1 .53 0 2.36.05 3.6 1.72-.09.06-2.15 1.29-2.15 3.83 0 3.05 2.67 4.13 2.67 4.13z" />
            </svg>
            Continue with Apple
          </button>
          <button
            onClick={() => handleOAuthLogin("google")}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
          <button
            onClick={() => handleOAuthLogin("facebook")}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88v-6.99h-2.54V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99C18.34 21.13 22 16.99 22 12z" />
            </svg>
            Continue with Facebook
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-800 text-gray-400">Or continue with email</span>
          </div>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder-gray-300"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder-gray-300"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <Link
              href="/auth/forgot-password"
              onClick={handleClose}
              className="text-gold-500 hover:text-yellow-400 font-medium transition-colors"
            >
              Forgot password?
            </Link>
          </div>


          {confirmationEmailSent && (
            <div className="text-sm p-3 rounded-lg bg-green-900/20 text-green-300 border border-green-800">
              Confirmation email resent! Check your inbox and click the link to verify your account.
            </div>
          )}

          {error && (
            <div className="text-sm p-3 rounded-lg bg-red-900/20 text-red-300 border border-red-800">
              {error}
              {showResendConfirmation && (
                <div className="mt-2 pt-2 border-t border-red-700">
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={loading}
                    className="text-red-300 hover:text-red-200 font-medium underline disabled:opacity-50"
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
            className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-yellow-600 text-gray-900 py-3 px-4 rounded-lg transition-colors disabled:opacity-50 font-medium touch-manipulation min-h-[44px]"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Signup Link */}
        {showSignupLink && (
          <div className="mt-6 text-center text-sm text-gray-400">
            Don&apos;t have an account?{" "}
            <button
              onClick={onSwitchToSignup}
              className="text-gold-500 hover:text-yellow-400 font-medium transition-colors"
              disabled={loading}
            >
              Sign up
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

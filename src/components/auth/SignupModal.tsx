"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Mail, Eye, EyeOff, User as UserIcon } from "lucide-react";
import type { User } from "@supabase/auth-helpers-nextjs";
import { useGlobalToast } from "@/hooks/useGlobalToast";
import { supabase } from "@/lib/supabaseBrowser";
import { buildSiteUrl } from "@/utils/siteUrl";
import { startOAuthSignIn } from "@/utils/oauthSignIn";

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: (user: User) => void;
  showLoginLink?: boolean;
  onSwitchToLogin?: () => void;
}

// Password strength helper to avoid code duplication
function getPasswordStrength(password: string): { level: 'weak' | 'good' | 'strong'; text: string } {
  if (!password) return { level: 'weak', text: '' };
  if (password.length < 6) return { level: 'weak', text: 'Too short' };
  if (password.length < 8) return { level: 'good', text: 'Good' };
  
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  if (password.length >= 10 && hasUppercase && hasNumber) {
    return { level: 'strong', text: 'Strong' };
  }
  
  return { level: 'good', text: 'Better' };
}

export default function SignupModal({
  isOpen,
  onClose,
  onAuthSuccess,
  showLoginLink = true,
  onSwitchToLogin,
}: SignupModalProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [emailOptIn, setEmailOptIn] = useState(false);
  const router = useRouter();
  const { showToast } = useGlobalToast();

  const validateForm = () => {
    if (!username.trim()) {
      setError("Username is required");
      return false;
    }
    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username can only contain letters, numbers, and underscores");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Use auth callback to exchange code and then redirect home
          emailRedirectTo: buildSiteUrl("/auth/callback?next=/") || undefined,
          data: {
            username,
            full_name: username,
            email_opt_in: emailOptIn,
          },
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (data.user) {
        if (data.user.email_confirmed_at) {
          // User is already confirmed (shouldn't happen with email confirmation enabled)
          showToast("Welcome to Reawarding!", "success");
          onAuthSuccess?.(data.user);
          onClose();
          router.push("/");
        } else {
          // User needs to confirm email
          setEmailSent(true);
          showToast("Please check your email to confirm your account", "info");
        }
      } else {
        setError("No user returned from Supabase");
      }
    } catch (err) {
      setError("An unexpected error occurred: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignup = async (provider: 'apple' | 'google' | 'facebook') => {
    setLoading(true);
    setError(null);

    const { error } = await startOAuthSignIn(supabase, provider);
    if (error) {
      setError(error);
      setLoading(false);
    }
    // No need to setLoading(false) on success — the page/browser redirects.
  };

  const resetForm = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setEmailOptIn(false);
    setError(null);
    setEmailSent(false);
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
          <h2 className="text-xl font-semibold text-white">
            {emailSent ? "Check your email" : "Create account"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {emailSent ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-900/30">
              <Mail className="h-6 w-6 text-gold-400" />
            </div>
            <p className="text-gray-300">
              A confirmation link has been sent to <strong>{email}</strong>.
            </p>
            <p className="mt-3 text-sm text-gray-400">
              Click the link in the email to activate your account. Check spam if you don&apos;t see it.
            </p>
            <div className="mt-6 rounded-lg border border-gray-700 bg-gray-800/50 p-4 text-left">
              <p className="text-xs font-medium text-gray-300 mb-2">While you wait:</p>
              <ul className="space-y-1.5 text-xs text-gray-400">
                <li>You&apos;ll pick movies you love and rate them</li>
                <li>Your highest-rated films become nominees for that year</li>
                <li>Fill 10 nominees to crown your Best Picture winner</li>
              </ul>
            </div>
            <button
              onClick={handleClose}
              className="mt-5 w-full bg-gold-500 text-gray-900 py-3 px-4 rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 font-medium touch-manipulation min-h-[44px]"
            >
              Got it
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <button
                onClick={() => handleOAuthSignup('apple')}
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-600 rounded-md hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
              >
                <svg className="w-5 h-5" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-3.014 1.57-.12 0-.23-.02-.3-.03-.014-.1-.04-.32-.04-.55 0-1.14.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.077.36.077.59zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.4-1.25-3.4-2.6-1.55-2.11-2.75-5.55-2.75-8.5 0-4.36 2.63-6.67 5.24-6.67 1.398 0 2.55.94 3.42.94.84 0 2.02-1 3.62-1 .53 0 2.36.05 3.6 1.72-.09.06-2.15 1.29-2.15 3.83 0 3.05 2.67 4.13 2.67 4.13z" />
                </svg>
                Continue with Apple
              </button>
              <button
                onClick={() => handleOAuthSignup('google')}
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-600 rounded-md hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
              >
                <svg className="w-5 h-5" aria-hidden="true" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>
              <button
                onClick={() => handleOAuthSignup('facebook')}
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-600 rounded-md hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
              >
                <svg className="w-5 h-5" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88v-6.99h-2.54V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99C18.34 21.13 22 16.99 22 12z" />
                </svg>
                Continue with Facebook
              </button>
            </div>

            <div className="my-4 flex items-center">
              <div className="flex-grow border-t border-gray-600"></div>
              <span className="mx-4 text-sm text-gray-400">
                Or continue with email
              </span>
              <div className="flex-grow border-t border-gray-600"></div>
            </div>

            <form onSubmit={handleEmailSignup} className="space-y-4">
              <div>
                <label
                  htmlFor="signup-username"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="signup-username"
                    type="text"
                    placeholder="your_username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-700 border-gray-600 text-white placeholder-gray-300"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-700 border-gray-600 text-white placeholder-gray-300"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-700 border-gray-600 text-white placeholder-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {password && (
                  <div className="mt-1">
                    <div className="flex gap-1 mb-1">
                      {(() => {
                        const strength = getPasswordStrength(password);
                        const bars = [
                          password.length >= 6,
                          password.length >= 8,
                          strength.level === 'strong'
                        ];
                        return bars.map((active, i) => (
                          <div 
                            key={i} 
                            className={`h-1 flex-1 rounded ${active ? 'bg-green-500' : 'bg-gray-600'}`} 
                          />
                        ));
                      })()}
                    </div>
                    <p className="text-xs text-gray-400">
                      {getPasswordStrength(password).text}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-700 border-gray-600 text-white placeholder-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              <label className="flex items-start gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={emailOptIn}
                  onChange={(e) => setEmailOptIn(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                />
                <span>Send me product updates by email (optional).</span>
              </label>

              {error && (
                <div className="p-3 text-sm bg-red-900/20 text-red-300 border border-red-800 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gold-500 hover:bg-yellow-600 text-gray-900 py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 font-medium touch-manipulation min-h-[44px]"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            {showLoginLink && (
              <p className="mt-4 text-sm text-center text-gray-400">
                Already have an account?{" "}
                <button
                  onClick={onSwitchToLogin}
                  className="font-medium text-gold-500 hover:text-yellow-400 transition-colors"
                >
                  Sign in
                </button>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

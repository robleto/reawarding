"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { AlertCircle, Home, Mail, CheckCircle2 } from "lucide-react";
import { Suspense, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { buildSiteUrl } from "@/utils/siteUrl";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams?.get("error") || "Unknown error";
  const description = searchParams?.get("description") || "An unexpected error occurred during authentication.";
  // Threaded through from /auth/confirm — lets us tell a failed signup
  // confirmation link apart from every other kind of auth failure so we can
  // offer a real recovery action instead of a dead end.
  const type = searchParams?.get("type");
  const isSignupConfirmation = type === "signup";

  const [email, setEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSent, setResendSent] = useState(false);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setResendError("Please enter your email address first");
      return;
    }

    setResendLoading(true);
    setResendError(null);

    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: buildSiteUrl("/auth/callback") || undefined,
        },
      });

      if (resendErr) {
        setResendError(resendErr.message);
      } else {
        setResendSent(true);
      }
    } catch {
      setResendError("Failed to resend confirmation email");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
      <div className="max-w-md w-full space-y-6">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="bg-red-900/20 rounded-full p-4">
            <AlertCircle className="w-12 h-12 text-red-400" />
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">
            Authentication Failed
          </h1>
          <p className="text-gray-400">
            {isSignupConfirmation
              ? "Your confirmation link has expired or has already been used."
              : "We couldn't complete your sign-in request."}
          </p>
        </div>

        {/* Error Details */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-300">
              Error Code
            </p>
            <p className="text-sm text-gray-400 font-mono bg-gray-900 px-2 py-1 rounded">
              {error}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-300">
              Description
            </p>
            <p className="text-sm text-gray-400">
              {description}
            </p>
          </div>
        </div>

        {isSignupConfirmation ? (
          /* Resend confirmation — the actual recovery path for an expired or
           * already-used signup link. Works without an active session and
           * without first requiring a failed password sign-in attempt. */
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-semibold text-white">
              Get a new confirmation link
            </h2>
            {resendSent ? (
              <div className="flex items-start gap-2 text-sm text-green-300 bg-green-900/20 border border-green-800 rounded-lg p-3">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Confirmation email sent! Check your inbox.</span>
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-3">
                <div>
                  <label htmlFor="resend-email" className="sr-only">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      id="resend-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-9 pr-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-gray-700 text-white text-sm"
                      required
                    />
                  </div>
                </div>
                {resendError && (
                  <p className="text-sm text-red-400">{resendError}</p>
                )}
                <button
                  type="submit"
                  disabled={resendLoading}
                  className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-yellow-600 text-gray-900 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendLoading ? "Sending..." : "Resend confirmation email"}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* Common Solutions */
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-blue-300 mb-2">
              Common Solutions
            </h2>
            <ul className="text-sm text-blue-300 space-y-1 list-disc list-inside">
              <li>Try signing in again with a different method</li>
              <li>Clear your browser cache and cookies</li>
              <li>Make sure your email is verified (check your inbox)</li>
              <li>Check if you&apos;re using the correct credentials</li>
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => router.push("/")}
            className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-yellow-600 text-gray-900 px-4 py-2.5 rounded-lg font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            Go to Home
          </button>
        </div>

        {/* Help Text */}
        <p className="text-center text-xs text-gray-400">
          If this problem persists, please contact support with the error code above.
        </p>
      </div>
    </div>
  );
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}

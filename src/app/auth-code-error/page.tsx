"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { AlertCircle, Home, LogIn } from "lucide-react";
import { Suspense } from "react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams?.get("error") || "Unknown error";
  const description = searchParams?.get("description") || "An unexpected error occurred during authentication.";
  // Threaded through from /auth/confirm — lets us give a failed signup
  // confirmation link slightly different copy than any other auth failure.
  const type = searchParams?.get("type");
  const isSignupConfirmation = type === "signup";

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
          <h1 className="font-unbounded text-2xl font-bold text-white">
            Authentication failed
          </h1>
          <p className="text-gray-400">
            {isSignupConfirmation
              ? "Your confirmation link has expired or has already been used."
              : "We couldn't complete your sign-in request."}
          </p>
        </div>

        {/* Error Details */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-300">
              Error code
            </p>
            <p className="text-sm text-gray-400 font-mono bg-black/30 px-2.5 py-1 rounded-full inline-block">
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
          // AUTH-2 (docs/audits/2026-08-21-launch-readiness-round3.md):
          // email confirmation is off — no signup confirmation email is ever
          // sent, so a "resend confirmation email" affordance here would be
          // just as theatrical as the flow that landed someone on this page.
          // The honest recovery is that they can already sign in directly.
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-white">
              You can sign in directly
            </h2>
            <p className="text-sm text-gray-400">
              Reawarding doesn&apos;t require confirming your email — your account is
              already active. Try signing in with your email and password instead.
            </p>
          </div>
        ) : (
          /* Common Solutions — neutral, not an error/success state, so it
             gets the same glass treatment as the resend/details boxes above
             rather than the semantic red/green tints. (Was blue — the one
             color nowhere else in the app's palette.) */
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-sm font-semibold text-gray-200 mb-2">
              Common solutions
            </h2>
            <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
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
            onClick={() => router.push("/login")}
            className="w-full flex items-center justify-center gap-2 rounded-full border border-gold-300/40 bg-gold-500 text-black shadow-lg shadow-gold-500/25 hover:bg-gold-400 hover:shadow-gold-400/35 px-4 py-2.5 font-medium transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Go to sign in
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white px-4 py-2.5 font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            Go to home
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
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-4 border-gold-400/30 border-t-gold-400 rounded-full animate-spin" />
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}

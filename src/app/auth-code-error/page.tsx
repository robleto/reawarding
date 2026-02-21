"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { Suspense } from "react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams?.get("error") || "Unknown error";
  const description = searchParams?.get("description") || "An unexpected error occurred during authentication.";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-md w-full space-y-6">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="bg-red-100 dark:bg-red-900/20 rounded-full p-4">
            <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Authentication Failed
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            We couldn&apos;t complete your sign-in request.
          </p>
        </div>

        {/* Error Details */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Error Code
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
              {error}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          </div>
        </div>

        {/* Common Solutions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
            Common Solutions
          </h2>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
            <li>Try signing in again with a different method</li>
            <li>Clear your browser cache and cookies</li>
            <li>Make sure your email is verified (check your inbox)</li>
            <li>Check if you&apos;re using the correct credentials</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => router.push("/")}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            Go to Home
          </button>
          <button
            onClick={() => router.back()}
            className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 px-4 py-2.5 rounded-lg font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Try Again
          </button>
        </div>

        {/* Help Text */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
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
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}

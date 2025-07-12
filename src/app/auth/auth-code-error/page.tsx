'use client';

import Link from 'next/link';
import { AlertCircle, Home, RotateCcw } from 'lucide-react';

export default function AuthCodeErrorPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="w-full max-w-md">
        {/* Error Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Authentication Error
          </h1>
          
          <p className="text-gray-600 mb-6">
            Sorry, there was a problem signing you in. This could be due to an expired link or a configuration issue.
          </p>

          <div className="space-y-3">
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </Link>
            
            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Link>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            If you continue to have issues, please contact{' '}
            <a href="mailto:support@reawarding.com" className="text-blue-400 hover:text-blue-300">
              support@reawarding.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

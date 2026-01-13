'use client';

import Link from 'next/link';
import { ShieldAlert, Home } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-charcoal-900 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10 text-red-400" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold font-unbounded text-white mb-3">
          Access Not Permitted
        </h1>

        {/* Description */}
        <p className="text-gray-400 mb-8 leading-relaxed">
          This area is reserved for site administrators. If you believe you should have access, please contact support.
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-600 text-white rounded-lg font-medium transition-colors shadow-lg shadow-gold-500/20"
          >
            <Home className="w-4 h-4" />
            Return Home
          </Link>
          
          <p className="text-sm text-gray-500 mt-4">
            Need help?{' '}
            <Link href="/help" className="text-gold-400 hover:text-gold-300 underline">
              Visit our help center
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

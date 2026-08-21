'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from "@/lib/supabaseBrowser";
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { buildSiteUrl } from '@/utils/siteUrl';
import { sanitizeNextPath, RESET_PASSWORD_NEXT_STORAGE_KEY } from '@/utils/sanitizeNextPath';

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
        <div className="w-8 h-8 border-4 border-gold-400/30 border-t-gold-400 rounded-full animate-spin" />
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  );
}

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const next = sanitizeNextPath(searchParams?.get('next'));
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      // The recovery email itself can't carry `next` through (Supabase's
      // template hardcodes its own redirect target — see AUTH-1 in
      // docs/audits/2026-08-21-launch-readiness.md), so stash it here for
      // /auth/reset-password to read back on the same device/browser.
      if (typeof window !== 'undefined') {
        if (next !== '/') {
          window.localStorage.setItem(RESET_PASSWORD_NEXT_STORAGE_KEY, next);
        } else {
          window.localStorage.removeItem(RESET_PASSWORD_NEXT_STORAGE_KEY);
        }
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: buildSiteUrl('/auth/reset-password'),
      });

      if (error) {
        setError(error.message);
      } else {
        setSent(true);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-charcoal-900/95 backdrop-blur-xl shadow-2xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-900/20 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <h1 className="font-unbounded text-2xl font-bold text-white mb-2">
              Check your email
            </h1>

            <p className="text-gray-400 mb-6">
              We&apos;ve sent a password reset link to <strong>{email}</strong>
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setSent(false);
                  setEmail('');
                }}
                className="w-full px-4 py-3 rounded-full border border-gold-300/40 bg-gold-500 text-black shadow-lg shadow-gold-500/25 hover:bg-gold-400 hover:shadow-gold-400/35 transition-colors font-medium"
              >
                Send another email
              </button>

              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <p className="text-gray-400">Reset your password</p>
        </div>

        {/* Reset Form Card */}
        <div className="rounded-2xl border border-white/10 bg-charcoal-900/95 backdrop-blur-xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <h3 className="font-unbounded text-xl font-bold text-white mb-2">
              Forgot your password?
            </h3>
            <p className="text-gray-400 text-sm">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Reset Form */}
          <form onSubmit={handleResetPassword} className="space-y-4 mb-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400/60 bg-white/5 text-white placeholder-gray-500"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full border border-gold-300/40 bg-gold-500 text-black shadow-lg shadow-gold-500/25 hover:bg-gold-400 hover:shadow-gold-400/35 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <Mail className="w-5 h-5" />
              )}
              Send reset link
            </button>
          </form>

          {/* Back to login */}
          <div className="text-center">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-gold-500 hover:text-gold-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

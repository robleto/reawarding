'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from "@/lib/supabaseBrowser";
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="w-8 h-8 border-4 border-blue-600 rounded-full border-t-transparent animate-spin" />
      </main>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      const hashParams = typeof window !== 'undefined' && window.location.hash
        ? new URLSearchParams(window.location.hash.replace(/^#/, ''))
        : null;

      const getParam = (key: string) => searchParams?.get(key) || hashParams?.get(key) || null;

      // The /auth/confirm route (and Supabase itself, via the URL hash) reports
      // failed verifications here as error params, e.g. error_code=otp_expired.
      const errorParam = getParam('error');
      const errorCode = getParam('error_code');
      if (!session && errorParam) {
        setLinkInvalid(true);
        setError(
          errorCode === 'otp_expired'
            ? 'This reset link has expired. Reset links are only valid for 1 hour — please request a new one.'
            : 'This reset link is invalid or has already been used. Please request a new one.'
        );
        return;
      }

      if (!session) {
        const accessToken = getParam('access_token');
        const refreshToken = getParam('refresh_token');
        const code = getParam('code');
        const recoveryToken = getParam('token');
        const tokenHash = getParam('token_hash');

        let processed = false;
        let authError: Error | null = null;

        if (accessToken && refreshToken) {
          processed = true;
          ({ error: authError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          }));
        } else if (code) {
          processed = true;
          // Supabase stores the PKCE verifier internally, so we only pass the auth code
          ({ error: authError } = await supabase.auth.exchangeCodeForSession(code));
        } else if (tokenHash || recoveryToken) {
          processed = true;
          const verifyPayload = tokenHash
            ? { token_hash: tokenHash, type: 'recovery' as const }
            : { token: recoveryToken!, type: 'recovery' as const };
          ({ error: authError } = await (supabase.auth.verifyOtp as unknown as (payload: { token_hash: string; type: 'recovery' } | { token: string; type: 'recovery' }) => Promise<{ error: Error | null }>)(verifyPayload));
        }

        if (authError) {
          console.error('Password reset auth error:', authError);
          setLinkInvalid(true);
          setError('Invalid or expired reset link. Please request a new password reset.');
          return;
        }

        if (!processed) {
          setLinkInvalid(true);
          setError('No active reset session found. Please open the password reset link from your email, or request a new one.');
          return;
        }

        // Clean up the URL so sensitive tokens aren't left in history.
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', window.location.pathname);
        }

        setError(null);
      }

      if (sessionError) {
        console.error('Session error:', sessionError);
        setError('Session error. Please try requesting a new password reset link.');
      }
    };

    checkSession();
  }, [searchParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    
    try {
      // Verify we have an active session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Auth session missing! Please click the password reset link from your email again.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    } catch (err) {
      setError('An unexpected error occurred: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="w-full max-w-md">
          <div className="p-8 text-center bg-gray-800 shadow-gray-700 rounded-2xl">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-900/20 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            
            <h1 className="mb-2 text-2xl font-bold text-white">
              Password updated!
            </h1>
            
            <p className="mb-6 text-gray-400">
              Your password has been successfully updated. You&apos;ll be redirected to your dashboard in a moment.
            </p>

            <div className="w-8 h-8 mx-auto border-4 border-blue-600 rounded-full border-t-transparent animate-spin" />
          </div>
        </div>
      </main>
    );
  }

  if (linkInvalid) {
    return (
      <main className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="w-full max-w-md">
          <div className="p-8 text-center bg-gray-800 shadow-gray-700 rounded-2xl">
            <h1 className="mb-2 text-2xl font-bold text-white">
              Reset link problem
            </h1>

            <p className="mb-6 text-gray-400">
              {error}
            </p>

            <Link
              href="/auth/forgot-password"
              className="flex items-center justify-center w-full gap-2 px-4 py-3 font-medium text-gray-900 transition-colors bg-gold-500 rounded-lg hover:bg-yellow-600"
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <p className="text-gray-400">Set your new password</p>
        </div>

        {/* Reset Form Card */}
        <div className="p-8 bg-gray-800 shadow-gray-700 rounded-2xl">
          <div className="mb-6 text-center">
            <h3 className="mb-2 text-xl font-semibold text-white">
              Choose a new password
            </h3>
            <p className="text-sm text-gray-400">
              Please enter a strong password that you haven&apos;t used before.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 mb-4 text-sm text-red-400 border border-red-800 rounded-lg bg-red-900/20">
              {error}
            </div>
          )}

          {/* Reset Form */}
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="password" className="block mb-1 text-sm font-medium text-gray-300">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-3 pl-10 pr-12 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-500"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute text-gray-500 transform -translate-y-1/2 right-3 top-1/2 hover:text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block mb-1 text-sm font-medium text-gray-300">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full py-3 pl-10 pr-4 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="p-3 text-xs text-gray-500 rounded-lg bg-gray-50">
              <p className="mb-1 font-medium">Password requirements:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>At least 6 characters long</li>
                <li>Should be unique and not used elsewhere</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center w-full gap-2 px-4 py-3 font-medium text-gray-900 transition-colors bg-gold-500 rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
              Update password
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

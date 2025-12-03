'use client';

import { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseBrowser";
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      const hashParams = typeof window !== 'undefined' && window.location.hash
        ? new URLSearchParams(window.location.hash.replace(/^#/, ''))
        : null;

      const getParam = (key: string) => searchParams.get(key) || hashParams?.get(key) || null;
      console.log('🔐 Reset URL params', {
        hash: typeof window !== 'undefined' ? window.location.hash : 'no-window',
        accessToken: getParam('access_token') ? 'present' : 'missing',
        refreshToken: getParam('refresh_token') ? 'present' : 'missing',
        code: getParam('code') ? 'present' : 'missing',
        codeVerifier: getParam('code_verifier') ? 'present' : 'missing',
        tokenHash: getParam('token_hash') ? 'present' : 'missing',
        recoveryToken: getParam('token') ? 'present' : 'missing',
      });

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
          // Supabase stores the PKCE verifier internally, so exchanging only needs the code
          ({ error: authError } = await (supabase.auth.exchangeCodeForSession as unknown as (params: { code: string }) => Promise<{ error: Error | null }>)(
            { code }
          ));
        } else if (tokenHash || recoveryToken) {
          processed = true;
          const verifyPayload = tokenHash
            ? { token_hash: tokenHash, type: 'recovery' as const }
            : { token: recoveryToken!, type: 'recovery' as const };
          ({ error: authError } = await (supabase.auth.verifyOtp as unknown as (payload: { token_hash: string; type: 'recovery' } | { token: string; type: 'recovery' }) => Promise<{ error: Error | null }>)(verifyPayload));
        }

        if (authError) {
          console.error('Password reset auth error:', authError);
          setError('Invalid or expired reset link. Please request a new password reset.');
          return;
        }

        if (!processed) {
          setError('No active session found. Please click the password reset link from your email.');
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
          router.push('/rankings');
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
          <div className="p-8 text-center bg-white shadow-xl rounded-2xl">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              Password updated!
            </h1>
            
            <p className="mb-6 text-gray-600">
              Your password has been successfully updated. You&apos;ll be redirected to your dashboard in a moment.
            </p>

            <div className="w-8 h-8 mx-auto border-4 border-blue-600 rounded-full border-t-transparent animate-spin" />
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
        <div className="p-8 bg-white shadow-xl rounded-2xl">
          <div className="mb-6 text-center">
            <h3 className="mb-2 text-xl font-semibold text-gray-900">
              Choose a new password
            </h3>
            <p className="text-sm text-gray-600">
              Please enter a strong password that you haven&apos;t used before.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 mb-4 text-sm text-red-700 border border-red-200 rounded-lg bg-red-50">
              {error}
            </div>
          )}

          {/* Reset Form */}
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="password" className="block mb-1 text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-3 pl-10 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute text-gray-400 transform -translate-y-1/2 right-3 top-1/2 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block mb-1 text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full py-3 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="flex items-center justify-center w-full gap-2 px-4 py-3 font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

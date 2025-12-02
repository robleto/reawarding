"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useGlobalToast } from "@/hooks/useGlobalToast";
import { supabase } from "@/lib/supabaseBrowser";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useGlobalToast();

  useEffect(() => {
    const handlePasswordReset = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      const hashParams = typeof window !== 'undefined' && window.location.hash
        ? new URLSearchParams(window.location.hash.replace(/^#/, ''))
        : null;
      const getParam = (key: string) => searchParams.get(key) || hashParams?.get(key) || null;
      console.log('🔐 Reset URL params (legacy)', {
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
        const codeVerifier = getParam('code_verifier');
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
        } else if (code && codeVerifier) {
          processed = true;
          ({ error: authError } = await (supabase.auth.exchangeCodeForSession as unknown as (params: { authCode: string; codeVerifier: string }) => Promise<{ error: Error | null }>)(
            { authCode: code, codeVerifier }
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
          setError('Invalid or expired reset link. Please request a new one.');
          return;
        }

        if (!processed) {
          setError('No active session found. Please click the password reset link from your email.');
          return;
        }

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

    handlePasswordReset();
  }, [searchParams]);

  const validatePasswords = () => {
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

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!validatePasswords()) {
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError(error.message);
      } else {
        showToast("Password updated successfully!", "success");
        router.push("/rankings");
      }
    } catch (err) {
      setError("An unexpected error occurred: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handlePasswordUpdate}>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your new password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm your new password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from "@/lib/supabaseBrowser";
import { Mail, Eye, EyeOff, User, Lock } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { buildSiteUrl } from '@/utils/siteUrl';
import { sanitizeNextPath } from '@/utils/sanitizeNextPath';
import { startOAuthSignIn, type OAuthProvider } from '@/utils/oauthSignIn';

const providerLabels: Record<OAuthProvider, string> = {
  apple: 'Apple',
  google: 'Google',
  facebook: 'Facebook',
};

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
        <div className="w-8 h-8 border-4 border-gold-400/30 border-t-gold-400 rounded-full animate-spin" />
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  // Where to send the user after a successful sign-in — captured by middleware.ts
  // when it bounced an unauthenticated session away from a protected route.
  // Never trust this directly: sanitize to a same-origin relative path so a
  // crafted `next` value can't be used as an open redirect.
  const next = sanitizeNextPath(searchParams.get('next'));
  const [loading, setLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false);

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    setLoading('resend');
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: buildSiteUrl(`/auth/callback?next=${encodeURIComponent(next)}`) || undefined,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setConfirmationEmailSent(true);
        setShowResendConfirmation(false);
        setMessage('Confirmation email sent! Check your inbox.');
      }
    } catch {
      setError('Failed to resend confirmation email');
    } finally {
      setLoading(null);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setShowResendConfirmation(false);
    setConfirmationEmailSent(false);
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (isSignUp) {
      if (!username.trim()) {
        setError('Username is required');
        return;
      }
      
      if (username.length < 3) {
        setError('Username must be at least 3 characters');
        return;
      }
      
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setError('Username can only contain letters, numbers, and underscores');
        return;
      }
      
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading('email');
    
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: buildSiteUrl(`/auth/callback?next=${encodeURIComponent(next)}`) || undefined,
            data: {
              username,
              full_name: username,
              email_opt_in: emailOptIn,
            }
          },
        });
        
        if (error) {
          setError(error.message);
        } else {
          setMessage('Check your email for a confirmation link!');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          const msg = error.message || 'Failed to sign in';
          setError(msg);

          const lower = msg.toLowerCase();
          if (lower.includes('not confirmed') || lower.includes('confirm your email') || lower.includes('email not confirmed')) {
            setShowResendConfirmation(true);
          }
        } else {
          // Redirect on successful login — back to wherever the user was headed.
          window.location.href = next;
        }
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(null);
    }
  };

  const handleOAuthSignIn = async (provider: OAuthProvider) => {
    setLoading(provider);
    try {
      const { error } = await startOAuthSignIn(supabase, provider, next);
      if (error) {
        console.error(`${provider} sign-in error:`, error);
        setError(`Failed to sign in with ${providerLabels[provider]}. Please try again.`);
      }
    } catch (error) {
      console.error(`${provider} sign-in error:`, error);
      setError(`Failed to sign in with ${providerLabels[provider]}. Please try again.`);
    } finally {
      setLoading(null);
    }
  };

  const handleAppleSignIn = () => handleOAuthSignIn('apple');
  const handleGoogleSignIn = () => handleOAuthSignIn('google');
  const handleFacebookSignIn = () => handleOAuthSignIn('facebook');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <p className="text-gray-300">Rate films. Watch your nominees form. Give your own awards.</p>
        </div>

        {/* Sign In Card */}
        <div className="rounded-2xl border border-white/10 bg-charcoal-900/95 backdrop-blur-xl shadow-2xl p-8">
          <h1 className="font-unbounded text-xl font-bold text-white mb-6 text-center">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {showResendConfirmation && !confirmationEmailSent && (
            <div className="mb-4">
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={loading !== null}
                className="text-sm text-gold-500 hover:text-gold-400 transition-colors"
              >
                Resend confirmation email
              </button>
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-green-900/20 border border-green-800 rounded-xl text-green-400 text-sm">
              {message}
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
            {isSignUp && (
              <>
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border border-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400/60 bg-white/5 text-white"
                      placeholder="your_username"
                      required
                    />
                  </div>
                </div>
              </>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400/60 bg-white/5 text-white"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 border border-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400/60 bg-white/5 text-white"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400/60 bg-white/5 text-white"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            )}

            {isSignUp && (
              <label className="flex items-start gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={emailOptIn}
                  onChange={(e) => setEmailOptIn(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-500 accent-gold-500 focus:ring-gold-500/40"
                />
                <span>Send me product updates by email (optional).</span>
              </label>
            )}

            <button
              type="submit"
              disabled={loading === 'email'}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full border border-gold-300/40 bg-gold-500 text-black shadow-lg shadow-gold-500/25 hover:bg-gold-400 hover:shadow-gold-400/35 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading === 'email' ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <Mail className="w-5 h-5" />
              )}
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>

            {!isSignUp && (
              <div className="text-center">
                <a
                  href="/auth/forgot-password"
                  className="text-sm text-gold-500 hover:text-gold-400 transition-colors"
                >
                  Forgot your password?
                </a>
              </div>
            )}
          </form>

          {/* Toggle Sign Up/Sign In */}
          <div className="text-center mb-6">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setMessage(null);
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setUsername('');
                setEmailOptIn(false);
              }}
              className="text-sm text-gold-500 hover:text-gold-400 transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-charcoal-900 text-gray-400">Or continue with</span>
            </div>
          </div>

          <div className="space-y-3">
            {/* Apple Sign In */}
            <button
              onClick={handleAppleSignIn}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-white/10 bg-white/5 text-white rounded-full hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading === 'apple' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-3.014 1.57-.12 0-.23-.02-.3-.03-.014-.1-.04-.32-.04-.55 0-1.14.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.077.36.077.59zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.4-1.25-3.4-2.6-1.55-2.11-2.75-5.55-2.75-8.5 0-4.36 2.63-6.67 5.24-6.67 1.398 0 2.55.94 3.42.94.84 0 2.02-1 3.62-1 .53 0 2.36.05 3.6 1.72-.09.06-2.15 1.29-2.15 3.83 0 3.05 2.67 4.13 2.67 4.13z" />
                </svg>
              )}
              Continue with Apple
            </button>

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-white/10 bg-white/5 text-white rounded-full hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading === 'google' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              Continue with Google
            </button>

            {/* Facebook Sign In */}
            <button
              onClick={handleFacebookSignIn}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-white/10 bg-white/5 text-white rounded-full hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading === 'facebook' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88v-6.99h-2.54V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99C18.34 21.13 22 16.99 22 12z" />
                </svg>
              )}
              Continue with Facebook
            </button>

          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-700 text-center">
            <p className="text-sm text-gray-300">
              By signing in, you agree to our{' '}
              <a href="/legal/terms" className="underline hover:text-gray-400 transition-colors">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/legal/privacy" className="underline hover:text-gray-400 transition-colors">
                Privacy Policy
              </a>.
            </p>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Need help? Contact us at{' '}
            <a href="mailto:support@reawarding.com" className="text-gold-500 hover:text-gold-400 transition-colors">
              support@reawarding.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

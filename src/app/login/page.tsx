'use client';

import { useState } from 'react';
import { supabase } from "@/lib/supabaseBrowser";
import { Github, Mail, Eye, EyeOff, User, Lock } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { buildSiteUrl } from '@/utils/siteUrl';

export default function LoginPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
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
          emailRedirectTo: buildSiteUrl('/auth/callback?next=/') || undefined,
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
            emailRedirectTo: buildSiteUrl('/auth/callback?next=/') || undefined,
            data: {
              username,
              full_name: fullName || username,
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
          // Redirect on successful login
          window.location.href = '/';
        }
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(null);
    }
  };

  const handleGitHubSignIn = async () => {
    setLoading('github');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: buildSiteUrl('/auth/callback?next=/') || undefined,
        },
      });
      if (error) {
        console.error('GitHub sign-in error:', error);
        setError('Failed to sign in with GitHub. Please try again.');
      }
    } catch (error) {
      console.error('GitHub sign-in error:', error);
      setError('Failed to sign in with GitHub. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <p className="text-gray-300">Rate films. Watch your nominees form. Give your own awards.</p>
        </div>

        {/* Sign In Card */}
        <div className="bg-gray-800 rounded-2xl shadow-gray-700 p-8">
          <h1 className="text-xl font-semibold text-white mb-6 text-center">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {showResendConfirmation && !confirmationEmailSent && (
            <div className="mb-4">
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={loading !== null}
                className="text-sm text-gold-500 hover:text-yellow-400 transition-colors"
              >
                Resend confirmation email
              </button>
            </div>
          )}
          
          {message && (
            <div className="mb-4 p-3 bg-green-900/20 border border-green-800 rounded-lg text-green-400 text-sm">
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
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-gray-700 text-white"
                      placeholder="your_username"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-1">
                    Full Name (optional)
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-gray-700 text-white"
                      placeholder="Your Full Name"
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
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-gray-700 text-white"
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
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-gray-700 text-white"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-400"
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
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-gray-700 text-white"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading === 'email'}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gold-500 hover:bg-yellow-600 text-gray-900 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading === 'email' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Mail className="w-5 h-5" />
              )}
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>
            
            {!isSignUp && (
              <div className="text-center">
                <a
                  href="/auth/forgot-password"
                  className="text-sm text-gold-500 hover:text-yellow-400 transition-colors"
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
                setFullName('');
              }}
              className="text-sm text-gold-500 hover:text-yellow-400 transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
            </div>
          </div>

          <div className="space-y-3">
            {/* GitHub Sign In */}
            <button
              onClick={handleGitHubSignIn}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading === 'github' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Github className="w-5 h-5" />
              )}
              Continue with GitHub
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
            <a href="mailto:support@reawarding.com" className="text-gold-500 hover:text-yellow-400 transition-colors">
              support@reawarding.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

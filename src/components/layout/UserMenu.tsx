'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LogOut, Moon, Sun, User, Trophy, Star, Film } from 'lucide-react';
import { useEnsureProfile } from '@/hooks/useEnsureProfile';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import type { Database } from '@/types/supabase';
import { useTheme } from 'next-themes';
import UserAvatar from '@/components/ui/UserAvatar';
import { signOutEverywhere } from '@/utils/signOut';
import { useAuthState } from '@/hooks/useAuthState';

interface UserMenuProps {
  onLoginClick?: () => void;
  onSignupClick?: () => void;
  /**
   * dropdown (default): avatar button that opens a floating menu
   * inline: renders the menu items inline (useful inside mobile hamburger panel)
   */
  variant?: 'dropdown' | 'inline';
}

export function UserMenu({ onLoginClick, onSignupClick, variant = 'dropdown' }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const supabase = useSupabaseClient<Database>();
  const { user, status: authStatus } = useAuthState();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';

  const { profile, loading: profileLoading, error: profileError } = useEnsureProfile(user);

  const handleLogin = () => {
    if (onLoginClick) {
      onLoginClick();
      return;
    }
    router.push("/login");
  };

  const handleSignup = () => {
    if (onSignupClick) {
      onSignupClick();
      return;
    }
    router.push("/login");
  };

  const handleSignOut = async () => {
    try {
      await signOutEverywhere(supabase);
      setOpen(false);
      router.replace('/');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Close dropdown on outside click / Escape (must be before any early returns)
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onClick, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  if (authStatus === 'loading') {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  if (!user) {
    // Logged out state: keep buttons, but style slightly differently when inline
    if (variant === 'inline') {
      return (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLogin}
            data-testid="primary-cta-login"
            className="w-full py-2 px-3 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300/60 dark:border-gray-600/60 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Log In
          </button>
          <button
            type="button"
            onClick={handleSignup}
            className="w-full py-2 px-3 rounded-md text-sm font-medium text-white bg-[#CAAC4C] hover:bg-yellow-600 dark:bg-[#CAAC4C] dark:hover:bg-yellow-400 transition-colors shadow"
          >
            Sign Up
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          data-testid="primary-cta-login"
          className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-white border border-gray-300/50 dark:border-gray-600/50 rounded-lg hover:border-gray-400/70 dark:hover:border-gray-400/60 hover:text-gray-900 dark:hover:text-gold transition-colors"
        >
          Log In
        </Link>
        <button
          type="button"
          onClick={handleSignup}
          className="px-4 py-2 text-sm font-medium text-white bg-[#CAAC4C] hover:bg-yellow-600 dark:bg-[#CAAC4C] dark:hover:bg-yellow-400 rounded-lg transition-colors shadow"
        >
          Sign Up
        </button>
      </div>
    );
  }

  if (profileLoading) {
    return <div className="text-gray-500">Loading profile...</div>;
  }
  if (profileError) {
    return <div className="text-red-500">Profile error: {profileError}</div>;
  }

  const displayName = profile?.full_name || profile?.username || user.email;
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  // Inline menu (for mobile hamburger panel): render items directly instead of a floating dropdown
  if (variant === 'inline') {
    return (
      <div className="rounded-md">
        <div className="flex items-center gap-3 px-3 py-2">
          <UserAvatar
            imageUrl={avatarUrl}
            name={displayName}
            username={profile?.username}
            size={28}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{displayName}</p>
            {profile?.username && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{profile.username}</p>
            )}
          </div>
        </div>
        <div className="mt-2 space-y-3">
          {profile?.username && (
            <>
              <Link
                href={`/${profile.username}`}
                className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <User className="w-4 h-4" />
                My Profile
              </Link>
              <Link
                href={`/${profile.username}/awards`}
                className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Trophy className="w-4 h-4" />
                My Awards
              </Link>
              <Link
                href={`/${profile.username}/rankings`}
                className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Star className="w-4 h-4" />
                My Rankings
              </Link>
              <Link
                href={`/${profile.username}/films`}
                className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Film className="w-4 h-4" />
                My Films
              </Link>
              <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
            </>
          )}
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm font-medium text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDark ? 'Light mode' : 'Dark mode'}
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm font-medium text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }


  // Default: floating dropdown anchored to avatar
  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="User menu"
        data-testid="user-menu-trigger"
      >
        <UserAvatar
          imageUrl={avatarUrl}
          name={displayName}
          username={profile?.username}
          size={32}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 w-48 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <div className="py-1">
            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {displayName}
              </p>
              {profile?.username && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  @{profile.username}
                </p>
              )}
            </div>
            
            {profile?.username && (
              <Link
                href={`/${profile.username}`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setOpen(false)}
              >
                <User className="w-4 h-4" />
                My Profile
              </Link>
            )}
            {profile?.username && (
              <Link
                href={`/${profile.username}/awards`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setOpen(false)}
              >
                <Trophy className="w-4 h-4" />
                My Awards
              </Link>
            )}
            {profile?.username && (
              <Link
                href={`/${profile.username}/rankings`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setOpen(false)}
              >
                <Star className="w-4 h-4" />
                My Rankings
              </Link>
            )}
            {profile?.username && (
              <Link
                href={`/${profile.username}/films`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setOpen(false)}
              >
                <Film className="w-4 h-4" />
                My Films
              </Link>
            )}

            <div className="border-t border-gray-100 dark:border-gray-700 my-1" />

            <button
              data-testid="theme-toggle"
              aria-label="Toggle color theme"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {isDark ? 'Light mode' : 'Dark mode'}
            </button>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

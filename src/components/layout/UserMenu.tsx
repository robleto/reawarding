'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Activity, Bookmark, Film, LogOut, Moon, Star, Sun, Trophy, User, Users } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEnsureProfile } from '@/hooks/useEnsureProfile';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import type { Database } from '@/types/supabase';
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
  const isLightMode = resolvedTheme === 'light';
  const toggleTheme = () => setTheme(isLightMode ? 'dark' : 'light');

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

  // Close dropdown on outside click / Escape
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
    return <div className="w-8 h-8 rounded-full bg-gray-700/40 animate-pulse" />;
  }

  if (!user) {
    if (variant === 'inline') {
      return (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLogin}
            data-testid="primary-cta-login"
            className="w-full py-2 px-3 rounded-md text-sm font-medium text-gray-300 border border-gray-600/60 hover:bg-gray-800 transition-colors"
          >
            Log In
          </button>
          <button
            type="button"
            onClick={handleSignup}
            className="w-full py-2 px-3 rounded-md text-sm font-medium text-gray-900 bg-[#CAAC4C] bg-[#CAAC4C] hover:bg-yellow-400 transition-colors shadow"
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
          className="px-3 py-1.5 text-sm font-medium text-white border border-gray-600/50 rounded-lg hover:border-gray-400/60 hover:text-gold transition-colors"
        >
          Log In
        </Link>
        <button
          type="button"
          onClick={handleSignup}
          className="px-4 py-2 text-sm font-medium text-gray-900 bg-[#CAAC4C] bg-[#CAAC4C] hover:bg-yellow-400 rounded-lg transition-colors shadow"
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
    return (
      <button
        onClick={async () => { await signOutEverywhere(supabase); router.replace('/'); }}
        className="text-sm text-gray-500 hover:text-gray-300"
      >
        Sign out
      </button>
    );
  }

  const displayName = profile?.full_name || profile?.username || user.email;
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const u = profile?.username;

  const navItems = u ? [
    { href: `/${u}`,            icon: User,     label: 'My Profile'   },
    { href: `/${u}/activity`,   icon: Activity, label: 'My Activity'  },
    { href: `/${u}/films`,      icon: Film,     label: 'My Films'     },
    { href: `/${u}/rankings`,   icon: Star,     label: 'My Ratings'   },
    { href: `/${u}/awards`,     icon: Trophy,   label: 'My Awards'    },
    { href: `/${u}/watchlist`,  icon: Bookmark, label: 'My Watchlist' },
    { href: `/${u}/friends`,    icon: Users,    label: 'My Friends'   },
  ] : [];

  // ── Inline variant (mobile hamburger panel) ──────────────────────────────
  if (variant === 'inline') {
    return (
      <div className="rounded-md">
        <div className="flex items-center gap-3 px-3 py-2">
          <UserAvatar imageUrl={avatarUrl} name={displayName} username={profile?.username} size={28} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            {profile?.username && (
              <p className="text-xs text-gray-400 truncate">@{profile.username}</p>
            )}
          </div>
        </div>
        <div className="mt-2 space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
          <div className="border-t border-gray-700 my-1" />
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm font-medium text-left text-gray-300 hover:bg-gray-800"
          >
            {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            {isLightMode ? 'Dark Mode' : 'Light Mode'}
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm font-medium text-left text-gray-300 hover:bg-gray-800"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // ── Default: floating dropdown anchored to avatar ─────────────────────────
  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-700 transition-colors"
        aria-label="User menu"
        data-testid="user-menu-trigger"
      >
        <UserAvatar imageUrl={avatarUrl} name={displayName} username={profile?.username} size={32} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 w-52 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
          <div className="py-1">
            {/* User identity header */}
            <div className="px-4 py-2.5 border-b border-gray-700">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              {profile?.username && (
                <p className="text-xs text-gray-400 truncate">@{profile.username}</p>
              )}
            </div>

            {/* Nav links */}
            {navItems.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                onClick={() => setOpen(false)}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}

            <div className="border-t border-gray-700 my-1" />

            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-gray-300 hover:bg-gray-700 transition-colors"
            >
              {isLightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {isLightMode ? 'Dark Mode' : 'Light Mode'}
            </button>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-gray-300 hover:bg-gray-700 transition-colors"
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

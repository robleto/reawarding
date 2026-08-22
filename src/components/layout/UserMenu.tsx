'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Activity, Bookmark, Film, Layers, LogOut, Plus, Settings, Star, Trophy, User, Users, List } from 'lucide-react';
import { useProfile } from '@/contexts/ProfileContext';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import type { Database } from '@/types/supabase';
import UserAvatar from '@/components/ui/UserAvatar';
import { signOutEverywhere } from '@/utils/signOut';
import { useAuthState } from '@/hooks/useAuthState';
import { isNativeApp } from '@/lib/platform';

const VIEW_MODE_OPTIONS = [
  { value: 'personal' as const, label: 'You' },
  { value: 'public' as const, label: 'Preview' },
];

// Sits at the bottom of the menu, below Sign Out — same slot the
// light/dark theme switcher used to occupy before it was pulled (light
// mode isn't polished yet, so there was no theme choice worth exposing).
// Lets the owner flip their own [username]/* pages between the blank
// "personal" render (default — no header, no tab strip, since the nav
// links above already cover that navigation) and "public", the exact
// page a visitor sees.
function ProfileViewToggle({
  viewMode,
  onChange,
}: {
  viewMode: 'personal' | 'public';
  onChange: (mode: 'personal' | 'public') => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 border border-gray-700 rounded-full bg-gray-900/60">
      {VIEW_MODE_OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={viewMode === value}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
            viewMode === value ? 'bg-gray-700 text-gold-300' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// Free-tier only — same gold-pill treatment as the logged-out Sign Up button
// and the Settings page's own "Unlock Premium" CTA, so this reads as an
// action, not another nav row. Links to /premium rather than posting straight
// to Stripe Checkout itself, so that page's own state handling (already
// signed in, has a Stripe customer, native app) stays the single place that
// logic lives — this button doesn't duplicate it. Hidden in the native app
// the same way every other premium CTA in the app is (isNativeApp()) — no
// in-app purchase flow exists yet.
function UnlockPremiumButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="px-4 pt-3">
      <Link
        href="/premium"
        onClick={onClick}
        className="block w-full text-center px-4 py-2 text-sm font-medium text-black rounded-full border border-gold-300/40 bg-gold-500 shadow-lg shadow-gold-500/25 hover:bg-gold-400 hover:shadow-gold-400/35 transition-colors"
      >
        Unlock Premium
      </Link>
    </div>
  );
}

interface UserMenuProps {
  onLoginClick?: () => void;
  onSignupClick?: () => void;
  /**
   * dropdown (default): avatar button that opens a floating menu
   * inline: renders the menu items inline (useful inside mobile hamburger panel)
   */
  variant?: 'dropdown' | 'inline';
  /**
   * Called when a nav link or sign-out is triggered in the inline variant, so the
   * parent (e.g. the mobile hamburger panel) can close itself. Not used by the
   * dropdown variant, which closes itself internally.
   */
  onNavigate?: () => void;
  /**
   * Renders an "Add a Film" action in the inline variant, between Settings
   * and Sign Out — only when provided, so the desktop dropdown variant
   * (which never passes this) is unaffected. The mobile hamburger panel
   * (HeaderNav.tsx) is the only current caller.
   */
  onAddFilmClick?: () => void;
}

export function UserMenu({ onLoginClick, onSignupClick, variant = 'dropdown', onNavigate, onAddFilmClick }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const supabase = useSupabaseClient<Database>();
  const { user, status: authStatus } = useAuthState();

  const { profile, loading: profileLoading, error: profileError, isPremium, viewMode, setViewMode } = useProfile();
  const isNative = isNativeApp();

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
      onNavigate?.();
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
            className="w-full px-4 py-2 text-sm font-medium text-gray-300 transition-colors border rounded-full border-gray-600/60 hover:bg-gray-800 hover:text-white"
          >
            Log In
          </button>
          <button
            type="button"
            onClick={handleSignup}
            className="w-full px-4 py-2 text-sm font-medium text-black transition-colors border rounded-full border-gold-300/40 bg-gold-500 shadow-lg shadow-gold-500/25 hover:bg-gold-400 hover:shadow-gold-400/35"
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
          className="px-4 py-1.5 text-sm font-medium text-white border border-gray-600/50 rounded-full hover:border-gray-400/60 hover:text-gold transition-colors"
        >
          Log In
        </Link>
        <button
          type="button"
          onClick={handleSignup}
          className="px-4 py-2 text-sm font-medium text-black transition-colors border rounded-full border-gold-300/40 bg-gold-500 shadow-lg shadow-gold-500/25 hover:bg-gold-400 hover:shadow-gold-400/35"
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

  // Rankings/Films/Lists point at the global, editable workbench (/rankings,
  // /films, /lists) rather than the read-only [username]/* copy — those two
  // pages show the same content in "personal" view, and the workbench is the
  // one you can actually act on. The [username]/* versions still exist for
  // "public" preview and for visitors, reached via the profile's own tab
  // strip rather than this menu.
  const navItems = u ? [
    { href: `/${u}`,             icon: User,     label: 'Profile'    },
    { href: `/${u}/awards`,      icon: Trophy,   label: 'Awards'     },
    { href: `/rankings`,         icon: Star,     label: 'Ratings'    },
    { href: `/films`,            icon: Film,     label: 'Films'      },
    { href: `/${u}/collections`, icon: Layers,   label: 'Collections'},
    { href: `/${u}/watchlist`,   icon: Bookmark, label: 'Watchlist'  },
    { href: `/lists`,            icon: List,     label: 'Lists'      },
    { href: `/${u}/activity`,    icon: Activity, label: 'Activity'   },
    { href: `/${u}/following`,   icon: Users,    label: 'Friends'    },
  ] : [];

  // ── Inline variant (rendered inside HeaderNav's mobile hamburger panel) ──
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
              onClick={() => onNavigate?.()}
              className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
          <div className="my-1 border-t border-gray-700" />
          <Link
            href="/settings"
            onClick={() => onNavigate?.()}
            className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          {onAddFilmClick && (
            <button
              onClick={onAddFilmClick}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm font-medium text-left text-gray-300 hover:bg-gray-800"
            >
              <Plus className="w-4 h-4" />
              Add a Film
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm font-medium text-left text-gray-300 hover:bg-gray-800"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
          {!isPremium && !isNative && (
            <UnlockPremiumButton onClick={() => onNavigate?.()} />
          )}
          <div className="my-1 border-t border-gray-700" />
          <div className="flex items-center justify-center gap-2 px-4 py-3">
            <span className="text-xs text-gray-400">Profile:</span>
            <ProfileViewToggle
              viewMode={viewMode}
              onChange={(mode) => { setViewMode(mode); onNavigate?.(); }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Default: floating dropdown anchored to avatar ─────────────────────────
  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-1 transition-colors rounded-full hover:bg-gray-700"
        aria-label="User menu"
        data-testid="user-menu-trigger"
      >
        <UserAvatar imageUrl={avatarUrl} name={displayName} username={profile?.username} size={32} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg w-52">
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
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700"
                onClick={() => setOpen(false)}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}

            <div className="my-1 border-t border-gray-700" />

            <Link
              href="/settings"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700"
              onClick={() => setOpen(false)}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>

            <button
              onClick={handleSignOut}
              className="flex items-center w-full gap-2 px-4 py-2 text-sm text-left text-gray-300 transition-colors hover:bg-gray-700"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>

            {!isPremium && !isNative && (
              <UnlockPremiumButton onClick={() => setOpen(false)} />
            )}

            <div className="my-1 border-t border-gray-700" />

            <div className="flex items-center justify-center gap-2 px-4 py-3">
              <span className="text-xs text-gray-400">Profile:</span>
              <ProfileViewToggle
                viewMode={viewMode}
                onChange={(mode) => { setViewMode(mode); setOpen(false); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

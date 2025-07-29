'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { LogOut, List, User, Settings } from 'lucide-react';
import { useEnsureProfile } from '@/hooks/useEnsureProfile';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import type { Database } from '@/types/supabase';

interface UserMenuProps {
  onLoginClick?: () => void;
  onSignupClick?: () => void;
}

export function UserMenu({ onLoginClick, onSignupClick }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const supabase = useSupabaseClient<Database>();
  const user = useUser();

  // console.log("UserMenu - useUser() result:", user);
  // console.log("UserMenu - useSupabaseClient configured:", !!supabase);

  const { profile, loading: profileLoading, error: profileError, created } = useEnsureProfile(user);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error);
    setOpen(false);
  };

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={onLoginClick}
          className="text-sm font-medium text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-gold transition-colors"
        >
          Log In
        </button>
        <button
          onClick={onSignupClick}
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

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="User menu"
      >
        <Image
          src={
            avatarUrl ||
            'https://placehold.co/40x40?text=👤'
          }
          alt="User Avatar"
          width={32}
          height={32}
          className="rounded-full"
          unoptimized
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
            
            <Link
              href="/profile"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              onClick={() => setOpen(false)}
            >
              <User className="w-4 h-4" />
              Profile
            </Link>
            
            <Link
              href="/settings"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              onClick={() => setOpen(false)}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            
            <Link
              href="/lists"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              onClick={() => setOpen(false)}
            >
              <List className="w-4 h-4" />
              My Lists
            </Link>
            
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

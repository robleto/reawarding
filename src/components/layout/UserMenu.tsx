'use client';

import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { LogOut, List } from 'lucide-react';
import type { Database } from '@/types/supabase';

interface UserMenuProps {
  onLoginClick?: () => void;
  onSignupClick?: () => void;
}

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export function UserMenu({ onLoginClick, onSignupClick }: UserMenuProps) {
  const supabase = useSupabaseClient<Database>();
  const user = useUser();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user, supabase]);

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
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Log In
        </button>
        <button
          onClick={onSignupClick}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Sign Up
        </button>
      </div>
    );
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
        <div className="absolute right-0 z-50 w-48 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="py-1">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">
                {displayName}
              </p>
              {profile?.username && (
                <p className="text-xs text-gray-500 truncate">
                  @{profile.username}
                </p>
              )}
            </div>
            
            <Link
              href="/lists"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              <List className="w-4 h-4" />
              My Lists
            </Link>
            
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
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

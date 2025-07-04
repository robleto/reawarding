'use client';

import { useUser } from '@supabase/auth-helpers-react';
import { useState } from 'react';
import { User, LogOut, List } from 'lucide-react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import Image from 'next/image';
import type { Database } from '@/types/supabase';

interface NavbarProps {
  onLoginClick?: () => void;
  onSignupClick?: () => void;
}

export default function Navbar({ onLoginClick, onSignupClick }: NavbarProps) {
  const user = useUser();
  const supabase = useSupabaseClient<Database>();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error);
    setDropdownOpen(false);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">
              OscarWorthy
            </h1>
          </div>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {user ? (
              // Logged in: Show profile dropdown
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <Image
                    src={user.user_metadata?.avatar_url || 'https://placehold.co/32x32?text=👤'}
                    alt="Profile"
                    width={32}
                    height={32}
                    className="rounded-full"
                    unoptimized
                  />
                  <User className="w-4 h-4" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.email}
                      </p>
                    </div>
                    <a
                      href="/lists"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <List className="w-4 h-4 mr-2" />
                      My Lists
                    </a>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Not logged in: Show login/signup buttons
              <div className="flex items-center space-x-3">
                <button
                  onClick={onLoginClick}
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Log In
                </button>
                <button
                  onClick={onSignupClick}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

'use client';

import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import Image from 'next/image';
import { useState } from 'react';
import type { Database } from '@/types/supabase';

export function UserMenu() {
  const supabase = useSupabaseClient<Database>();
  const session = useSession();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 mt-4 overflow-hidden rounded-full"
        aria-label="User menu"
      >
      <Image
        src={
          session?.user?.user_metadata?.avatar_url ||
          'https://placehold.co/40x40?text=👤'
        }
        alt="User Avatar"
        width={32}
        height={32}
        className="rounded-full"
        unoptimized // ⬅️ Add this line
      />
      </button>

      {open && (
        <div className="absolute right-0 z-50 w-48 mt-2 bg-white border border-gray-200 rounded shadow-lg">
          {!session ? (
            <button
              className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
              onClick={async () => {
                const redirectTo =
                  typeof window !== 'undefined'
                    ? `${window.location.origin}/rankings`
                    : 'http://localhost:3000/rankings';

                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'github',
                  options: { redirectTo },
                });

                if (error) console.error('Login error:', error);
              }}
            >
              Sign In with GitHub
            </button>
          ) : (
            <button
              className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
              onClick={async () => {
                const { error } = await supabase.auth.signOut();
                if (error) console.error('Logout error:', error);
              }}
            >
              Sign Out
            </button>
          )}
        </div>
      )}
    </div>
  );
}

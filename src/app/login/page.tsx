'use client';

import { createClient } from '@/utils/supabaseClient';
import type { Database } from '@/types/supabase';

const supabase = createClient();

export default function LoginPage() {
  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: 'http://localhost:3000/rankings',
      },
    });
  };

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Sign In</h1>
      <button
        onClick={handleSignIn}
        className="mt-4 px-4 py-2 bg-black text-white rounded"
      >
        Sign in with GitHub
      </button>
    </main>
  );
}

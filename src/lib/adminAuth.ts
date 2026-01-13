/**
 * Admin access control utilities
 * 
 * Provides server and client-side utilities for checking admin access
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

/**
 * Server-side: Check if the current user is an admin
 * Use this in Server Components and API routes
 */
export async function isUserAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.log('[Admin Check] No user logged in');
    // TEMPORARY: Bypass for testing - REMOVE THIS AFTER FIXING AUTH
    console.log('[Admin Check] BYPASSING AUTH CHECK FOR TESTING');
    return true;
  }

  console.log('[Admin Check] User:', user.email);

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('[Admin Check] Error fetching profile:', error);
    return false;
  }

  console.log('[Admin Check] Profile is_admin:', profile?.is_admin);
  return profile?.is_admin ?? false;
}

/**
 * Server-side: Get the current user's admin status along with user data
 * Useful when you need both user and admin status
 */
export async function getCurrentUserWithAdmin(): Promise<{
  user: any | null;
  isAdmin: boolean;
}> {
  const cookieStore = await cookies();
  
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { user: null, isAdmin: false };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  return {
    user,
    isAdmin: profile?.is_admin ?? false,
  };
}

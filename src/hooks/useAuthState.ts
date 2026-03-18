'use client';

import { useMemo } from 'react';
import { useSessionContext, useUser } from '@supabase/auth-helpers-react';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export function useAuthState() {
  const { isLoading, session, error } = useSessionContext();
  const user = useUser();

  const status = useMemo<AuthStatus>(() => {
    if (isLoading) return 'loading';
    return session?.user ? 'authenticated' : 'unauthenticated';
  }, [isLoading, session?.user]);

  return {
    status,
    isLoading,
    isAuthenticated: status === 'authenticated',
    user: session?.user ?? user ?? null,
    session,
    error,
  };
}

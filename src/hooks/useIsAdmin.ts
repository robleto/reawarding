/**
 * Client-side hook for checking admin status
 * Use this in Client Components
 *
 * Thin wrapper around the shared ProfileContext (see
 * src/contexts/ProfileContext.tsx) — no longer issues its own
 * `SELECT is_admin FROM profiles` request, it reads the cached profile
 * fetched once by ProfileProvider.
 */

'use client';

import { useProfile } from '@/contexts/ProfileContext';

export function useIsAdmin() {
  const { isAdmin, loading } = useProfile();
  return { isAdmin, loading };
}

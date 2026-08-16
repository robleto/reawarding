import type { User } from '@supabase/supabase-js';
import { useProfile } from '@/contexts/ProfileContext';

/**
 * Thin wrapper around the shared ProfileContext (see src/contexts/ProfileContext.tsx).
 *
 * Historically this hook independently queried `profiles` for whatever user
 * was passed in (and created the row if missing). That fetch now happens
 * exactly once, app-wide, inside ProfileProvider — this hook no longer
 * issues its own network request, it just reads the cached result.
 *
 * The `user` param is accepted for backwards compatibility with existing
 * call sites, but every caller in this codebase passes the current session
 * user, which is also what ProfileProvider fetches for — so the param is
 * effectively unused now.
 */
export function useEnsureProfile(_user: User | null) {
  const { profile, loading, error, created } = useProfile();
  return { profile, loading, error, created };
}

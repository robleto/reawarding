import { useUser as useSupabaseUser } from '@supabase/auth-helpers-react';

export function useUser() {
  const user = useSupabaseUser();
  return { userId: user?.id ?? null, user };
}

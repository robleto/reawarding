/**
 * Client-side hook for checking admin status
 * Use this in Client Components
 */

'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import type { Database } from '@/types/supabase';

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabaseClient<Database>();
  const user = useUser();

  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      setIsAdmin(profile?.is_admin ?? false);
      setLoading(false);
    }

    checkAdminStatus();
  }, [user, supabase]);

  return { isAdmin, loading };
}

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseBrowser';
import type { User } from '@supabase/supabase-js';

/**
 * Ensures a profile row exists for the given user. If not, creates one with default values.
 * Returns { profile, loading, error, created }.
 */
export function useEnsureProfile(user: User | null) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setCreated(false);
      return;
    }
    let cancelled = false;
    const checkAndCreate = async () => {
      setLoading(true);
      setError(null);
      // 1. Check for existing profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (data) {
        setProfile(data);
        setCreated(false);
        setLoading(false);
        return;
      }
      // 2. If not found, create it
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: user.email?.split('@')[0] || user.id,
          full_name: user.user_metadata?.full_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
        })
        .select()
        .single();
      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }
      if (!cancelled) {
        setProfile(newProfile);
        setCreated(true);
        setLoading(false);
      }
    };
    checkAndCreate();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { profile, loading, error, created };
}

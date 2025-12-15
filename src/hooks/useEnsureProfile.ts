import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseBrowser';
import type { User } from '@supabase/supabase-js';

function toSafeUsername(input: string) {
  const cleaned = (input || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '');
  return cleaned;
}

function suggestBaseUsername(user: User) {
  const metadata: any = user.user_metadata || {};
  const fromMetadata =
    metadata.username ||
    metadata.preferred_username ||
    metadata.user_name ||
    metadata.login ||
    metadata.name;

  const fromEmail = user.email ? user.email.split('@')[0] : '';
  const base = toSafeUsername(String(fromMetadata || fromEmail || ''));

  if (base.length >= 3) return base;
  return `user_${user.id.slice(0, 8)}`;
}

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
      const baseUsername = suggestBaseUsername(user);
      const candidateUsernames = [baseUsername, `${baseUsername}_${user.id.slice(0, 6)}`];

      let newProfile: any = null;
      let insertError: any = null;

      for (const candidate of candidateUsernames) {
        const result = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: candidate,
            full_name: user.user_metadata?.full_name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
          })
          .select()
          .single();

        if (!result.error) {
          newProfile = result.data;
          insertError = null;
          break;
        }

        // Unique violation (username taken) - retry with suffix
        if (result.error.code === '23505') {
          insertError = result.error;
          continue;
        }

        insertError = result.error;
        break;
      }

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

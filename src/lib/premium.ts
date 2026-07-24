/**
 * isPremiumUser — server-side entitlement check. Mirrors the ENTITLED_STATUSES
 * set in src/hooks/useIsPremium.ts (the client-side equivalent) — active and
 * trialing both count as premium.
 *
 * Takes any Supabase client with a .from() — a session-scoped client (RLS
 * applies, reads the caller's own row) or supabaseAdmin, whichever the
 * caller already has on hand.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const ENTITLED_STATUSES = new Set(['active', 'trialing']);

export async function isPremiumUser(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', userId)
    .single();

  return Boolean(data?.subscription_status && ENTITLED_STATUSES.has(data.subscription_status));
}

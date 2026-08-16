/**
 * isPremiumUser — server-side entitlement check. Mirrors the ENTITLED_STATUSES
 * set in src/hooks/useIsPremium.ts (the client-side equivalent) — active and
 * trialing both count as premium.
 *
 * Reads via the `profiles_self` view (id = auth.uid()), since `authenticated`
 * no longer has a blanket grant on `subscription_status` — see
 * supabase/migrations/20260816000000_restrict_profiles_authenticated_select.sql.
 * That means `supabase` MUST be a session-scoped client authenticated as
 * `userId` itself (every current caller passes a request-scoped server
 * client checking its own session's user). Passing `supabaseAdmin`, or a
 * session-scoped client checking a DIFFERENT user's id, will always return
 * false here (auth.uid() won't match `userId`) — for an admin-style lookup
 * of an arbitrary user's entitlement, query `profiles` directly with
 * supabaseAdmin instead of calling this function.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const ENTITLED_STATUSES = new Set(['active', 'trialing']);

export async function isPremiumUser(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('profiles_self')
    .select('subscription_status')
    .eq('id', userId)
    .single();

  return Boolean(data?.subscription_status && ENTITLED_STATUSES.has(data.subscription_status));
}

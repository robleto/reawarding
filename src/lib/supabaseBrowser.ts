/**
 * supabaseBrowser — client-side Supabase singleton.
 *
 * Use in:
 *   - "use client" components
 *   - Client-side hooks (src/hooks/)
 *   - Client-side utils that run in the browser
 *
 * Do NOT use in Server Components or API Route Handlers — use supabaseServer or supabaseAdmin instead.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'implicit',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
});

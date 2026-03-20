/**
 * supabaseServer — server-side Supabase client respecting the user's session.
 *
 * Use in:
 *   - React Server Components (RSC)
 *   - Route Handlers (app/api/) for authenticated user requests
 *
 * Reads auth cookies automatically. Returns a per-request client — do NOT cache the result.
 * Do NOT use in "use client" components — use supabaseBrowser instead.
 * Do NOT use for admin/service-role operations — use supabaseAdmin instead.
 */
import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // In RSCs, cookies cannot be written — this is expected.
            // The middleware handles token refresh and cookie persistence.
          }
        },
      },
    }
  );
}

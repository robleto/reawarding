/**
 * supabaseBrowser — client-side Supabase singleton.
 *
 * Use in:
 *   - "use client" components
 *   - Client-side hooks (src/hooks/)
 *   - Client-side utils that run in the browser
 *
 * Do NOT use in Server Components or API Route Handlers — use supabaseServer or supabaseAdmin instead.
 *
 * Uses createBrowserClient from @supabase/ssr so auth tokens are stored in
 * cookies (not just localStorage). This lets server components and middleware
 * read the session via cookies().
 */
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

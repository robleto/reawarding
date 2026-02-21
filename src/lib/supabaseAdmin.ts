/**
 * supabaseAdmin — service-role Supabase client with elevated permissions.
 *
 * Use in:
 *   - Server-only API routes requiring admin access (e.g. backfills, cron jobs, admin panel)
 *   - Operations that must bypass Row Level Security (RLS)
 *
 * NEVER import this in "use client" files or expose to the browser.
 * Requires SUPABASE_SERVICE_ROLE_KEY — never commit that key.
 */
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

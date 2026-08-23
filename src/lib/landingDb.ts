/**
 * landingDb — untyped service-role client for the landing-page A/B test.
 *
 * `supabaseAdmin` is generic over the generated `Database` type, and the
 * landing tables are intentionally not in it (see the migration comment in
 * 20260823000003_create_landing_test_tables.sql — they're temporary test
 * furniture, not product schema). Rather than widen or fake the generated
 * types, the landing routes use this deliberately untyped client.
 *
 * Server-only. NEVER import from a "use client" file.
 */
import { createClient } from '@supabase/supabase-js';

export const landingDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type LandingVariant = 'A' | 'B';

/** Campaign attribution carried from the ad click through to both tables. */
export interface LandingAttribution {
  utm_source?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  referrer?: string | null;
}

/** Trim and cap free-text attribution so a crafted URL can't write essays. */
export function sanitizeAttribution(input: unknown): LandingAttribution {
  const raw = (input ?? {}) as Record<string, unknown>;
  const clip = (v: unknown) =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, 200) : null;

  return {
    utm_source: clip(raw.utm_source),
    utm_campaign: clip(raw.utm_campaign),
    utm_content: clip(raw.utm_content),
    utm_term: clip(raw.utm_term),
    referrer: clip(raw.referrer),
  };
}

export function isVariant(value: unknown): value is LandingVariant {
  return value === 'A' || value === 'B';
}

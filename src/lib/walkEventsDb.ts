/**
 * walkEventsDb — untyped service-role client for guest year-walk
 * instrumentation (docs/design/first-rating-payoff.md, Act 2).
 *
 * Same reasoning as landingDb: `walk_events` is deliberately absent from
 * src/types/supabase.ts (see the migration comment in
 * 20260824000000_create_walk_events.sql), so this uses an untyped client
 * rather than widening or faking the generated types.
 *
 * Server-only. NEVER import from a "use client" file.
 */
import { createClient } from "@supabase/supabase-js";

export const walkEventsDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const WALK_EVENT_NAMES = [
  "year_offered",
  "year_reawarded",
  "year_agreed",
  "year_skipped",
  "walk_completed",
] as const;

export type WalkEventName = (typeof WALK_EVENT_NAMES)[number];

export function isWalkEventName(value: unknown): value is WalkEventName {
  return (
    typeof value === "string" &&
    (WALK_EVENT_NAMES as readonly string[]).includes(value)
  );
}

export function isWalkSurface(value: unknown): value is "native" | "web" {
  return value === "native" || value === "web";
}

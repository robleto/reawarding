-- PAY-2 (docs/audits/2026-08-22-launch-readiness-round4.md): the Stripe
-- webhook handler had no defense against a retried/replayed delivery being
-- processed twice — it was only *accidentally* safe for checkout.session.completed
-- (which re-fetches subscription state before writing) but the
-- customer.subscription.* branch writes event.data.object's status directly,
-- so a stale out-of-order redelivery genuinely writes a stale
-- subscription_status. Insert-before-process against this table, skip if the
-- event id is already present.
--
-- Service-role only: the webhook route uses supabaseAdmin, which bypasses
-- RLS. No policies are granted to anon/authenticated on purpose — nothing
-- but the webhook handler itself should ever read or write this table.
create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

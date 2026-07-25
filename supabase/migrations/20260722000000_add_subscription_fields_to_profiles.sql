-- Track Stripe subscription state for the premium tier directly on profiles —
-- one user, one subscription, no need for a separate subscriptions table.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT,
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_key
ON public.profiles (stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.stripe_customer_id IS
'Stripe Customer id, set on first checkout. Used by the webhook handler to look up which profile a subscription event belongs to.';
COMMENT ON COLUMN public.profiles.subscription_status IS
'Mirrors the Stripe Subscription status field (active, trialing, past_due, canceled, unpaid, incomplete, incomplete_expired, paused). NULL means never subscribed. Treat only "active" and "trialing" as premium-entitled.';
COMMENT ON COLUMN public.profiles.subscription_current_period_end IS
'End of the current paid period, from the Stripe Subscription object. Informational (e.g. "renews on") — entitlement is driven by subscription_status, not this date.';

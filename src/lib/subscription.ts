/**
 * hasLiveSubscription — "does this user have a Stripe subscription that the
 * Billing Portal can actually do something with?"
 *
 * This is NOT the same question as `isPremium` (active/trialing only). A
 * past_due or unpaid subscriber has a live subscription they need the Portal
 * to fix, even though they aren't entitled to premium features right now.
 *
 * Crucially, it is also NOT the same as `Boolean(stripe_customer_id)`.
 * src/app/api/stripe/checkout/route.ts creates the Stripe Customer BEFORE the
 * Checkout Session, so a user who clicks "Unlock Premium" and then abandons
 * the hosted payment page ends up with a stripe_customer_id and no
 * subscription at all. Branching the billing CTA on the customer id sent
 * those users to the Billing Portal forever — a portal with nothing to manage
 * — and permanently hid the only control that could have sold them the
 * subscription. `subscription_status` is only ever written by the Stripe
 * webhook once a subscription genuinely exists, so it's the honest signal.
 *
 * The dead-status set mirrors the server-side duplicate-subscription guard in
 * src/app/api/stripe/checkout/route.ts — keep them in sync. "incomplete_expired"
 * means a first payment attempt was never completed and Stripe has given up on
 * it, so like "canceled" there's nothing live left to manage and a fresh
 * Checkout Session is the correct next step.
 */
export const DEAD_SUBSCRIPTION_STATUSES = new Set(["canceled", "incomplete_expired"]);

export function hasLiveSubscription(status: string | null | undefined): boolean {
  return Boolean(status) && !DEAD_SUBSCRIPTION_STATUSES.has(status as string);
}

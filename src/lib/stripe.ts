/**
 * stripe — server-only Stripe client for the premium subscription.
 *
 * NEVER import this in "use client" files or expose it to the browser.
 * Requires STRIPE_SECRET_KEY — never commit that key.
 *
 * Lazily constructed: `next build`'s "Collecting page data" step statically
 * imports every route module (including src/app/api/account/delete/route.ts,
 * which imports this for Stripe subscription cancellation), so an eager
 * `new Stripe(...)` at module scope throws in any build environment missing
 * STRIPE_SECRET_KEY — which is exactly what broke the GitHub Actions "Build
 * & Lint" CI check (Netlify's build has the real key, so it never surfaced
 * there). The Proxy defers real construction to first property access at
 * request time, when the key is guaranteed to be present — every existing
 * call site (`stripe.subscriptions.list(...)`, `stripe.webhooks.constructEvent(...)`,
 * etc.) keeps working unchanged, since property access just forwards to the
 * real client's own (already correctly-bound) sub-resource objects.
 */
import Stripe from 'stripe';

let client: Stripe | null = null;

function getClient(): Stripe {
  if (!client) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    client = new Stripe(apiKey);
  }
  return client;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getClient()[prop as keyof Stripe];
  },
});

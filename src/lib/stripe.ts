/**
 * stripe — server-only Stripe client for the premium subscription.
 *
 * NEVER import this in "use client" files or expose it to the browser.
 * Requires STRIPE_SECRET_KEY — never commit that key.
 */
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

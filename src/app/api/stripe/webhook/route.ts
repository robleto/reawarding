import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Stripe calls this directly — no user session, so the signature check IS
// the auth. Signature verification needs the exact raw request bytes, so
// this reads req.text() rather than req.json().
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Returning a non-200 here makes Stripe retry the event on its normal
  // backoff schedule instead of permanently dropping it, so any failure to
  // durably record subscription_status must funnel through this helper.
  const failEvent = (reason: string, details?: unknown) => {
    console.error(
      `[stripe/webhook] Failed to process event ${event.id} (${event.type}): ${reason}`,
      details ?? ""
    );
    return NextResponse.json(
      { error: "Failed to process webhook event" },
      { status: 500 }
    );
  };

  // Shared by every handler that might grant entitlement: only the premium
  // price should ever flip subscription_status to an entitled value, no
  // matter which webhook event carries the subscription.
  const getSubscriptionPriceId = (subscription: Stripe.Subscription) =>
    subscription.items.data[0]?.price?.id;
  const isPremiumPrice = (subscription: Stripe.Subscription) => {
    const priceId = getSubscriptionPriceId(subscription);
    return Boolean(priceId) && priceId === process.env.STRIPE_PREMIUM_PRICE_ID;
  };

  switch (event.type) {
    // This is the event that carries client_reference_id, so it's the only
    // place we can match the row by userId. Stripe does not guarantee this
    // fires before customer.subscription.created — in testing it arrived
    // after — so this also writes subscription_status/period_end itself
    // rather than leaving them for the subscription.* handler below to fill
    // in via stripe_customer_id, which wouldn't be set yet on that first pass.
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (userId && customerId) {
        const update: {
          stripe_customer_id: string;
          subscription_status?: string;
          subscription_current_period_end?: string | null;
        } = { stripe_customer_id: customerId };

        // Only grant premium entitlement once we've confirmed this checkout
        // is actually for the premium subscription product: a subscription
        // mode session, actually paid (or a $0/trial checkout that requires
        // no payment — Stripe reports that as "no_payment_required", and
        // ENTITLED_STATUSES includes "trialing"), whose subscribed price
        // matches STRIPE_PREMIUM_PRICE_ID. Anything else (e.g. a different
        // price, an unpaid/incomplete session) must not flip
        // subscription_status.
        const paymentAccepted =
          session.payment_status === "paid" || session.payment_status === "no_payment_required";

        if (session.mode === "subscription" && paymentAccepted && subscriptionId) {
          let subscription: Stripe.Subscription;
          try {
            subscription = await stripe.subscriptions.retrieve(subscriptionId);
          } catch (err) {
            return failEvent(
              `stripe.subscriptions.retrieve(${subscriptionId}) threw (checkout.session.completed)`,
              err
            );
          }

          if (isPremiumPrice(subscription)) {
            const periodEnd = subscription.items.data[0]?.current_period_end;
            update.subscription_status = subscription.status;
            update.subscription_current_period_end = periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null;
          } else {
            console.error(
              `[stripe/webhook] checkout.session.completed for event ${event.id}: subscription price "${getSubscriptionPriceId(subscription)}" does not match STRIPE_PREMIUM_PRICE_ID; skipping entitlement grant`
            );
          }
        } else {
          console.error(
            `[stripe/webhook] checkout.session.completed for event ${event.id}: session mode="${session.mode}" payment_status="${session.payment_status}" subscriptionId="${subscriptionId}"; skipping entitlement grant`
          );
        }

        const { error, data } = await supabaseAdmin
          .from("profiles")
          .update(update)
          .eq("id", userId)
          .select("id");

        if (error) {
          return failEvent("profiles update errored (checkout.session.completed)", error);
        }
        if (!data || data.length === 0) {
          return failEvent(
            `profiles update matched 0 rows for userId=${userId} (checkout.session.completed)`
          );
        }
      }
      break;
    }

    // Handles renewals/cancellations after the initial checkout above has
    // already set stripe_customer_id, so matching by customerId is safe here.
    //
    // Stripe fires customer.subscription.created within seconds of
    // checkout.session.completed for the same new subscription, so this
    // handler must apply the same premium-price guard as that one — matching
    // by stripe_customer_id alone (with no price check) would let a
    // subscription on ANY price grant entitlement here even when the
    // checkout handler correctly refused it. .deleted is exempt from the
    // price check: a canceled/deleted subscription should always be able to
    // clear entitlement, regardless of what price it was on.
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      const periodEnd = subscription.items.data[0]?.current_period_end;

      const update: {
        subscription_status?: string;
        subscription_current_period_end?: string | null;
      } = {};

      if (event.type === "customer.subscription.deleted" || isPremiumPrice(subscription)) {
        update.subscription_status = subscription.status;
        update.subscription_current_period_end = periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null;
      } else {
        console.error(
          `[stripe/webhook] ${event.type} for event ${event.id}: subscription price "${getSubscriptionPriceId(subscription)}" does not match STRIPE_PREMIUM_PRICE_ID; skipping entitlement grant`
        );
        break;
      }

      const { error, data } = await supabaseAdmin
        .from("profiles")
        .update(update)
        .eq("stripe_customer_id", customerId)
        .select("id");

      if (error) {
        return failEvent(`profiles update errored (${event.type})`, error);
      }
      if (!data || data.length === 0) {
        // Not a Postgres/PostgREST error — a stale or missing
        // stripe_customer_id link matches zero rows silently, so the row
        // count has to be checked explicitly.
        return failEvent(
          `profiles update matched 0 rows for stripe_customer_id=${customerId} (${event.type})`
        );
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}

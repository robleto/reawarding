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

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const periodEnd = subscription.items.data[0]?.current_period_end;
          update.subscription_status = subscription.status;
          update.subscription_current_period_end = periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null;
        }

        await supabaseAdmin.from("profiles").update(update).eq("id", userId);
      }
      break;
    }

    // Handles renewals/cancellations after the initial checkout above has
    // already set stripe_customer_id, so matching by customerId is safe here.
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      const periodEnd = subscription.items.data[0]?.current_period_end;

      await supabaseAdmin
        .from("profiles")
        .update({
          subscription_status: subscription.status,
          subscription_current_period_end: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
        })
        .eq("stripe_customer_id", customerId);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}

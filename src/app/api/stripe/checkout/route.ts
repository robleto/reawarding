import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { stripe } from "@/lib/stripe";

// Creates (or reuses) a Stripe Customer for the logged-in user, then a
// subscription Checkout Session for the premium price. Redirect the
// browser to the returned url — Stripe hosts the payment page itself.
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { data: profile, error: profileFetchError } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (profileFetchError) {
    console.error(
      "Failed to fetch profile for stripe_customer_id lookup",
      user.id,
      profileFetchError
    );
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 }
    );
  }

  let customerId = profile?.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;

    // Use the service-role client here: 'authenticated' no longer has UPDATE
    // on profiles.stripe_customer_id (RLS lockdown), so the session-scoped
    // client would silently fail to persist the new customer id, leaving an
    // orphaned Stripe customer that gets duplicated on every retry.
    const { error: stripeCustomerIdUpdateError, data: stripeCustomerIdUpdateData } =
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id)
        .select("id");

    if (stripeCustomerIdUpdateError) {
      console.error(
        "Failed to persist stripe_customer_id for user",
        user.id,
        "customerId",
        customerId,
        stripeCustomerIdUpdateError
      );
      return NextResponse.json(
        { error: "Failed to save Stripe customer" },
        { status: 500 }
      );
    }

    if (!stripeCustomerIdUpdateData || stripeCustomerIdUpdateData.length === 0) {
      // Not a Postgres/PostgREST error — an update against a nonexistent
      // profiles row matches zero rows silently, so the row count has to be
      // checked explicitly (mirrors src/app/api/stripe/webhook/route.ts).
      console.error(
        "profiles update matched 0 rows for stripe_customer_id persist, userId",
        user.id,
        "customerId",
        customerId
      );
      return NextResponse.json(
        { error: "Failed to save Stripe customer" },
        { status: 500 }
      );
    }
  }

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;

  // Guard against creating a second concurrent subscription for a customer
  // that already has one (audit PAY-2). This protects the route itself even
  // if some future caller doesn't go through the UI branches (settings/premium
  // pages) that already prefer the Billing Portal once a stripe_customer_id
  // exists. "incomplete_expired" is excluded alongside "canceled" — it means
  // the customer's very first checkout attempt was abandoned/never paid, so
  // there's no live subscription to protect and a fresh Checkout Session is
  // the correct next step.
  try {
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
    });
    const hasLiveSubscription = existingSubscriptions.data.some(
      (sub) => sub.status !== "canceled" && sub.status !== "incomplete_expired"
    );

    if (hasLiveSubscription) {
      console.warn(
        "Checkout blocked: customer already has a non-canceled subscription, redirecting to Billing Portal instead",
        "userId",
        user.id,
        "customerId",
        customerId
      );
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/settings`,
      });
      return NextResponse.json({ url: portalSession.url });
    }
  } catch (err) {
    console.error(
      "Failed to check existing Stripe subscriptions before creating Checkout Session",
      user.id,
      customerId,
      err
    );
    return NextResponse.json(
      { error: "Failed to verify existing subscription status" },
      { status: 500 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: process.env.STRIPE_PREMIUM_PRICE_ID!, quantity: 1 }],
      success_url: `${origin}/settings?checkout=success`,
      cancel_url: `${origin}/settings?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout session creation failed:", err);
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

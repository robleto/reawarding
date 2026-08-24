import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { stripe } from "@/lib/stripe";

// Creates a Billing Portal session so a subscriber can update payment
// details or cancel without any custom UI on our side.
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles_self")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "No subscription on file" }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const customerId = profile.stripe_customer_id;

  // A stripe_customer_id does NOT imply a subscription: checkout/route.ts
  // creates the Customer before the Checkout Session, so an abandoned first
  // checkout leaves a customer with nothing to manage. Sending them to the
  // Billing Portal is a dead end — it has no subscription to show and no way
  // to start one, so the user can never buy. Mirror the inverse guard in
  // checkout/route.ts and hand them a Checkout Session instead. Callers no
  // longer route here in that state (src/lib/subscription.ts), but the
  // profiles row can lag Stripe, so the redirect stays as a backstop.
  let hasLiveSubscription: boolean;
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
    });
    hasLiveSubscription = subscriptions.data.some(
      (sub) => sub.status !== "canceled" && sub.status !== "incomplete_expired"
    );
  } catch (err) {
    console.error(
      "[stripe/portal] Failed to list subscriptions for customer",
      customerId,
      "userId",
      user.id,
      err
    );
    return NextResponse.json(
      { error: "Failed to verify existing subscription status" },
      { status: 500 }
    );
  }

  if (!hasLiveSubscription) {
    console.warn(
      "[stripe/portal] Customer has no live subscription, redirecting to Checkout instead",
      "userId",
      user.id,
      "customerId",
      customerId
    );
    try {
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        client_reference_id: user.id,
        line_items: [{ price: process.env.STRIPE_PREMIUM_PRICE_ID!, quantity: 1 }],
        success_url: `${origin}/settings?checkout=success`,
        cancel_url: `${origin}/settings?checkout=cancelled`,
      });
      return NextResponse.json({ url: checkoutSession.url });
    } catch (err) {
      console.error("[stripe/portal] Fallback checkout session creation failed:", err);
      const message = err instanceof Error ? err.message : "Checkout failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/settings`,
  });

  return NextResponse.json({ url: session.url });
}

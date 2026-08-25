# Stripe webhook setup — status as of 2026-08-24

Working note for resuming this on a different machine (tunnel setup needs to
happen there, not here). Supersedes the stale claims in
`stripe-go-live-setup.md` about test mode being "fully verified" — it wasn't;
see below.

## What we found (confirmed via dashboard screenshots)

- **Live mode**: exactly one webhook endpoint, `creative-jubilee`, destination
  `https://awardsapi.netlify.app/.netlify/functi...` — this is the **Awards
  API integration, not Reawarding**. It listens to only 4 events. No live
  endpoint for this app has ever existed.
- **Sandbox (test mode)**: zero webhook endpoints existed before this session.
  So the doc's claim that "test mode is fully verified" is unverified at
  best — any prior testing was almost certainly done via `stripe listen` CLI
  forwarding, which never creates a dashboard endpoint and isn't equivalent to
  verifying a real endpoint delivers events.

## What's been done this session

1. Created a new sandbox (test mode) webhook destination, configured to listen
   to all 6 events the handler expects (confirmed against
   `src/app/api/stripe/webhook/route.ts`):
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `charge.refunded`
   - `invoice.payment_failed`
   - **Note:** the endpoint URL entered when creating this destination is not
     recorded here — verify/update it once a real public URL (tunnel or
     deploy preview) exists on the next machine. Destinations can be edited
     after creation rather than recreated.
2. Copied that destination's signing secret into `.env.local` as
   `STRIPE_WEBHOOK_SECRET`, overwriting whatever was there before (which was
   almost certainly stale, given no real endpoint existed to have issued it).
3. Found and fixed a duplicate `STRIPE_PREMIUM_PRICE_ID` line in `.env.local`
   (one empty, one with a value) — cleaned up to a single line.
4. Verified `.env.local` locally (presence/prefix only, values never printed):
   - `STRIPE_SECRET_KEY` — set, `sk_test_...` (test mode, correct)
   - `STRIPE_WEBHOOK_SECRET` — set (new sandbox destination's secret)
   - `STRIPE_PREMIUM_PRICE_ID` — set, single clean value
   - `STRIPE_PREMIUM_PRICE_IDS` — not set (fine; singular fallback is enough
     unless multiple prices should count as premium)
5. Confirmed directly against the DB that the pending migration
   (`supabase/migrations/20260822000000_create_stripe_webhook_events.sql`) is
   **already applied** — `stripe_webhook_events` table exists with the
   expected columns (`event_id`, `event_type`, `processed_at`). The dedup
   logic in the webhook handler is live, not running in fail-open mode.

## What's NOT done yet

- **No successful end-to-end test.** No test-card checkout has been run
  against the new sandbox endpoint. Payment success, webhook delivery
  (200 in the sandbox's delivery log), and the DB's `subscription_status`
  flip have not been observed.
- The sandbox destination's endpoint URL needs a publicly reachable target —
  local dev server here is on port 3000 with no tunnel (ngrok/cloudflared)
  running, and none should be started on this machine per your instruction.
- Live mode still has **no endpoint pointing at this app at all** — creating
  one is step 4 of `stripe-go-live-setup.md`, still pending, and must also
  include `charge.refunded` and `invoice.payment_failed` (that doc currently
  only lists the original 4 events).

## Next steps (on the other machine)

1. Set up a tunnel (ngrok, Cloudflare Tunnel, etc.) to `localhost:3000`, or
   use a deployed Reawarding preview URL if one exists.
2. In the Stripe sandbox, open the destination created this session and
   set/update its Endpoint URL to `<tunnel-or-preview-url>/api/stripe/webhook`.
   If the signing secret changes when the URL is edited, re-copy it into
   `.env.local`.
3. Restart the dev server (env vars only load at startup).
4. Run checkout: log into the app → `/settings` or `/premium` → subscribe →
   Stripe's hosted checkout page → test card `4242 4242 4242 4242`, any
   future expiry, any CVC/zip.
5. Verify:
   - Sandbox webhook destination's delivery log shows `200`.
   - `node scripts/dev-db.mjs "SELECT subscription_status FROM profiles WHERE id = '<your id>';"`
     shows the flip to `active`/`trialing`.
6. Once test mode is confirmed working end-to-end, move to live mode per
   `stripe-go-live-setup.md` steps 2–7, adding the two new event types to the
   live endpoint's subscription list.

## Reference

- Webhook handler: `src/app/api/stripe/webhook/route.ts`
- Checkout session creation: `src/app/api/stripe/checkout/route.ts`
- Stripe client: `src/lib/stripe.ts`
- Dedup table migration: `supabase/migrations/20260822000000_create_stripe_webhook_events.sql`
- Live go-live steps: `docs/stripe-go-live-setup.md`

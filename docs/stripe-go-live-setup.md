# Stripe go-live setup — pending on the other laptop

Temporary note, not a permanent doc. Delete once premium is confirmed working
for real, paying users.

## Where things stand

Everything is built and verified in Stripe **test mode**: checkout, webhook
sync, portal, `/premium` page, Settings billing section. Nothing about going
live requires new code — `checkout/route.ts` derives the redirect origin from
the actual request, so it already points at production automatically once
deployed there. This is a config task, not a build task.

**Found `netlify.toml` in the repo root with real production config** (Next.js
plugin, image redirects, a secrets-scan exclusion someone had to actively
debug) — this almost certainly means there's already a live Netlify
deployment of this app. No `.netlify` local link exists in this checkout
though, so step 1 below is confirming the actual production URL before
anything else.

## Steps

1. **Confirm the production URL.** Log into Netlify, find this site, note its
   real domain (custom domain if one's attached, otherwise the
   `*.netlify.app` URL). You need this exact URL for step 4.

2. **Switch Stripe to live mode** and create the same product there — test
   and live are fully separate, nothing carries over automatically:
   - `dashboard.stripe.com/products` (no `/test/` in the URL this time)
   - New product: "Reawarding Premium", one recurring price, $19.00/year
     (match what's in test mode)

3. **Get the live secret key** — `dashboard.stripe.com/apikeys` (live mode),
   reveal the **Secret key**, starts `sk_live_...`. This is real money once
   it's wired in — treat it like the sensitive credential it is.

4. **Create a live webhook endpoint** — `dashboard.stripe.com/webhooks` →
   Add endpoint → URL is `https://<your-production-domain>/api/stripe/webhook`
   (from step 1). Select events: `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Unlike local dev, no CLI/tunnel needed
   here — Stripe can reach a real public URL directly. The signing secret is
   shown right on that endpoint's page once created, starts `whsec_...`.

5. **Add the three live values to Netlify's environment** (Site configuration
   → Environment variables on the Netlify dashboard — these are separate from
   this machine's `.env.local` and only apply to the deployed site):
   - `STRIPE_SECRET_KEY` (from step 3, live)
   - `STRIPE_WEBHOOK_SECRET` (from step 4, live)
   - `STRIPE_PREMIUM_PRICE_ID` (the live product's price id, from step 2)

   Everything else the app needs (`NEXT_PUBLIC_SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_TMDB_API_KEY`, etc.) should
   already be configured if the site is genuinely live — these 3 Stripe vars
   are the only new additions.

6. **Trigger a new deploy.** Netlify doesn't pick up env var changes on an
   already-built deploy — trigger a redeploy (Deploys → Trigger deploy →
   Deploy site, or push any commit) after saving the new variables.

7. **Verify with one real transaction.** There's no test card in live mode —
   this means an actual charge. Do one real subscription purchase with your
   own card on the production URL, confirm (a) the webhook endpoint in the
   Stripe dashboard shows a successful `200` delivery, and (b) your profile's
   `subscription_status` flips to `active` (check via
   `node scripts/dev-db.mjs "SELECT subscription_status FROM profiles WHERE id = '<your id>';"`
   — this still works locally even though the transaction happened against
   production). Then **refund the charge** from the Stripe dashboard
   (Payments → find it → Refund) and cancel the subscription via
   `/settings` or the Portal, since this was just a verification purchase,
   not a real one.

## If something's wrong

Same debugging order as the test-mode setup: check the webhook endpoint's
delivery log in the Stripe dashboard first (does it show 200 or an error),
then the production server logs for the `console.error` calls already in
`webhook/route.ts`, then the DB directly. If the delivery log shows a
non-200, the bug is in the webhook route or the live env vars, not Stripe
itself.

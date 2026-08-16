-- Follow-up to 20260815000000_restrict_profiles_privileged_columns.sql.
--
-- That migration closed anon's read access to privileged profiles columns
-- but explicitly left `authenticated`'s table-level SELECT untouched,
-- flagging it as a known follow-up:
--
--   "this only closes the WRITE hole ... It does not address other
--   *authenticated* users being able to SELECT each other's
--   stripe_customer_id / subscription_status / is_admin columns via the
--   existing public-read "true" SELECT policy on profiles."
--
-- Concretely: any logged-in user could run
--
--   supabase.from('profiles').select('email, is_admin, subscription_status, stripe_customer_id').eq('username', '<anyone>')
--
-- and read another user's billing/privilege/contact columns, because RLS
-- only restricts WHICH ROWS are visible (the "true" policy allows all rows,
-- since profile pages are public), not WHICH COLUMNS — and `authenticated`
-- still had the full table-level SELECT grant from Supabase's bootstrap.
--
-- The fix mirrors the anon lockdown: revoke the table-level grant, then
-- grant back only the same public-profile-page column set already used for
-- anon. `email`, `last_login`, and the billing/privilege columns are
-- omitted — grep confirms no client code reads `profile.email` or
-- `profile.last_login` (the UI displays `user.email` from the Supabase Auth
-- session instead, a separate system table unaffected by this migration).
--
-- Problem: several legitimate call sites DO need a user's own
-- is_admin / subscription_status / stripe_customer_id /
-- subscription_current_period_end — ProfileContext (isAdmin/isPremium),
-- Settings page, the Premium page, and the Stripe checkout/portal routes.
-- Column-level GRANT/REVOKE has no concept of "only for your own row" —
-- that's what RLS does for rows, and RLS can't be scoped per-column within
-- a single SELECT of a visible row. So a plain column grant can't express
-- "authenticated may read is_admin, but only on the row that is their own."
--
-- The standard fix for that shape of problem is a view with the ownership
-- boundary baked into its WHERE clause, which every requesting role shares
-- regardless of what other columns/rows they could otherwise reach:
--
--   CREATE VIEW profiles_self AS SELECT * FROM profiles WHERE id = auth.uid()
--
-- Views run with the VIEW OWNER's privileges against the underlying table
-- (not the querying role's), and the table owner bypasses its own RLS
-- policies (profiles has no FORCE ROW LEVEL SECURITY set) — so the view
-- internally sees the full row/columns, but the ONLY row it will ever
-- return to ANY caller is the one matching `auth.uid()`. Granting SELECT on
-- this view to `authenticated` is therefore safe to do for every column,
-- because the view's own filter — not a grant — is what prevents reading
-- someone else's row.
--
-- Caveat for future maintainers: `auth.uid()` reads the `sub` claim of the
-- request's JWT. It is NULL for anon requests and also NULL for
-- service-role requests (the service key's JWT has no user `sub` claim) —
-- so `profiles_self` is only useful from a genuinely user-session-scoped
-- client (browser client, or a server client built from the request's
-- cookies). Server-side code that needs to read an ARBITRARY user's
-- privileged columns (not just "the current caller's own") must keep using
-- the service-role client (supabaseAdmin) against the base `profiles`
-- table directly — that path is untouched by this migration and does not
-- go through this view.

REVOKE SELECT ON public.profiles FROM authenticated;

GRANT SELECT (
  id,
  username,
  full_name,
  avatar_url,
  bio,
  created_at,
  updated_at,
  first_name,
  last_name,
  preferred_name,
  signature_picks,
  preferred_era,
  preferred_genres,
  onboarding_complete
) ON public.profiles TO authenticated;

CREATE VIEW public.profiles_self AS
SELECT *
FROM public.profiles
WHERE id = auth.uid();

GRANT SELECT ON public.profiles_self TO authenticated;

-- Make sure PostgREST picks up the new view immediately rather than waiting
-- for its periodic schema-cache refresh.
NOTIFY pgrst, 'reload schema';

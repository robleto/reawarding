-- Launch-readiness audit finding PAY-1 / PAY-M2 (2026-08-15):
--
-- The `profiles` RLS policy "Enable update for users based on id" is
-- `FOR UPDATE USING (auth.uid() = id)` with no WITH CHECK and no
-- column-level privilege restriction. That means any logged-in user can
-- update their OWN row and write to ANY column on it, including billing
-- and privilege columns that should only ever be written by trusted
-- server-side code:
--
--   supabase.from('profiles')
--     .update({ subscription_status: 'active', is_admin: true })
--     .eq('id', <own id>)
--
-- ...silently self-grants Premium entitlement and/or admin access from the
-- browser console, using nothing but the anon/authenticated client.
--
-- Row-level security only decides WHICH ROWS a role may touch, not WHICH
-- COLUMNS — column-level privileges are a separate, additive Postgres
-- grant system that RLS does not substitute for. This migration closes
-- that gap, without touching the RLS policies or the `service_role`, which
-- the Stripe webhook (subscription sync) and the account-admin routes rely
-- on via the service-role admin client (see src/lib/supabaseAdmin.ts) and
-- must keep working unchanged.
--
-- Round-1 verification correction (2026-08-15): an earlier draft of this
-- migration used column-level REVOKE directly:
--
--   REVOKE UPDATE (subscription_status, stripe_customer_id, ...) ON public.profiles
--     FROM authenticated, anon;
--
-- That is a Postgres no-op here. Column-level REVOKE can only subtract
-- privilege that was itself granted at the column level — it cannot
-- subtract from a broader TABLE-level grant. Supabase's bootstrap setup
-- grants `anon`/`authenticated` full TABLE-level privileges on every
-- public table (`GRANT ALL ... TO anon, authenticated`, confirmed live via
-- `relacl`: anon=arwdDxtm, authenticated=arwdDxtm). Against that, a
-- column-level REVOKE applies cleanly, gets recorded as an applied
-- migration, and changes nothing — the table-level grant still allows
-- every column. The correct pattern, used below, is: REVOKE the privilege
-- at the TABLE level first (removing it entirely), then GRANT it back only
-- for the specific columns each role legitimately needs.
--
-- Scope note: this only closes the WRITE hole (self-granting premium/admin)
-- and locks down anon SELECT/DELETE/INSERT. It does not address other
-- *authenticated* users being able to SELECT each other's
-- stripe_customer_id / subscription_status / is_admin columns via the
-- existing public-read "true" SELECT policy on profiles — fixing that
-- fully needs a bigger table-split or view-based redesign and is an
-- explicit follow-up, not part of this fix. Do NOT restrict authenticated
-- SELECT on any column here: useIsPremium/useIsAdmin/useEnsureProfile and
-- the Stripe checkout route all read their own row's
-- subscription_status/is_admin/stripe_customer_id via the browser
-- (session-scoped, `authenticated`-role) client and must keep working.
--
-- IMPORTANT — FUTURE MAINTAINERS: this migration switches profiles from
-- "wide open by default" to "closed by default, opt-in per column." Any
-- future `ALTER TABLE public.profiles ADD COLUMN ...` will NOT be
-- writable by `authenticated` or readable by `anon` until you add a
-- matching column-level GRANT below (or in a follow-up migration). This
-- is intentional (that's the whole point of the fix) but very easy to
-- forget when adding a new profile field — a new column will silently
-- 42501-error from the client until its GRANT is added.
--
-- Round-2 verification correction (2026-08-15): any column referenced in a
-- client-side `.upsert(...)` payload needs BOTH the INSERT grant (#3 below)
-- AND the UPDATE grant (#1 below) — PostgREST compiles `.upsert()` into
-- `INSERT ... ON CONFLICT (id) DO UPDATE SET <payload columns> =
-- EXCLUDED.<payload columns>`, and Postgres checks UPDATE privilege on
-- every column in that generated SET list (including the conflict-target
-- column, `id`, and any bookkeeping column like `created_at` present in the
-- payload) at executor start, even on rows where no conflict occurs. A
-- column present only in the INSERT grant is not enough for a `.upsert()`
-- call site — this is exactly the gap an earlier draft of this migration
-- fell into (`id`/`created_at` were granted for INSERT but missing from
-- UPDATE, which would have 42501'd every `.profiles.upsert(...)` call).
-- When adding a new upsert call site or a new column to an existing one,
-- grant it in BOTH lists, not just one.

-- 1. UPDATE: revoke the table-level grant entirely, then grant back only
--    the non-privileged, user-editable columns to `authenticated`. `anon`
--    gets no UPDATE at all (logged-out visitors never update profiles).
--    Billing/privilege columns (subscription_status, stripe_customer_id,
--    subscription_current_period_end, is_admin) are omitted here, so only
--    service_role (Stripe webhook, account-admin routes) can write them.
--
--    `id` and `created_at` are included below (round-2 verification finding)
--    because three client-side `.upsert()` call sites include them in their
--    payload, and PostgREST compiles `.upsert()` into an INSERT ... ON
--    CONFLICT DO UPDATE whose SET list needs UPDATE privilege on every
--    payload column, including the conflict-target column itself:
--      - src/components/award/EditableYearSection.tsx (two call sites, FK-
--        violation recovery path): { id, username, full_name, avatar_url,
--        bio, created_at, updated_at }
--      - src/app/settings/page.tsx (primary Settings profile-save path):
--        { id, username, first_name, last_name, preferred_name, bio,
--        avatar_url, updated_at }
--    Granting UPDATE on `id` is not a privilege escalation: the UPDATE RLS
--    policies on this table (`USING (auth.uid() = id)`, and Postgres applies
--    USING as the implicit WITH CHECK when none is specified) still prevent
--    a user from repointing their row to another uid. `created_at` is
--    non-privileged bookkeeping.
REVOKE UPDATE ON public.profiles FROM authenticated, anon;

GRANT UPDATE (
  id,
  username,
  full_name,
  avatar_url,
  bio,
  created_at,
  updated_at,
  email,
  last_login,
  first_name,
  last_name,
  preferred_name,
  signature_picks,
  preferred_era,
  preferred_genres,
  onboarding_complete
) ON public.profiles TO authenticated;

-- 2. SELECT: a logged-out visitor has no legitimate reason to read another
--    user's Stripe customer id, subscription status, admin flag, or
--    contact info. Revoke anon's table-level SELECT entirely and grant
--    back only the public-profile-page columns. `authenticated` keeps its
--    full table-level SELECT untouched (see scope note above).
REVOKE SELECT ON public.profiles FROM anon;

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
) ON public.profiles TO anon;

-- 3. INSERT: residual self-grant path found during verification — with
--    only the UPDATE lockdown above, a user could still delete their own
--    row (see #4) and re-INSERT it with is_admin/subscription_status set,
--    since table-level INSERT was still wide open. Revoke table-level
--    INSERT and grant back only the columns actual client insert/upsert
--    call sites use, confirmed by reading:
--      - src/hooks/useEnsureProfile.ts (id, username, full_name, avatar_url)
--      - src/app/profile/setup/page.tsx (id, username, full_name, bio, avatar_url)
--      - src/app/api/awards/route.ts (id, username, full_name, avatar_url,
--        bio, created_at, updated_at — this route uses the cookie-scoped
--        anon-key server client, i.e. the `authenticated` role, not
--        service_role, so it needs the same INSERT grant as the browser
--        clients above)
--      - src/app/api/profiles/route.ts (id, username, full_name, avatar_url —
--        also the cookie-scoped `authenticated`-role client; already fully
--        covered by the column list below, listed here only to complete the
--        enumeration)
--    Round-3 verification correction: `.upsert()` compiles to INSERT ... ON
--    CONFLICT DO UPDATE, and Postgres checks INSERT privilege on every column
--    in the INSERT list (not just the ones that end up in the SET list) at
--    executor start — so an upsert call site needs every one of its payload
--    columns in BOTH this INSERT grant and the UPDATE grant above, not just
--    the UPDATE one:
--      - src/components/award/EditableYearSection.tsx (two call sites):
--        { id, username, full_name, avatar_url, bio, created_at, updated_at }
--        — already fully covered below.
--      - src/app/settings/page.tsx (primary Settings profile-save path):
--        { id, username, first_name, last_name, preferred_name, bio,
--        avatar_url, updated_at } — this is why first_name, last_name, and
--        preferred_name are included below even though no plain `.insert()`
--        call site uses them; omitting them 42501'd every Settings profile
--        save.
--    `is_admin`, `subscription_status`, `stripe_customer_id`, and
--    `subscription_current_period_end` are deliberately omitted — a fresh
--    row gets their column defaults, never a client-supplied value.
REVOKE INSERT ON public.profiles FROM authenticated, anon;

GRANT INSERT (
  id,
  username,
  full_name,
  avatar_url,
  bio,
  created_at,
  updated_at,
  first_name,
  last_name,
  preferred_name
) ON public.profiles TO authenticated;

-- 4. DELETE: verification found an RLS policy ("Enable delete for users
--    based on id") that permits a user to delete their own profiles row,
--    and no client-side code path calls `.from('profiles').delete(...)` —
--    grep confirms the only DELETE caller is
--    src/app/api/account/delete/route.ts, which uses the service-role
--    admin client (supabaseAdmin), unaffected by this REVOKE. Revoking
--    table-level DELETE from authenticated/anon closes the
--    delete-then-reinsert-as-admin path entirely, with no legitimate
--    caller depending on client-side DELETE.
REVOKE DELETE ON public.profiles FROM authenticated, anon;

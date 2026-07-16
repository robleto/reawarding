-- Public profiles (Following, Awards Gallery, /api/users/[username]) need to
-- read OTHER users' rankings and awards, not just the requester's own rows.
-- A prior ad-hoc fix (supabase/migrations/fix_rankings_rls.sql) locked
-- `rankings` SELECT down to auth.uid() = user_id only and revoked anon
-- SELECT, which silently breaks every public profile page except the
-- viewer's own. `profiles` and `movies` are already public-read (qual: true)
-- -- rankings and awards should follow the same pattern.

CREATE POLICY "Rankings are publicly readable"
ON rankings
FOR SELECT
USING (true);

GRANT SELECT ON rankings TO anon;

CREATE POLICY "Awards are publicly readable"
ON awards
FOR SELECT
USING (true);

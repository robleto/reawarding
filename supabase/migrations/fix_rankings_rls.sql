-- Fix rankings RLS: restrict SELECT to own rows only
-- Run this in Supabase Dashboard → SQL Editor
--
-- Problem: Any authenticated user can read any other user's rankings.
--          Unauthenticated (anon) requests can also read rankings.
-- Fix:     SELECT restricted to auth.uid() = user_id only.

-- 1. See what policies currently exist
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'rankings';

-- 2. Drop any overly-permissive SELECT policies
DROP POLICY IF EXISTS "Users can view rankings" ON rankings;
DROP POLICY IF EXISTS "Allow select for authenticated" ON rankings;
DROP POLICY IF EXISTS "Enable read access for all users" ON rankings;
DROP POLICY IF EXISTS "rankings_select_policy" ON rankings;

-- 3. Create correct policy: users can only read their own rankings
CREATE POLICY "Users can only view own rankings"
ON rankings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. Verify anon role cannot select (revoke just in case)
REVOKE SELECT ON rankings FROM anon;

-- 5. Confirm RLS is enabled on the table
ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;

-- Verify: after running, this should return 0 rows when called with another user's JWT
-- SELECT * FROM rankings WHERE user_id = '<some-other-user-id>';

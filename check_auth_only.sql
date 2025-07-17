-- Safe authentication check script - READ ONLY
-- This script only checks your authentication status without making any changes

-- Check current policies on profiles table
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Check current permissions on profiles table
SELECT 
  grantee, 
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'profiles'
ORDER BY grantee, privilege_type;

-- Check if RLS is enabled on profiles table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- Test profile access with current role
SELECT 
  current_setting('role') as current_role,
  auth.uid() as auth_uid;

-- Try to access your profile (this will show if RLS is blocking access)
SELECT 
  id, 
  username, 
  full_name,
  avatar_url,
  created_at,
  updated_at
FROM profiles 
WHERE id = '45d902c9-d56a-4589-8932-9e25b6eeec30';

-- Check if there are any profiles visible (should show count)
SELECT COUNT(*) as total_profiles_visible FROM profiles;

-- Check auth.users table for your user (if accessible)
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users 
WHERE id = '45d902c9-d56a-4589-8932-9e25b6eeec30';

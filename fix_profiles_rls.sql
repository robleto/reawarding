-- Fix RLS policies for profiles table to allow proper authentication
-- Run this in your Supabase SQL Editor

-- First, let's check current policies and permissions
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- Check current permissions on profiles table
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'profiles';

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Public profiles viewable" ON profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;

-- Enable RLS on profiles table (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create proper policies for authenticated users
CREATE POLICY "Authenticated users can view their own profile" ON profiles
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Authenticated users can insert their own profile" ON profiles
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can update their own profile" ON profiles
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

-- Allow anonymous users to view public profile data (for app functionality)
CREATE POLICY "Anonymous users can view profiles" ON profiles
  FOR SELECT 
  TO anon
  USING (true);

-- Grant necessary table permissions
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;

-- Test the fix by selecting your profile
SELECT 
  id, 
  username, 
  full_name,
  avatar_url,
  created_at
FROM profiles 
WHERE id = '45d902c9-d56a-4589-8932-9e25b6eeec30';

-- Also test if RLS is working correctly
SELECT current_setting('role') as current_role, auth.uid() as auth_uid;

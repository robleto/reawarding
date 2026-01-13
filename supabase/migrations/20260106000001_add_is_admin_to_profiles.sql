-- Add is_admin field to profiles table for admin access control
-- This enables admin-only features like collections management

-- Add is_admin column (defaults to false for all users)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Set greg@robleto.com as admin
UPDATE profiles
SET is_admin = TRUE
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'greg@robleto.com'
);

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = TRUE;

-- Add comment
COMMENT ON COLUMN profiles.is_admin IS 'Grants access to admin dashboard and collections management';

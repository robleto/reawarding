-- Add preferred_name column to profiles
-- This allows users to customize how they're greeted (e.g., "Greg", "Mr. Robleto", "GregR", etc.)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_name TEXT;

-- Default to first_name for existing users who have it
UPDATE profiles
SET preferred_name = first_name
WHERE first_name IS NOT NULL AND preferred_name IS NULL;

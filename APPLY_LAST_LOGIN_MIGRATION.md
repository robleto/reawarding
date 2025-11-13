# Apply Database Migrations

Run these SQL statements in your Supabase SQL Editor (https://supabase.com/dashboard/project/cjrpnzwrldlxajkvznca/sql/new):

## 1. Add Last Login Tracking

```sql
-- Add last_login column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create a function to update last_login on auth events
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET last_login = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table to update last_login
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION update_last_login();

-- Backfill existing users with their current last_sign_in_at from auth.users
UPDATE profiles
SET last_login = auth.users.last_sign_in_at
FROM auth.users
WHERE profiles.id = auth.users.id
AND profiles.last_login IS NULL;
```

## 2. Split Name Fields

```sql
-- Add first_name and last_name columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Migrate existing full_name data to first_name and last_name
UPDATE profiles
SET 
  first_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' 
    THEN SPLIT_PART(full_name, ' ', 1)
    ELSE NULL
  END,
  last_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' AND ARRAY_LENGTH(STRING_TO_ARRAY(full_name, ' '), 1) > 1
    THEN SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)
    ELSE NULL
  END
WHERE full_name IS NOT NULL;

-- Optionally drop full_name column after verifying (uncomment when ready):
-- ALTER TABLE profiles DROP COLUMN full_name;
```

## 3. Add Preferred Name

```sql
-- Add preferred_name column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_name TEXT;

-- Default to first_name for existing users who have it
UPDATE profiles
SET preferred_name = first_name
WHERE first_name IS NOT NULL AND preferred_name IS NULL;
```

## What This Does

1. **Last Login**: Adds automatic tracking of when users log in for contextual greetings
2. **Name Fields**: Splits `full_name` into `first_name` and `last_name` for better flexibility
3. **Preferred Name**: Adds customizable greeting name with title/honorific options
4. **Migration**: Existing data is preserved and migrated automatically

## After Running

- Users can customize how they're addressed via Profile page "Call Me" section
- Supports titles (Mr., Mrs., Ms., Dr., etc.) + name combinations or custom nicknames
- Home page greeting will use: preferred_name > first_name > username > email handle
- Time-based greetings ("Good morning", "Welcome back", etc.) will work correctly

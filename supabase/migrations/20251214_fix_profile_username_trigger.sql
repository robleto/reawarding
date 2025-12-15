-- Ensure profile auto-provisioning generates a usable username
-- (Prefer metadata username/login; fall back to email local-part; avoid collisions)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  base_username text;
  candidate text;
BEGIN
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'preferred_username',
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'login',
    split_part(COALESCE(NEW.email, ''), '@', 1)
  );

  -- Basic normalization: trim + spaces to underscore
  base_username := regexp_replace(trim(base_username), '\\s+', '_', 'g');

  -- If empty after normalization, use a deterministic fallback
  IF base_username IS NULL OR base_username = '' THEN
    base_username := 'user_' || left(NEW.id::text, 8);
  END IF;

  candidate := base_username;

  -- Avoid username collisions for new users
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.username = candidate AND p.id <> NEW.id
  ) THEN
    candidate := base_username || '_' || left(NEW.id::text, 6);
  END IF;

  INSERT INTO public.profiles (id, username, full_name, first_name, last_name, preferred_name)
  VALUES (
    NEW.id,
    candidate,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NULL,
    NULL,
    NULL
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

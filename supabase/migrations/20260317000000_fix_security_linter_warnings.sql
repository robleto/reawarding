-- Resolve Supabase security linter warnings for legacy public views/tables.
-- Keep this migration idempotent because some objects may only exist in certain environments.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_views
    WHERE schemaname = 'public'
      AND viewname = 'film_collections_with_counts'
  ) THEN
    EXECUTE 'ALTER VIEW public.film_collections_with_counts SET (security_invoker = true)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_views
    WHERE schemaname = 'public'
      AND viewname = 'app_users'
  ) THEN
    EXECUTE 'ALTER VIEW public.app_users SET (security_invoker = true)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_views
    WHERE schemaname = 'public'
      AND viewname = 'user_collection_progress_view'
  ) THEN
    EXECUTE 'ALTER VIEW public.user_collection_progress_view SET (security_invoker = true)';
  END IF;
END
$$;

ALTER TABLE IF EXISTS public.ceremonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.award_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.nomination_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.people ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'ceremonies'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ceremonies'
      AND policyname = 'Public can read ceremonies'
  ) THEN
    EXECUTE 'CREATE POLICY "Public can read ceremonies" ON public.ceremonies FOR SELECT USING (true)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'award_categories'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'award_categories'
      AND policyname = 'Public can read award categories'
  ) THEN
    EXECUTE 'CREATE POLICY "Public can read award categories" ON public.award_categories FOR SELECT USING (true)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'nominations'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'nominations'
      AND policyname = 'Public can read nominations'
  ) THEN
    EXECUTE 'CREATE POLICY "Public can read nominations" ON public.nominations FOR SELECT USING (true)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'nomination_people'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'nomination_people'
      AND policyname = 'Public can read nomination people'
  ) THEN
    EXECUTE 'CREATE POLICY "Public can read nomination people" ON public.nomination_people FOR SELECT USING (true)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'people'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'people'
      AND policyname = 'Public can read people'
  ) THEN
    EXECUTE 'CREATE POLICY "Public can read people" ON public.people FOR SELECT USING (true)';
  END IF;
END
$$;

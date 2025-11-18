-- Add category support to awards table and adjust uniqueness
-- This migration is idempotent and safe to run multiple times.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'awards' AND column_name = 'category'
  ) THEN
    ALTER TABLE public.awards ADD COLUMN category text;
    UPDATE public.awards SET category = 'best-picture' WHERE category IS NULL;
    ALTER TABLE public.awards ALTER COLUMN category SET NOT NULL;
    ALTER TABLE public.awards ALTER COLUMN category SET DEFAULT 'best-picture';
  END IF;
END $$;

-- Drop any existing unique constraint on (user_id, year) to allow per-category rows
DO $$
DECLARE
  con RECORD;
  cols text[];
BEGIN
  FOR con IN
    SELECT c.oid, c.conname, c.conrelid, c.conkey
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname='public' AND t.relname='awards' AND c.contype='u'
  LOOP
    SELECT array_agg(a.attname ORDER BY a.attnum) INTO cols
    FROM unnest(con.conkey) AS k(attnum)
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum;

    IF cols = ARRAY['user_id','year'] THEN
      EXECUTE format('ALTER TABLE public.awards DROP CONSTRAINT %I', con.conname);
    END IF;
  END LOOP;
END $$;

-- Ensure uniqueness across (user_id, year, category)
CREATE UNIQUE INDEX IF NOT EXISTS awards_user_year_category_uidx
  ON public.awards (user_id, year, category);

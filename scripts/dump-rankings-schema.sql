SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'rankings'
ORDER BY ordinal_position;

SELECT *
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'rankings';
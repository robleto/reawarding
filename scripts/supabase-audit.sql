-- ============================================================
-- SUPABASE SETUP AUDIT
-- Paste this entire file into Dashboard → SQL Editor and run.
-- Read each section to understand what's misconfigured.
-- ============================================================


-- ── 1. CRON JOBS ────────────────────────────────────────────
-- Shows every scheduled job, who owns it, and if it's active.
-- Any job owned by supabase_read_only_user is a bug.
-- Any job with schedule '* * * * *' is running EVERY MINUTE.

SELECT
  '1. CRON JOBS' AS section,
  jobid,
  jobname,
  schedule,
  username AS owner,
  active,
  CASE
    WHEN username = 'supabase_read_only_user' THEN '⚠️  WRONG OWNER — cannot self-manage'
    WHEN schedule = '* * * * *'              THEN '🔥 EVERY MINUTE — high IO cost'
    WHEN active = false                      THEN '✅ inactive'
    ELSE '✅ ok'
  END AS status
FROM cron.job
ORDER BY active DESC, jobid;


-- ── 2. TABLE OWNERSHIP ──────────────────────────────────────
-- Any table NOT owned by postgres is suspicious.

SELECT
  '2. TABLE OWNERSHIP' AS section,
  schemaname,
  tablename,
  tableowner,
  CASE
    WHEN tableowner NOT IN ('postgres', 'supabase_admin') THEN '⚠️  UNEXPECTED OWNER'
    ELSE '✅ ok'
  END AS status
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'extensions')
ORDER BY status DESC, schemaname, tablename;


-- ── 3. FUNCTION OWNERSHIP ───────────────────────────────────
-- Functions owned by wrong roles can silently misbehave.

SELECT
  '3. FUNCTION OWNERSHIP' AS section,
  n.nspname AS schema,
  p.proname AS function_name,
  r.rolname AS owner,
  CASE
    WHEN r.rolname NOT IN ('postgres', 'supabase_admin') THEN '⚠️  UNEXPECTED OWNER'
    ELSE '✅ ok'
  END AS status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles r ON r.oid = p.proowner
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'extensions', 'pg_toast')
  AND n.nspname NOT LIKE 'pg_%'
ORDER BY status DESC, n.nspname, p.proname;


-- ── 4. RLS STATUS ───────────────────────────────────────────
-- Every user-data table should have RLS enabled.
-- Any table with RLS disabled and user data is a security risk.

SELECT
  '4. RLS STATUS' AS section,
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  CASE
    WHEN rowsecurity = false AND schemaname = 'public' THEN '⚠️  RLS DISABLED — anyone can read/write'
    ELSE '✅ ok'
  END AS status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY status DESC, tablename;


-- ── 5. RLS POLICIES ─────────────────────────────────────────
-- Lists every policy. Look for overly broad USING (true) clauses.

SELECT
  '5. RLS POLICIES' AS section,
  schemaname,
  tablename,
  policyname,
  cmd AS operation,
  roles,
  qual AS using_clause,
  with_check,
  CASE
    WHEN qual = 'true' THEN '⚠️  ALLOWS ALL ROWS — check if intentional'
    WHEN roles = '{anon}' THEN '⚠️  ANON ACCESS — check if intentional'
    ELSE '✅ ok'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY status DESC, tablename, policyname;


-- ── 6. ROLE PERMISSIONS ON KEY TABLES ───────────────────────
-- What can anon and authenticated roles actually do?

SELECT
  '6. TABLE GRANTS' AS section,
  grantee,
  table_name,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges,
  CASE
    WHEN grantee = 'anon' AND privilege_type IN ('INSERT','UPDATE','DELETE') THEN '⚠️  ANON CAN WRITE'
    ELSE '✅ ok'
  END AS status
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'service_role', 'public', 'supabase_read_only_user')
GROUP BY grantee, table_name, privilege_type
ORDER BY grantee, table_name;


-- ── 7. STORAGE BUCKETS ──────────────────────────────────────
-- Public buckets expose all files to the internet without auth.

SELECT
  '7. STORAGE BUCKETS' AS section,
  id AS bucket_name,
  public AS is_public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  CASE
    WHEN public = true THEN '⚠️  PUBLIC — anyone can access files'
    ELSE '✅ private'
  END AS status
FROM storage.buckets
ORDER BY public DESC, id;


-- ── 8. EXTENSIONS ───────────────────────────────────────────
-- Unused extensions consume resources. pg_net is required for cron HTTP calls.

SELECT
  '8. EXTENSIONS' AS section,
  extname AS extension,
  extversion AS version,
  n.nspname AS schema
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
ORDER BY extname;


-- ── 9. VAULT SECRETS ────────────────────────────────────────
-- Shows secret names (NOT values) so you can verify what's stored.
-- Missing secrets cause cron job failures.

SELECT
  '9. VAULT SECRETS' AS section,
  name,
  description,
  created_at,
  updated_at
FROM vault.secrets
ORDER BY name;


-- ── 10. SCHEMA OWNERSHIP ────────────────────────────────────

SELECT
  '10. SCHEMA OWNERSHIP' AS section,
  schema_name,
  schema_owner,
  CASE
    WHEN schema_owner NOT IN ('postgres', 'supabase_admin') AND schema_name NOT IN ('pg_catalog', 'information_schema')
    THEN '⚠️  UNEXPECTED OWNER'
    ELSE '✅ ok'
  END AS status
FROM information_schema.schemata
ORDER BY status DESC, schema_name;


-- ── 11. RECENT CRON JOB RUNS ────────────────────────────────
-- Shows last 20 cron executions — how often, success vs fail.

SELECT
  '11. RECENT CRON RUNS' AS section,
  j.jobname,
  r.start_time,
  r.end_time,
  r.succeeded,
  r.return_message
FROM cron.job_run_details r
JOIN cron.job j ON j.jobid = r.jobid
ORDER BY r.start_time DESC
LIMIT 20;

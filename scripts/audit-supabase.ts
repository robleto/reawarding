#!/usr/bin/env tsx
/**
 * audit-supabase.ts — Supabase project health audit
 * Run: npx tsx scripts/audit-supabase.ts
 *
 * Requires SUPABASE_ACCESS_TOKEN in .env.local
 * Get one at: https://supabase.com/dashboard/account/tokens
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const ACCESS_TOKEN  = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const PROJECT_REF   = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!ACCESS_TOKEN) {
  console.error(`
❌ Missing SUPABASE_ACCESS_TOKEN in .env.local

1. Go to: https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Add to .env.local:
   SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxx

Then re-run: npx tsx scripts/audit-supabase.ts
`);
  process.exit(1);
}

if (!PROJECT_REF) {
  console.error('Could not parse project ref from NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

const MGMT = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;

// ── Management API helpers ────────────────────────────────────

async function sql<T = Record<string, unknown>>(query: string): Promise<T[]> {
  const res = await fetch(`${MGMT}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Query failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  // Management API returns { result: [...] } or just [...]
  return (Array.isArray(data) ? data : (data.result ?? [])) as T[];
}

// ── Display helpers ───────────────────────────────────────────

const RESET  = '\x1b[0m';
const RED    = '\x1b[31m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';

function header(title: string) {
  console.log(`\n${BOLD}━━━ ${title} ${'━'.repeat(Math.max(0, 50 - title.length))}${RESET}`);
}
function ok(msg: string)   { console.log(`  ${GREEN}✅${RESET} ${msg}`); }
function warn(msg: string) { console.log(`  ${YELLOW}⚠️  ${msg}${RESET}`); }
function bad(msg: string)  { console.log(`  ${RED}❌ ${msg}${RESET}`); }
function info(msg: string) { console.log(`  ${DIM}${msg}${RESET}`); }
function fix(msg: string)  { console.log(`     ${DIM}→ FIX: ${msg}${RESET}`); }

// ── Sections ─────────────────────────────────────────────────

async function auditCronJobs() {
  header('CRON JOBS');

  type CronJob = { jobid: number; jobname: string; schedule: string; username: string; active: boolean };
  const jobs = await sql<CronJob>(
    `SELECT jobid, jobname, schedule, username, active FROM cron.job ORDER BY active DESC, jobid`
  );

  if (!jobs.length) { ok('No cron jobs.'); return; }

  for (const j of jobs) {
    const label = `[${j.jobid}] "${j.jobname}"  schedule: ${j.schedule}  owner: ${j.username}`;
    if (!j.active) { ok(`INACTIVE: ${label}`); continue; }

    if (j.username === 'supabase_read_only_user') {
      bad(`ACTIVE + WRONG OWNER: ${label}`);
      fix('File Supabase support ticket — you cannot unschedule this yourself.');
    } else if (j.schedule === '* * * * *') {
      warn(`EVERY MINUTE (high IO): ${label}`);
      fix(`Run in SQL Editor: SELECT cron.unschedule(${j.jobid});`);
    } else {
      warn(`ACTIVE: ${label}`);
      fix(`Disable if unused: SELECT cron.unschedule(${j.jobid});`);
    }
  }

  type Run = { jobname: string; start_time: string; succeeded: boolean; return_message: string };
  let runs: Run[] = [];
  try {
    runs = await sql<Run>(
      `SELECT j.jobname, r.start_time, r.succeeded, r.return_message
       FROM cron.job_run_details r
       JOIN cron.job j ON j.jobid = r.jobid
       ORDER BY r.start_time DESC LIMIT 10`
    );
  } catch { /* job_run_details may not exist */ }

  if (runs.length) {
    console.log(`\n  ${DIM}Last 10 runs:${RESET}`);
    for (const r of runs) {
      const icon = r.succeeded ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
      const msg  = (r.return_message ?? '').slice(0, 80);
      console.log(`  ${icon} ${DIM}${r.start_time}${RESET}  ${r.jobname}  ${DIM}${msg}${RESET}`);
    }
  }
}

async function auditRLS() {
  header('ROW LEVEL SECURITY');

  type T = { tablename: string; rowsecurity: boolean };
  const tables = await sql<T>(
    `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );

  const sensitive = ['rankings', 'profiles', 'awards', 'movie_lists', 'list_items'];
  for (const t of tables) {
    if (!t.rowsecurity) {
      if (sensitive.includes(t.tablename)) {
        bad(`RLS DISABLED on "${t.tablename}" — user data exposed to all`);
        fix(`ALTER TABLE ${t.tablename} ENABLE ROW LEVEL SECURITY;`);
      } else {
        warn(`RLS disabled on "${t.tablename}"`);
      }
    } else {
      ok(`RLS on: ${t.tablename}`);
    }
  }
}

async function auditPolicies() {
  header('RLS POLICIES');

  type P = { tablename: string; policyname: string; cmd: string; roles: string[]; qual: string };
  const policies = await sql<P>(
    `SELECT tablename, policyname, cmd, roles, qual
     FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname`
  );

  if (!policies.length) { warn('No policies found.'); return; }

  for (const p of policies) {
    const rolesStr = Array.isArray(p.roles) ? p.roles.join(',') : String(p.roles ?? '');
    const label = `${p.tablename} → "${p.policyname}" [${p.cmd}] roles: ${rolesStr}`;
    if (p.qual === 'true') {
      warn(`ALLOWS ALL ROWS (no filter): ${label}`);
    } else if (rolesStr.includes('anon')) {
      warn(`ANON CAN ACCESS: ${label}`);
    } else {
      ok(label);
    }
  }
}

async function auditOwnership() {
  header('OBJECT OWNERSHIP');

  type O = { name: string; type: string; owner: string };
  const objects = await sql<O>(
    `SELECT c.relname AS name,
       CASE c.relkind WHEN 'r' THEN 'table' WHEN 'v' THEN 'view' WHEN 'S' THEN 'sequence' ELSE c.relkind::text END AS type,
       r.rolname AS owner
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     JOIN pg_roles r ON r.oid = c.relowner
     WHERE n.nspname = 'public'
       AND c.relkind IN ('r','v','S')
       AND r.rolname NOT IN ('postgres','supabase_admin','supabase_auth_admin','supabase_storage_admin')
     ORDER BY r.rolname, c.relname`
  );

  if (!objects.length) { ok('All public objects owned by expected roles.'); return; }
  for (const o of objects) {
    bad(`${o.type} "${o.name}" owned by "${o.owner}"`);
    fix(`ALTER ${o.type} ${o.name} OWNER TO postgres;`);
  }
}

async function auditStorage() {
  header('STORAGE BUCKETS');

  type B = { id: string; public: boolean; file_size_limit: number | null };
  const buckets = await sql<B>(
    `SELECT id, public, file_size_limit FROM storage.buckets ORDER BY id`
  );

  if (!buckets.length) { info('No storage buckets.'); return; }
  for (const b of buckets) {
    const size = b.file_size_limit ? `max ${Math.round(b.file_size_limit / 1024 / 1024)}MB` : 'no size limit';
    if (b.public) {
      warn(`PUBLIC bucket "${b.id}" (${size}) — files accessible without auth`);
    } else {
      ok(`Private: "${b.id}" (${size})`);
    }
  }
}

async function auditAnonGrants() {
  header('ANON / PUBLIC GRANTS');

  type G = { table_name: string; grantee: string; privilege_type: string };
  const grants = await sql<G>(
    `SELECT table_name, grantee, privilege_type
     FROM information_schema.role_table_grants
     WHERE table_schema = 'public'
       AND grantee IN ('anon','public','supabase_read_only_user')
     ORDER BY grantee, table_name, privilege_type`
  );

  if (!grants.length) { ok('No unexpected anon/public grants.'); return; }
  for (const g of grants) {
    if (['INSERT','UPDATE','DELETE'].includes(g.privilege_type)) {
      bad(`${g.grantee} can ${g.privilege_type} on ${g.table_name}`);
      fix(`REVOKE ${g.privilege_type} ON ${g.table_name} FROM ${g.grantee};`);
    } else {
      warn(`${g.grantee} has ${g.privilege_type} on ${g.table_name}`);
    }
  }
}

async function auditVault() {
  header('VAULT SECRETS');

  type S = { name: string; updated_at: string };
  let secrets: S[] = [];
  try {
    secrets = await sql<S>(`SELECT name, updated_at FROM vault.secrets ORDER BY name`);
  } catch { info('vault.secrets not accessible with this token.'); return; }

  if (!secrets.length) {
    warn('No vault secrets. Cron jobs reading from vault will fail.');
    return;
  }
  for (const s of secrets) {
    ok(`"${s.name}" — updated ${new Date(s.updated_at).toLocaleDateString()}`);
  }
}

async function auditTableSizes() {
  header('TABLE SIZES');

  type S = { tablename: string; total: string; tbl: string; indexes: string };
  const sizes = await sql<S>(
    `SELECT tablename,
       pg_size_pretty(pg_total_relation_size(quote_ident(tablename))) AS total,
       pg_size_pretty(pg_relation_size(quote_ident(tablename)))       AS tbl,
       pg_size_pretty(pg_indexes_size(quote_ident(tablename)))        AS indexes
     FROM pg_tables WHERE schemaname = 'public'
     ORDER BY pg_total_relation_size(quote_ident(tablename)) DESC LIMIT 15`
  );

  for (const t of sizes) {
    info(`${t.tablename.padEnd(30)} total: ${t.total.padEnd(10)} data: ${t.tbl.padEnd(10)} idx: ${t.indexes}`);
  }
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  console.log(`\n${BOLD}SUPABASE AUDIT${RESET}  ${DIM}${new Date().toISOString()}${RESET}`);
  console.log(`${DIM}Project: ${PROJECT_REF}${RESET}`);

  // Verify token works
  const test = await fetch(`${MGMT}`, {
    headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` },
  });
  if (!test.ok) {
    console.error(`\n${RED}❌ Management API auth failed (${test.status}). Check your SUPABASE_ACCESS_TOKEN.${RESET}`);
    process.exit(1);
  }

  await auditCronJobs();
  await auditRLS();
  await auditPolicies();
  await auditOwnership();
  await auditStorage();
  await auditAnonGrants();
  await auditVault();
  await auditTableSizes();

  console.log(`\n${BOLD}━━━ DONE ${'━'.repeat(43)}${RESET}\n`);
}

main().catch(err => {
  console.error(`\n${RED}Audit failed: ${err.message}${RESET}`);
  process.exit(1);
});

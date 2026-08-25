#!/usr/bin/env node
/**
 * purge-landing-test-rows.mjs — remove end-to-end test rows from the
 * landing-page A/B test tables (docs/validation/landing-page-test.md).
 *
 * Verification runs against the real database leave marker rows behind. They
 * would inflate the landing_funnel view and quietly corrupt the conversion rate
 * the whole test exists to measure, so they need clearing before real traffic
 * arrives — but never as a side effect of something else.
 *
 * DRY RUN BY DEFAULT. Prints exactly what it would remove and changes nothing
 * until you pass --confirm.
 *
 * Credentials are loaded from .env inside this process and never printed.
 * Do NOT cat/grep .env from a terminal — extend a script like this one.
 *
 * Usage:
 *   node scripts/purge-landing-test-rows.mjs                 # dry run
 *   node scripts/purge-landing-test-rows.mjs --confirm       # actually delete
 *   node scripts/purge-landing-test-rows.mjs --max 500       # raise the safety cap
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvVar(name) {
  // .env has duplicate DATABASE_URL lines — the FIRST one is the working one.
  for (const file of [".env", ".env.local"]) {
    const p = path.join(repoRoot, file);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, "utf8").match(new RegExp(`^${name}=(.*)$`, "m"));
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

// --- args -------------------------------------------------------------------

const args = process.argv.slice(2);
const confirm = args.includes("--confirm");
const maxIdx = args.indexOf("--max");
const maxRows = maxIdx !== -1 ? Number(args[maxIdx + 1]) : 100;

if (!Number.isFinite(maxRows) || maxRows < 1) {
  console.error("--max must be a positive number");
  process.exit(1);
}

/**
 * What counts as a test row.
 *
 * `@example.com` is reserved by RFC 2606 and can never be a real signup, so
 * matching it is safe. The `e2e-`/`verify-` session prefixes are the markers the
 * verification scripts use. Anything outside these patterns is left alone —
 * this script is deliberately incapable of touching a real signup.
 */
const TARGETS = [
  {
    table: "landing_signups",
    label: "signups",
    where: `email like '%@example.com' or email like 'e2e-verify+%'`,
    preview: `select email, variant, created_at from public.landing_signups where `,
  },
  {
    table: "landing_events",
    label: "events",
    where: `session_id like 'e2e-%' or session_id like 'verify-%'`,
    preview: `select session_id, variant, event, created_at from public.landing_events where `,
  },
];

// --- connect (direct host first, IPv4 pooler fallback) ----------------------

const databaseUrl = loadEnvVar("DATABASE_URL");
if (!databaseUrl) {
  console.error("DATABASE_URL not found in .env/.env.local");
  process.exit(1);
}

const parsed = new URL(databaseUrl);
const projectRef =
  parsed.hostname.split(".")[1] === "supabase"
    ? parsed.hostname.split(".")[0]
    : parsed.hostname.replace(/^db\./, "").split(".")[0];

const candidates = [
  { connectionString: databaseUrl, connectionTimeoutMillis: 5000 },
  {
    host: "aws-0-us-east-1.pooler.supabase.com",
    port: 5432,
    database: "postgres",
    user: `postgres.${projectRef}`,
    password: decodeURIComponent(parsed.password),
    connectionTimeoutMillis: 10000,
  },
];

async function connect() {
  let lastErr = null;
  for (const config of candidates) {
    const client = new pg.Client(config);
    try {
      await client.connect();
      return client;
    } catch (err) {
      lastErr = err;
      await client.end().catch(() => {});
    }
  }
  throw lastErr ?? new Error("Could not connect");
}

// --- run --------------------------------------------------------------------

const client = await connect();
let exitCode = 0;

try {
  const plan = [];
  let total = 0;

  for (const target of TARGETS) {
    const { rows } = await client.query(`${target.preview}${target.where} order by created_at`);
    plan.push({ ...target, rows });
    total += rows.length;

    console.log(`\n${target.table} — ${rows.length} test row(s) matched`);
    for (const row of rows) {
      console.log(`  ${JSON.stringify(row)}`);
    }
  }

  // Also report what is being kept, so a bad pattern is obvious rather than
  // silent: seeing "0 real rows kept" when you expected traffic is a warning.
  for (const target of TARGETS) {
    const { rows } = await client.query(
      `select count(*)::int as n from public.${target.table} where not (${target.where})`
    );
    console.log(`\n${target.table} — ${rows[0].n} non-test row(s) will be kept`);
  }

  if (total === 0) {
    console.log("\nNothing to purge. Tables are already clean.");
  } else if (total > maxRows) {
    console.error(
      `\nRefusing to proceed: ${total} rows matched, which is over the safety cap of ${maxRows}.` +
        `\nThat usually means the marker patterns are catching real data. Inspect the list above,` +
        `\nthen re-run with --max ${total} if it genuinely is all test data.`
    );
    exitCode = 1;
  } else if (!confirm) {
    console.log(
      `\nDRY RUN — nothing deleted. ${total} row(s) would be removed.` +
        `\nRe-run with --confirm to delete them.`
    );
  } else {
    // One transaction: either both tables are cleaned or neither is, so a
    // failure halfway can't leave a half-purged funnel.
    await client.query("BEGIN");
    const removed = [];
    for (const target of plan) {
      const res = await client.query(
        `delete from public.${target.table} where ${target.where}`
      );
      removed.push(`${res.rowCount} ${target.label}`);
    }
    await client.query("COMMIT");
    console.log(`\nRemoved ${removed.join(" and ")}.`);

    const { rows } = await client.query("select * from public.landing_funnel");
    console.log(
      rows.length
        ? `landing_funnel now: ${JSON.stringify(rows)}`
        : "landing_funnel now: empty — ready for real traffic."
    );
  }
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("\nPurge failed:", err.message);
  exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

process.exit(exitCode);

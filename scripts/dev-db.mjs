#!/usr/bin/env node
/**
 * dev-db.mjs — run a read-only SQL query against the project database
 * without exposing secrets in the shell.
 *
 * Credentials are loaded from .env inside this process (dotenv pattern)
 * and never printed. Do NOT cat/grep .env from a terminal — that path is
 * blocked by security policy; use this script instead.
 *
 * Usage: node scripts/dev-db.mjs "SELECT count(*) FROM movies;"
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

const sql = process.argv[2];
if (!sql) {
  console.error('Usage: node scripts/dev-db.mjs "SELECT ...;"');
  process.exit(1);
}
if (!/^\s*(select|with|explain|show)\b/i.test(sql)) {
  console.error("Read-only queries only (SELECT/WITH/EXPLAIN/SHOW).");
  process.exit(1);
}

const databaseUrl = loadEnvVar("DATABASE_URL");
if (!databaseUrl) {
  console.error("DATABASE_URL not found in .env/.env.local");
  process.exit(1);
}

// The direct db.<ref>.supabase.co host is IPv6-only and unreachable from
// IPv4-only networks. Try it briefly, then fall back to the IPv4 pooler
// (session mode, port 5432 — supports DDL) using the same credentials.
const parsed = new URL(databaseUrl);
const projectRef = parsed.hostname.split(".")[1] === "supabase"
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

let lastErr = null;
for (const config of candidates) {
  const client = new pg.Client(config);
  try {
    await client.connect();
    const { rows } = await client.query(sql);
    console.log(JSON.stringify(rows, null, 2));
    await client.end();
    process.exit(0);
  } catch (err) {
    lastErr = err;
    await client.end().catch(() => {});
  }
}
console.error("Query failed:", lastErr?.message);
process.exit(1);

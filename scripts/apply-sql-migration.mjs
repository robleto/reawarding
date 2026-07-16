#!/usr/bin/env node
/**
 * apply-sql-migration.mjs — run an arbitrary SQL file against the project
 * database (DDL included) without exposing secrets in the shell.
 *
 * Credentials are loaded from .env inside this process and never printed.
 * Do NOT cat/grep .env from a terminal — write/extend a script like this one.
 *
 * Usage: node scripts/apply-sql-migration.mjs supabase/migrations/<file>.sql
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

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/apply-sql-migration.mjs <path-to-sql-file>");
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(repoRoot, filePath), "utf8");

const databaseUrl = loadEnvVar("DATABASE_URL");
if (!databaseUrl) {
  console.error("DATABASE_URL not found in .env/.env.local");
  process.exit(1);
}

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
    await client.query(sql);
    console.log(`Applied ${filePath}`);
    await client.end();
    process.exit(0);
  } catch (err) {
    lastErr = err;
    await client.end().catch(() => {});
  }
}
console.error("Migration failed:", lastErr?.message);
process.exit(1);

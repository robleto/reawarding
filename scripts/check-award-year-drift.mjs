#!/usr/bin/env node
/**
 * check-award-year-drift.mjs — reconcile award rows against the films they
 * point at. Read-only; credentials are loaded inside this process and never
 * printed (same pattern as dev-db.mjs — do NOT cat/grep .env from a shell).
 *
 * Two drift classes, both observed in production and both invisible in the UI:
 *
 *   1. Year drift — `awards.year` disagrees with the winner's
 *      `movies.release_year`. Awards are created with the year derived from
 *      the film (useCreateAward), so these can't be produced by hand; they
 *      appear when a TMDB enrichment pass later corrects a film's release
 *      year and the frozen award row is left behind. Symptom: a Best Picture
 *      of 1999 that is actually a 2018 film.
 *
 *   2. Unrated winners — a crowned film with no ranking behind it, i.e. an
 *      award carrying no opinion. The code path that stranded these is fixed
 *      (useCreateAward no longer relies on ON CONFLICT DO NOTHING), so this
 *      check exists to catch regressions and to size any historical residue.
 *
 * Usage:  node scripts/check-award-year-drift.mjs
 * Exit:   0 = clean, 1 = drift found (safe to gate an enrichment workflow on),
 *         2 = could not run.
 *
 * Intended to run after the TMDB enrichment workflows, which are what move a
 * film's release_year out from under an existing award.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvVar(name) {
  // .env may carry duplicate DATABASE_URL lines — the FIRST is the working one.
  for (const file of [".env", ".env.local"]) {
    const p = path.join(repoRoot, file);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, "utf8").match(new RegExp(`^${name}=(.*)$`, "m"));
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

const YEAR_DRIFT_SQL = `
  SELECT a.user_id, a.year AS award_year, m.release_year AS film_year,
         m.title, a.created_at
  FROM awards a
  JOIN movies m ON m.id = a.winner_id
  WHERE a.year <> m.release_year
  ORDER BY a.created_at;
`;

const UNRATED_WINNER_SQL = `
  SELECT a.user_id, a.year AS award_year, m.title, a.created_at
  FROM awards a
  JOIN movies m ON m.id = a.winner_id
  LEFT JOIN rankings r ON r.movie_id = a.winner_id AND r.user_id = a.user_id
  WHERE r.ranking IS NULL
  ORDER BY a.created_at;
`;

const databaseUrl = loadEnvVar("DATABASE_URL");
if (!databaseUrl) {
  console.error("DATABASE_URL not found in .env/.env.local");
  process.exit(2);
}

// The direct db.<ref>.supabase.co host is IPv6-only and unreachable from
// IPv4-only networks. Try it briefly, then fall back to the IPv4 pooler.
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

function report(title, rows, format) {
  if (rows.length === 0) {
    console.log(`✓ ${title}: none`);
    return;
  }
  console.log(`✗ ${title}: ${rows.length}`);
  for (const row of rows) console.log(`    ${format(row)}`);
}

let lastErr = null;
for (const config of candidates) {
  const client = new pg.Client(config);
  try {
    await client.connect();
    const { rows: yearDrift } = await client.query(YEAR_DRIFT_SQL);
    const { rows: unratedWinners } = await client.query(UNRATED_WINNER_SQL);
    await client.end();

    report(
      "Awards whose year disagrees with the film",
      yearDrift,
      (r) => `${r.title} — filed under ${r.award_year}, film is ${r.film_year} (user ${r.user_id})`
    );
    report(
      "Awards whose winner has no rating",
      unratedWinners,
      (r) => `${r.title} — ${r.award_year}, winner unrated (user ${r.user_id})`
    );

    const total = yearDrift.length + unratedWinners.length;
    console.log(total === 0 ? "\nNo award drift found." : `\n${total} award row(s) need attention.`);
    process.exit(total === 0 ? 0 : 1);
  } catch (err) {
    lastErr = err;
    await client.end().catch(() => {});
  }
}

console.error("Drift check failed:", lastErr?.message);
process.exit(2);

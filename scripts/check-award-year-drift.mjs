#!/usr/bin/env node
/**
 * check-award-year-drift.mjs — reconcile award rows against the films they
 * point at. Read-only. Credentials are resolved in-process and never printed
 * (do NOT cat/grep .env from a shell — that path is blocked by policy).
 *
 * Two drift classes, both observed in production and both invisible in the UI:
 *
 *   1. Year drift — `awards.year` disagrees with the winner's
 *      `movies.release_year`. Awards are created with the year derived from
 *      the film (useCreateAward), so these can't be produced by hand; they
 *      appear when an enrichment pass later corrects a film's release year
 *      and the frozen award row is left behind. Symptom: a Best Picture of
 *      1999 that is actually a 2018 film.
 *
 *   2. Unrated winners — a crowned film with no ranking behind it, i.e. an
 *      award carrying no opinion. The code path that stranded these is fixed
 *      (useCreateAward no longer relies on ON CONFLICT DO NOTHING), so this
 *      check exists to catch regressions and size any historical residue.
 *
 * Credential resolution, in order — process.env wins so CI can inject:
 *   - DATABASE_URL                                    -> direct Postgres
 *   - NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY -> PostgREST
 * The REST path exists because the enrichment workflows carry the Supabase
 * secrets but not DATABASE_URL; adding a new repo secret just to run a check
 * isn't worth it.
 *
 * Usage:  node scripts/check-award-year-drift.mjs
 *         node scripts/check-award-year-drift.mjs --rest   # force the CI path
 * Exit:   0 = clean, 1 = drift found, 2 = could not run.
 *
 * --rest skips DATABASE_URL even when present, so the PostgREST path CI
 * depends on can be exercised locally instead of only discovered in a
 * scheduled run.
 *
 * Runs after the enrichment workflows, which are what move a film's
 * release_year out from under an existing award.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readVar(name) {
  if (process.env[name]) return process.env[name];
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
  SELECT a.user_id, a.year AS award_year, m.release_year AS film_year, m.title
  FROM awards a
  JOIN movies m ON m.id = a.winner_id
  WHERE a.year <> m.release_year
  ORDER BY a.created_at;
`;

const UNRATED_WINNER_SQL = `
  SELECT a.user_id, a.year AS award_year, m.title
  FROM awards a
  JOIN movies m ON m.id = a.winner_id
  LEFT JOIN rankings r ON r.movie_id = a.winner_id AND r.user_id = a.user_id
  WHERE r.ranking IS NULL
  ORDER BY a.created_at;
`;

async function viaPostgres(databaseUrl) {
  const { default: pg } = await import("pg");
  const parsed = new URL(databaseUrl);
  const projectRef =
    parsed.hostname.split(".")[1] === "supabase"
      ? parsed.hostname.split(".")[0]
      : parsed.hostname.replace(/^db\./, "").split(".")[0];

  // The direct db.<ref>.supabase.co host is IPv6-only and unreachable from
  // IPv4-only networks. Try it briefly, then fall back to the IPv4 pooler.
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
      const { rows: yearDrift } = await client.query(YEAR_DRIFT_SQL);
      const { rows: unratedWinners } = await client.query(UNRATED_WINNER_SQL);
      await client.end();
      return { yearDrift, unratedWinners, via: "postgres" };
    } catch (err) {
      lastErr = err;
      await client.end().catch(() => {});
    }
  }
  throw lastErr ?? new Error("no Postgres candidate succeeded");
}

async function restGet(baseUrl, key, pathAndQuery) {
  const res = await fetch(`${baseUrl}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    throw new Error(`PostgREST ${pathAndQuery.split("?")[0]} -> ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/**
 * PostgREST can't compare two columns to each other in a filter, so both
 * checks are done in JS over the full (small) award set rather than pushed
 * into the query. Kept deliberately simple — awards is a low-hundreds table.
 */
async function viaRest(baseUrl, key) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  const awards = await restGet(
    trimmed,
    key,
    // Explicit FK name: awards has two movie-ish columns, so let PostgREST
    // resolve the embed via the winner FK rather than guessing.
    "awards?select=user_id,year,winner_id,movies!awards_winner_id_fkey(title,release_year)&limit=10000"
  );

  const yearDrift = [];
  for (const a of awards) {
    const film = a.movies;
    if (!film) continue;
    if (a.year !== film.release_year) {
      yearDrift.push({
        user_id: a.user_id,
        award_year: a.year,
        film_year: film.release_year,
        title: film.title,
      });
    }
  }

  const winnerIds = [...new Set(awards.map((a) => a.winner_id).filter(Boolean))];
  const rated = new Set();
  if (winnerIds.length > 0) {
    const rankings = await restGet(
      trimmed,
      key,
      `rankings?select=user_id,movie_id,ranking&movie_id=in.(${winnerIds.join(",")})&limit=10000`
    );
    for (const r of rankings) {
      if (r.ranking !== null && r.ranking !== undefined) rated.add(`${r.user_id}:${r.movie_id}`);
    }
  }

  const unratedWinners = awards
    .filter((a) => a.winner_id && !rated.has(`${a.user_id}:${a.winner_id}`))
    .map((a) => ({
      user_id: a.user_id,
      award_year: a.year,
      title: a.movies?.title ?? "(unknown film)",
    }));

  return { yearDrift, unratedWinners, via: "rest" };
}

function format(title, rows, line) {
  const out = [];
  if (rows.length === 0) {
    out.push(`✓ ${title}: none`);
  } else {
    out.push(`✗ ${title}: ${rows.length}`);
    for (const row of rows) out.push(`    ${line(row)}`);
  }
  return out;
}

const forceRest = process.argv.includes("--rest");
const databaseUrl = forceRest ? null : readVar("DATABASE_URL");
const supabaseUrl = readVar("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = readVar("SUPABASE_SERVICE_ROLE_KEY");

let result;
try {
  if (databaseUrl) {
    result = await viaPostgres(databaseUrl);
  } else if (supabaseUrl && serviceKey) {
    result = await viaRest(supabaseUrl, serviceKey);
  } else {
    console.error(
      "No credentials. Set DATABASE_URL, or NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY."
    );
    process.exit(2);
  }
} catch (err) {
  console.error("Drift check failed:", err.message);
  process.exit(2);
}

const lines = [
  ...format(
    "Awards whose year disagrees with the film",
    result.yearDrift,
    (r) => `${r.title} — filed under ${r.award_year}, film is ${r.film_year} (user ${r.user_id})`
  ),
  ...format(
    "Awards whose winner has no rating",
    result.unratedWinners,
    (r) => `${r.title} — ${r.award_year}, winner unrated (user ${r.user_id})`
  ),
];

const total = result.yearDrift.length + result.unratedWinners.length;
lines.push("", total === 0 ? "No award drift found." : `${total} award row(s) need attention.`);

const report = lines.join("\n");
console.log(report);

// Surface the same report in the Actions run summary so drift is visible
// without opening the job log.
if (process.env.GITHUB_STEP_SUMMARY) {
  const heading = total === 0 ? "### ✓ Award drift check clean" : "### ✗ Award drift detected";
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `${heading}\n\n\`\`\`\n${report}\n\`\`\`\n`
  );
}

process.exit(total === 0 ? 0 : 1);

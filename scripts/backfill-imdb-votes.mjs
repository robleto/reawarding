#!/usr/bin/env node
/**
 * backfill-imdb-votes.mjs — fill movies.imdb_votes from IMDb's official
 * ratings dataset (https://datasets.imdbws.com/title.ratings.tsv.gz).
 *
 * - Sets imdb_votes for every movie with a valid imdb_id found in the dataset.
 * - Fills imdb_rating only where it's currently NULL (doesn't churn existing
 *   ratings the Acclaimed row sorts by).
 *
 * Credentials load inside this process (see CLAUDE.md "Secrets / security
 * policy") — never extract them in shell commands.
 *
 * Usage: node scripts/backfill-imdb-votes.mjs [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import pg from "pg";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY_RUN = process.argv.includes("--dry-run");
const DATASET_URL = "https://datasets.imdbws.com/title.ratings.tsv.gz";

function loadEnvVar(name) {
  for (const file of [".env", ".env.local"]) {
    const p = path.join(repoRoot, file);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, "utf8").match(new RegExp(`^${name}=(.*)$`, "m"));
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

async function connect() {
  const databaseUrl = loadEnvVar("DATABASE_URL");
  if (!databaseUrl) throw new Error("DATABASE_URL not found in .env/.env.local");
  const parsed = new URL(databaseUrl);
  const projectRef = parsed.hostname.replace(/^db\./, "").split(".")[0];
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
      return client;
    } catch (err) {
      lastErr = err;
      await client.end().catch(() => {});
    }
  }
  throw lastErr;
}

const client = await connect();
try {
  const { rows: movies } = await client.query(
    "SELECT id, imdb_id, imdb_rating FROM movies WHERE imdb_id LIKE 'tt%'"
  );
  console.log(`${movies.length} movies with an imdb_id`);
  const wanted = new Map(movies.map((m) => [m.imdb_id, m]));

  console.log("Downloading IMDb ratings dataset…");
  const res = await fetch(DATASET_URL);
  if (!res.ok) throw new Error(`dataset download failed: HTTP ${res.status}`);
  const gz = Buffer.from(await res.arrayBuffer());
  const tsv = zlib.gunzipSync(gz).toString("utf8");

  // Format: tconst\taverageRating\tnumVotes (header row first)
  const matches = [];
  for (const line of tsv.split("\n")) {
    const [tconst, rating, votes] = line.split("\t");
    if (!wanted.has(tconst)) continue;
    const movie = wanted.get(tconst);
    matches.push({
      id: movie.id,
      votes: parseInt(votes, 10),
      rating: movie.imdb_rating === null ? parseFloat(rating) : null,
    });
  }
  console.log(`${matches.length} matched in dataset (${movies.length - matches.length} not found)`);

  if (DRY_RUN) {
    console.log("Dry run — sample:", matches.slice(0, 5));
    process.exit(0);
  }

  let updated = 0;
  const CHUNK = 500;
  for (let i = 0; i < matches.length; i += CHUNK) {
    const chunk = matches.slice(i, i + CHUNK);
    const values = [];
    const params = [];
    chunk.forEach((m, j) => {
      const base = j * 3;
      values.push(`($${base + 1}::uuid, $${base + 2}::int, $${base + 3}::numeric)`);
      params.push(m.id, m.votes, m.rating);
    });
    const { rowCount } = await client.query(
      `UPDATE movies AS m
         SET imdb_votes = v.votes,
             imdb_rating = COALESCE(m.imdb_rating, v.rating)
        FROM (VALUES ${values.join(",")}) AS v(id, votes, rating)
       WHERE m.id = v.id`,
      params
    );
    updated += rowCount;
    console.log(`updated ${updated}/${matches.length}`);
  }
  console.log("Done.");
} finally {
  await client.end();
}

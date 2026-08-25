#!/usr/bin/env node
/**
 * resolve-nomination-tmdb.mjs — for every nomination in a ceremony that has no
 * `movies` row yet, search TMDB and report the best candidate, with runtime.
 *
 * Read-only against both the database and TMDB. It writes nothing; its output
 * is a list of TMDB IDs to feed to import-specific-movies.ts, plus a
 * feature/short split so shorts don't get imported by accident.
 *
 *   node scripts/resolve-nomination-tmdb.mjs 2025
 *   node scripts/resolve-nomination-tmdb.mjs 2025 --ids-only     # features only, space-separated
 *
 * Runtime is the classifier because the Academy's own line is 40 minutes: a
 * film over 40 minutes is a feature, 40 or under is a short subject. TMDB
 * carries runtime on the detail endpoint, so the split is sourced rather than
 * guessed from which category the film was nominated in.
 *
 * Credentials are loaded from .env inside this process and never printed.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
  throw new Error(`Could not connect: ${lastErr?.message}`);
}

const TMDB_KEY = loadEnvVar("TMDB_API_KEY");
const GAP_MS = 120;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalizeTitle(t) {
  return t
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function tmdb(pathname, params) {
  const url = new URL(`https://api.themoviedb.org/3${pathname}`);
  url.searchParams.set("api_key", TMDB_KEY);
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status} for ${pathname}`);
  return res.json();
}

async function resolveTitle(title, filmYear) {
  // Try the year-scoped search first — "Butterfly" and "The Three Sisters" are
  // titles with decades of homonyms, and the year is the only thing that makes
  // them unambiguous.
  const attempts = [
    { query: title, year: filmYear },
    { query: title, year: filmYear + 1 },
    { query: title },
    // Subtitles are frequently absent from TMDB ("Children No More" vs
    // "Children No More: Were and Are Gone"), so retry on the stem.
    ...(title.includes(":") ? [{ query: title.split(":")[0].trim() }] : []),
  ];

  for (const attempt of attempts) {
    const params = { query: attempt.query, include_adult: "false" };
    if (attempt.year) params.year = String(attempt.year);
    const data = await tmdb("/search/movie", params);
    await sleep(GAP_MS);

    const results = data.results ?? [];
    if (!results.length) continue;

    const normQuery = normalizeTitle(attempt.query);
    // Prefer an exact normalized title hit; fall back to TMDB's own ranking.
    const exact = results.filter(
      (r) => normalizeTitle(r.title || "") === normQuery || normalizeTitle(r.original_title || "") === normQuery
    );
    const pool = exact.length ? exact : results;

    // Among equally-titled hits, take the one closest to the film year.
    pool.sort((a, b) => {
      const ay = Number((a.release_date || "").slice(0, 4)) || 0;
      const by = Number((b.release_date || "").slice(0, 4)) || 0;
      return Math.abs(ay - filmYear) - Math.abs(by - filmYear);
    });

    const best = pool[0];
    const detail = await tmdb(`/movie/${best.id}`, {});
    await sleep(GAP_MS);

    return {
      tmdb_id: best.id,
      title: detail.title,
      year: Number((detail.release_date || "").slice(0, 4)) || null,
      runtime: detail.runtime ?? null,
      exactTitle: exact.length > 0,
      viaQuery: attempt.query !== title ? attempt.query : null,
    };
  }
  return null;
}

async function main() {
  const filmYear = Number(process.argv[2]);
  const idsOnly = process.argv.includes("--ids-only");
  if (!filmYear) {
    console.error("Usage: node scripts/resolve-nomination-tmdb.mjs <filmYear> [--ids-only]");
    process.exit(1);
  }
  if (!TMDB_KEY) throw new Error("TMDB_API_KEY not found in .env/.env.local");

  const client = await connect();
  let rows;
  try {
    ({ rows } = await client.query(
      `SELECT DISTINCT n.work_title, ac.canonical_slug
         FROM nominations n
         JOIN award_categories ac ON ac.id = n.category_id
         JOIN ceremonies c ON c.id = ac.ceremony_id
        WHERE c.domain = 'film' AND c.year = $1
          AND n.tmdb_id IS NULL
          AND n.work_title IS NOT NULL
        ORDER BY n.work_title`,
      [filmYear]
    ));
  } finally {
    await client.end().catch(() => {});
  }

  if (!rows.length) {
    console.log(`No unlinked nominations for film year ${filmYear}.`);
    return;
  }

  // One title can be nominated in several categories; resolve it once.
  const byTitle = new Map();
  for (const r of rows) {
    if (!byTitle.has(r.work_title)) byTitle.set(r.work_title, []);
    byTitle.get(r.work_title).push(r.canonical_slug);
  }

  const features = [];
  const shorts = [];
  const unresolved = [];
  const suspect = [];

  for (const [title, cats] of byTitle) {
    let hit = null;
    try {
      hit = await resolveTitle(title, filmYear);
    } catch (err) {
      console.error(`  ! TMDB error for "${title}": ${err.message}`);
    }
    if (!hit) {
      unresolved.push({ title, cats });
      continue;
    }
    // `hit.title` is TMDB's title and wins; keep the nominated title alongside
    // it so the report can show a rename.
    const entry = { nominatedAs: title, cats, ...hit };
    // A hit that is neither an exact title match nor near the right year is
    // probably a different film with the same name — surface it rather than
    // importing it.
    if (!hit.exactTitle || (hit.year && Math.abs(hit.year - filmYear) > 1)) suspect.push(entry);
    else if (hit.runtime !== null && hit.runtime <= 40) shorts.push(entry);
    else features.push(entry);
  }

  if (idsOnly) {
    console.log(features.map((f) => f.tmdb_id).join(" "));
    return;
  }

  const line = (e) => {
    const head = `  ${String(e.tmdb_id).padStart(7)}  ${String(e.runtime ?? "?").padStart(3)}m  ${e.year ?? "????"}  ${e.title}`;
    const via = e.viaQuery ? `   [matched via "${e.viaQuery}"]` : "";
    // Only echo the nominated title when TMDB calls the film something else —
    // that difference is the thing a reviewer needs to eyeball.
    const asNominated =
      normalizeTitle(e.title) === normalizeTitle(e.nominatedAs) ? "" : `\n            nominated as "${e.nominatedAs}"`;
    return `${head}${via}${asNominated}\n            ${e.cats.join(", ")}`;
  };

  console.log(`\nFEATURES (>40m) — import these: ${features.length}`);
  features.forEach((e) => console.log(line(e)));

  console.log(`\nSHORTS (<=40m) — do NOT import as features: ${shorts.length}`);
  shorts.forEach((e) => console.log(line(e)));

  if (suspect.length) {
    console.log(`\nSUSPECT — title or year mismatch, review by hand: ${suspect.length}`);
    suspect.forEach((e) => console.log(line(e)));
  }
  if (unresolved.length) {
    console.log(`\nNOT ON TMDB: ${unresolved.length}`);
    unresolved.forEach((e) => console.log(`            "${e.title}" (${e.cats.join(", ")})`));
  }

  console.log(
    `\nTo import the features:\n  npx tsx scripts/import-specific-movies.ts ${features.map((f) => f.tmdb_id).join(" ")}`
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

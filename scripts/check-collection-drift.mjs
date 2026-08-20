#!/usr/bin/env node
/**
 * check-collection-drift.mjs — reconcile film_collections membership against
 * the TMDB source each row is supposed to track (see the 2026-08-20
 * migration). Read-only against the app database; makes GET requests to
 * TMDB. Credentials are resolved in-process and never printed (do NOT
 * cat/grep .env from a shell — that path is blocked by policy).
 *
 * Three source types (film_collections.tmdb_source_type):
 *
 *   'collection' — one or more TMDB /collection/{id} part lists (e.g. Star
 *      Trek spans three separate TMDB collections). A real, precise diff:
 *      reports both missing (in TMDB, not in ours) and extra (in ours, not
 *      in TMDB) tmdb_ids.
 *
 *   'company' — TMDB discover-by-company. Less precise: a studio's full
 *      discover result includes shorts, "Making of" docs, and streaming
 *      specials tagged with the same company, so results are heuristically
 *      filtered (title pattern + vote_count floor) and reported as
 *      "candidates to review", not hard misses. DC Universe's company id
 *      (184898, the post-2023 "DC Studios" brand) only catches *new*
 *      additions going forward — the pre-2023 catalog (original Superman,
 *      DCEU) has no single studio to diff against and isn't covered here.
 *
 *   'none' — no external source (e.g. "The Muppets": TMDB's own Muppets
 *      collection only covers 2011/2014, not the classic run; the
 *      hand-curated "lists" category has no source at all). Only
 *      data-quality checks apply: zero-count collections, members with no
 *      poster.
 *
 * Usage:  node scripts/check-collection-drift.mjs
 *         node scripts/check-collection-drift.mjs --rest   # force the CI path
 * Exit:   0 = clean, 1 = drift/issues found, 2 = could not run.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readVar(name) {
  if (process.env[name]) return process.env[name];
  for (const file of [".env", ".env.local"]) {
    const p = path.join(repoRoot, file);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, "utf8").match(new RegExp(`^${name}=(.*)$`, "m"));
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

const TMDB_KEY = readVar("TMDB_API_KEY");

// Company discover results mix in shorts, making-of docs, and streaming
// specials tagged with the same studio. This is a heuristic filter for a
// human-reviewed report, not a source of truth — false positives/negatives
// are expected and fine.
const NOISE_TITLE_RE = /assembled|one-shot|making of|holiday special|^lego |storyteller|takes a bath|'s pursuit|little guy|director by night|magnum opus|krypto saves|test trailer|showcase|team (thor|darryl)|to-do list/i;
const NOISE_VOTE_FLOOR = 150;

// Real feature-length films that still aren't the collection they're being
// checked against — the title/vote/runtime/documentary filters can't catch
// these because they aren't shorts or docs, they're just mistagged. All of
// the current entries share the "Marvel Studios" TMDB company tag despite
// predating Marvel Studios' own theatrical run: Ghost Rider (2007, Sony),
// Spider-Man 3 (2007, Sony), Fantastic Four: Rise of the Silver Surfer
// (2007, Fox), and Punisher: War Zone (2008, Lionsgate) were made under
// Marvel's old character-licensing deals; Ultimate Avengers 2, The
// Invincible Iron Man, Next Avengers, and Doctor Strange (2007) are
// direct-to-video animated films, not MCU theatrical releases.
const KNOWN_MISTAGGED_TMDB_IDS = new Set([1250, 559, 1979, 13056, 14611, 13647, 14613, 14830]);

// TMDB's rate limit is easy to trip with a burst of detail fetches; retry
// once on 429 using its Retry-After header (falling back to 1.5s) rather
// than failing the whole run.
async function tmdbFetch(url) {
  const res = await fetch(url);
  if (res.status === 429) {
    const waitMs = Number(res.headers.get("retry-after")) * 1000 || 1500;
    await new Promise((r) => setTimeout(r, waitMs));
    return tmdbFetch(url);
  }
  if (!res.ok) throw new Error(`TMDB ${url.split("?")[0]} -> ${res.status}`);
  return res.json();
}

async function tmdbCollectionParts(id) {
  const data = await tmdbFetch(`https://api.themoviedb.org/3/collection/${id}?api_key=${TMDB_KEY}`);
  return (data.parts || []).map((p) => ({ id: p.id, title: p.title }));
}

const DOCUMENTARY_GENRE_ID = 99;
// Below the vote/title filter, shorts (Pixar's included-before-the-feature
// shorts, Marvel's "Team Thor" bits, etc.) still slip through — they often
// carry real vote counts. A runtime floor catches those; discover's list
// endpoint doesn't return runtime, so this costs one detail fetch per
// survivor (bounded — the vote/title pass already trims the list). Fetched
// sequentially with a small gap, not Promise.all, to stay under TMDB's rate
// limit.
const SHORT_RUNTIME_FLOOR_MIN = 60;
const TMDB_REQUEST_GAP_MS = 120;

async function tmdbMovieDetail(id) {
  return tmdbFetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_KEY}`);
}

async function tmdbCompanyCandidates(id) {
  let results = [];
  for (let page = 1; page <= 5; page++) {
    const data = await tmdbFetch(
      `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&with_companies=${id}&sort_by=release_date.asc&page=${page}&include_adult=false`
    );
    if (!data.results?.length) break;
    results = results.concat(data.results);
    if (page >= data.total_pages) break;
  }
  const survivors = results.filter(
    (r) =>
      r.vote_count >= NOISE_VOTE_FLOOR &&
      !NOISE_TITLE_RE.test(r.title) &&
      !r.genre_ids?.includes(DOCUMENTARY_GENRE_ID) &&
      !KNOWN_MISTAGGED_TMDB_IDS.has(r.id)
  );
  const withRuntime = [];
  for (const r of survivors) {
    const detail = await tmdbMovieDetail(r.id);
    withRuntime.push({ ...r, runtime: detail.runtime });
    await new Promise((res) => setTimeout(res, TMDB_REQUEST_GAP_MS));
  }
  return withRuntime
    .filter((r) => (r.runtime ?? 0) >= SHORT_RUNTIME_FLOOR_MIN)
    .map((r) => ({ id: r.id, title: r.title }));
}

// ── Load collections + membership + poster status ──────────────────────

async function restGet(baseUrl, key, pathAndQuery) {
  const res = await fetch(`${baseUrl}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`PostgREST ${pathAndQuery.split("?")[0]} -> ${res.status} ${await res.text()}`);
  return res.json();
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function loadViaRest(baseUrl, key) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  const collections = await restGet(
    trimmed,
    key,
    "film_collections?select=id,slug,title,category,tmdb_source_type,tmdb_source_ids"
  );
  const items = await restGet(
    trimmed,
    key,
    "film_collection_items?select=collection_id,tmdb_id&limit=5000"
  );
  const allTmdbIds = [...new Set(items.map((i) => i.tmdb_id))];
  const posterByTmdbId = new Map();
  for (const batch of chunk(allTmdbIds, 200)) {
    if (batch.length === 0) continue;
    const movies = await restGet(
      trimmed,
      key,
      `movies?select=tmdb_id,title,poster_url&tmdb_id=in.(${batch.join(",")})&limit=200`
    );
    for (const m of movies) posterByTmdbId.set(m.tmdb_id, { title: m.title, poster_url: m.poster_url });
  }

  const itemsByCollection = new Map();
  for (const i of items) {
    if (!itemsByCollection.has(i.collection_id)) itemsByCollection.set(i.collection_id, []);
    itemsByCollection.get(i.collection_id).push(i.tmdb_id);
  }

  return collections.map((c) => ({
    ...c,
    memberIds: itemsByCollection.get(c.id) ?? [],
    posterByTmdbId,
  }));
}

async function loadViaPostgres(databaseUrl) {
  const { default: pg } = await import("pg");
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
      const { rows: collections } = await client.query(
        `SELECT id, slug, title, category, tmdb_source_type, tmdb_source_ids FROM film_collections;`
      );
      const { rows: items } = await client.query(
        `SELECT fci.collection_id, fci.tmdb_id, m.title, m.poster_url
         FROM film_collection_items fci
         LEFT JOIN movies m ON m.tmdb_id = fci.tmdb_id;`
      );
      await client.end();

      const posterByTmdbId = new Map();
      const itemsByCollection = new Map();
      for (const i of items) {
        posterByTmdbId.set(i.tmdb_id, { title: i.title, poster_url: i.poster_url });
        if (!itemsByCollection.has(i.collection_id)) itemsByCollection.set(i.collection_id, []);
        itemsByCollection.get(i.collection_id).push(i.tmdb_id);
      }
      return collections.map((c) => ({
        ...c,
        memberIds: itemsByCollection.get(c.id) ?? [],
        posterByTmdbId,
      }));
    } catch (err) {
      lastErr = err;
      await client.end().catch(() => {});
    }
  }
  throw lastErr ?? new Error("no Postgres candidate succeeded");
}

// ── Diff logic ───────────────────────────────────────────────────────────

async function diffCollection(c) {
  const memberSet = new Set(c.memberIds);
  const findings = { slug: c.slug, title: c.title, missing: [], extra: [], candidates: [], dataQuality: [] };

  if (c.memberIds.length === 0) {
    findings.dataQuality.push("collection is empty");
  }
  const missingPosters = c.memberIds
    .map((id) => ({ id, info: c.posterByTmdbId.get(id) }))
    .filter((m) => !m.info?.poster_url);
  if (missingPosters.length > 0) {
    findings.dataQuality.push(`${missingPosters.length} member(s) with no poster`);
  }

  if (c.tmdb_source_type === "collection" && c.tmdb_source_ids?.length) {
    const parts = (await Promise.all(c.tmdb_source_ids.map(tmdbCollectionParts))).flat();
    const sourceMap = new Map(parts.map((p) => [p.id, p.title]));
    for (const [id, title] of sourceMap) {
      if (!memberSet.has(id)) findings.missing.push({ id, title });
    }
    for (const id of c.memberIds) {
      if (!sourceMap.has(id)) findings.extra.push({ id, title: c.posterByTmdbId.get(id)?.title ?? "(unknown)" });
    }
  } else if (c.tmdb_source_type === "company" && c.tmdb_source_ids?.length) {
    const candidateLists = await Promise.all(c.tmdb_source_ids.map(tmdbCompanyCandidates));
    const candidates = candidateLists.flat();
    for (const cand of candidates) {
      if (!memberSet.has(cand.id)) findings.candidates.push(cand);
    }
  }

  return findings;
}

function formatCollection(f) {
  const lines = [];
  const total = f.missing.length + f.extra.length + f.candidates.length + f.dataQuality.length;
  if (total === 0) {
    lines.push(`✓ ${f.title} (${f.slug}): clean`);
    return lines;
  }
  lines.push(`✗ ${f.title} (${f.slug}):`);
  for (const dq of f.dataQuality) lines.push(`    - ${dq}`);
  for (const m of f.missing) lines.push(`    - missing: ${m.title} (tmdb ${m.id})`);
  for (const e of f.extra) lines.push(`    - shouldn't be here: ${e.title} (tmdb ${e.id})`);
  for (const cand of f.candidates) lines.push(`    - candidate to review: ${cand.title} (tmdb ${cand.id})`);
  return lines;
}

// ── Entry point ──────────────────────────────────────────────────────────

if (!TMDB_KEY) {
  console.error("No TMDB_API_KEY. Set it in .env/.env.local or as a repo secret.");
  process.exit(2);
}

const forceRest = process.argv.includes("--rest");
const databaseUrl = forceRest ? null : readVar("DATABASE_URL");
const supabaseUrl = readVar("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = readVar("SUPABASE_SERVICE_ROLE_KEY");

let collections;
try {
  if (databaseUrl) {
    collections = await loadViaPostgres(databaseUrl);
  } else if (supabaseUrl && serviceKey) {
    collections = await loadViaRest(supabaseUrl, serviceKey);
  } else {
    console.error("No DB credentials. Set DATABASE_URL, or NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(2);
  }
} catch (err) {
  console.error("Could not load collections:", err.message);
  process.exit(2);
}

let allFindings;
try {
  allFindings = await Promise.all(collections.map(diffCollection));
} catch (err) {
  console.error("Drift check failed:", err.message);
  process.exit(2);
}

const lines = allFindings.flatMap(formatCollection);
const totalIssues = allFindings.reduce(
  (sum, f) => sum + f.missing.length + f.extra.length + f.candidates.length + f.dataQuality.length,
  0
);
lines.push("", totalIssues === 0 ? "No collection drift found." : `${totalIssues} issue(s) across ${allFindings.length} collection(s) need review.`);

const report = lines.join("\n");
console.log(report);

if (process.env.GITHUB_STEP_SUMMARY) {
  const heading = totalIssues === 0 ? "### ✓ Collection drift check clean" : "### ✗ Collection drift detected";
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${heading}\n\n\`\`\`\n${report}\n\`\`\`\n`);
}

process.exit(totalIssues === 0 ? 0 : 1);

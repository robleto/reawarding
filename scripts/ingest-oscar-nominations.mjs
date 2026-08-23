#!/usr/bin/env node
/**
 * ingest-oscar-nominations.mjs — seed one ceremony, its categories, and its
 * nominee slate from a JSON file produced by fetch-oscar-nominations.mjs.
 *
 * Dry run by default. Nothing is written without --apply.
 *
 *   node scripts/ingest-oscar-nominations.mjs scripts/data/oscar-nominations-2025.json
 *   node scripts/ingest-oscar-nominations.mjs scripts/data/oscar-nominations-2025.json --apply
 *   node scripts/ingest-oscar-nominations.mjs scripts/data/oscar-nominations-2025.json --apply --replace
 *
 * Third mode — re-link only, no JSON needed:
 *
 *   node scripts/ingest-oscar-nominations.mjs --relink-only 2025
 *   node scripts/ingest-oscar-nominations.mjs --relink-only 2025 --apply
 *
 * A nomination whose film had no `movies` row at ingest time is stored with a
 * null tmdb_id — the nomination is real, it just is not yet checkable against
 * `rankings.seen_it`. Importing the film later (scripts/resolve-nomination-tmdb.mjs
 * finds the TMDB ids, scripts/import-specific-movies.ts imports them) does NOT
 * backfill that link on its own. --relink-only closes the gap: it re-runs the
 * title match for the ceremony's still-unlinked nominations and fills in the
 * ones that now resolve. Expect to need it repeatedly during a live season, as
 * TMDB catches up with the short-film categories.
 *
 * The ceremony row and the category rows upsert cleanly (both have natural
 * unique keys). Nominations do not — a category can legitimately hold two
 * nominations for the same film (the 98th's Best Supporting Actor has two
 * performances from One Battle After Another), so there is no safe natural key
 * to upsert on. Instead: --apply refuses to touch a ceremony that already has
 * nominations, and --replace re-loads them inside a transaction. Re-loading is
 * the expected March workflow, when the same slate comes back with winners
 * marked.
 *
 * Credentials are loaded from .env inside this process and never printed.
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

async function connect() {
  const databaseUrl = loadEnvVar("DATABASE_URL");
  if (!databaseUrl) throw new Error("DATABASE_URL not found in .env/.env.local");

  const parsed = new URL(databaseUrl);
  const projectRef =
    parsed.hostname.split(".")[1] === "supabase"
      ? parsed.hostname.split(".")[0]
      : parsed.hostname.replace(/^db\./, "").split(".")[0];

  // The direct db.<ref>.supabase.co host is IPv6-only; fall back to the IPv4
  // session pooler, same as scripts/dev-db.mjs.
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

// Same normalization as scripts/backfill-official-winners.ts, so a title that
// matches there matches here.
function normalizeTitle(t) {
  return t
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pickMatch(title, year, candidates) {
  const normQuery = normalizeTitle(title);
  let best = null;
  let bestScore = -1;
  let ties = 0;

  for (const c of candidates) {
    if (normalizeTitle(c.title || "") !== normQuery && normalizeTitle(c.original_title || "") !== normQuery) {
      continue;
    }
    const score = c.release_year === year ? 2 : 1;
    if (score === bestScore) ties += 1;
    if (score > bestScore) {
      best = c;
      bestScore = score;
      ties = 0;
    }
  }
  return ties > 0 ? null : best;
}

/**
 * Fill in tmdb_id for a ceremony's still-unlinked nominations, using the same
 * matcher the initial ingest uses. Never clears an existing link and never
 * touches any other column, so it is safe to re-run at any point in a season.
 */
async function relinkOnly(filmYear, apply) {
  const client = await connect();
  try {
    const { rows: unlinked } = await client.query(
      `SELECT n.id, n.work_title, n.work_year, ac.canonical_slug, ac.ordinal
         FROM nominations n
         JOIN award_categories ac ON ac.id = n.category_id
         JOIN ceremonies c ON c.id = ac.ceremony_id
        WHERE c.domain = 'film' AND c.year = $1
          AND n.tmdb_id IS NULL
          AND n.work_title IS NOT NULL
        ORDER BY ac.ordinal, n.work_title`,
      [filmYear]
    );

    const { rows: totals } = await client.query(
      `SELECT count(*)::int AS total, count(n.tmdb_id)::int AS linked
         FROM nominations n
         JOIN award_categories ac ON ac.id = n.category_id
         JOIN ceremonies c ON c.id = ac.ceremony_id
        WHERE c.domain = 'film' AND c.year = $1`,
      [filmYear]
    );
    const { total, linked } = totals[0];

    if (!total) {
      console.log(`No nominations stored for film year ${filmYear}. Nothing to re-link.`);
      return;
    }
    console.log(`film year ${filmYear}: ${linked}/${total} nominations linked, ${unlinked.length} unlinked\n`);
    if (!unlinked.length) return;

    const { rows: candidates } = await client.query(
      "SELECT tmdb_id, title, original_title, release_year FROM movies WHERE release_year BETWEEN $1 AND $2",
      [filmYear - 1, filmYear + 1]
    );

    const resolved = [];
    const stillMissing = [];
    for (const nom of unlinked) {
      const hit = pickMatch(nom.work_title, nom.work_year ?? filmYear, candidates);
      if (hit) resolved.push({ ...nom, tmdb_id: hit.tmdb_id, matchedTitle: hit.title });
      else stillMissing.push(nom);
    }

    if (resolved.length) {
      console.log(`newly resolvable: ${resolved.length}`);
      for (const r of resolved) {
        const rename = r.matchedTitle !== r.work_title ? `  (movies row: "${r.matchedTitle}")` : "";
        console.log(`  ${String(r.tmdb_id).padStart(7)}  ${r.canonical_slug}  ${r.work_title}${rename}`);
      }
    }
    if (stillMissing.length) {
      console.log(`\nstill no movies row: ${stillMissing.length}`);
      for (const m of stillMissing) console.log(`           ${m.canonical_slug}  ${m.work_title}`);
      console.log("  -> node scripts/resolve-nomination-tmdb.mjs " + filmYear);
    }

    if (!apply) {
      console.log("\nDry run — nothing written. Re-run with --apply to write.");
      return;
    }
    if (!resolved.length) {
      console.log("\nNothing to write.");
      return;
    }

    await client.query("BEGIN");
    try {
      for (const r of resolved) {
        // The tmdb_id IS NULL guard makes a concurrent re-run a no-op rather
        // than a double write.
        await client.query("UPDATE nominations SET tmdb_id = $1 WHERE id = $2 AND tmdb_id IS NULL", [
          r.tmdb_id,
          r.id,
        ]);
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    }
    console.log(`\nLinked ${resolved.length} nomination(s). Now ${linked + resolved.length}/${total}.`);
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const replace = process.argv.includes("--replace");
  const relink = process.argv.includes("--relink-only");

  if (relink) {
    const filmYear = Number(process.argv.find((a) => /^\d{4}$/.test(a)));
    if (!filmYear) {
      console.error("Usage: node scripts/ingest-oscar-nominations.mjs --relink-only <filmYear> [--apply]");
      process.exit(1);
    }
    await relinkOnly(filmYear, apply);
    return;
  }

  const filePath = process.argv[2];
  if (!filePath) {
    console.error(
      "Usage: node scripts/ingest-oscar-nominations.mjs <json> [--apply] [--replace]\n" +
        "       node scripts/ingest-oscar-nominations.mjs --relink-only <filmYear> [--apply]"
    );
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(path.resolve(repoRoot, filePath), "utf8"));
  const { ceremony, categories } = payload;
  if (!ceremony?.film_year) throw new Error("Payload has no ceremony.film_year");

  const client = await connect();
  try {
    // Resolve TMDB matches up front so the dry run can report the real match
    // rate — that number is the whole point of reviewing before applying.
    const { rows: candidates } = await client.query(
      "SELECT tmdb_id, title, original_title, release_year FROM movies WHERE release_year BETWEEN $1 AND $2",
      [ceremony.film_year - 1, ceremony.film_year + 1]
    );

    let matched = 0;
    const unmatchedTitles = new Set();
    for (const cat of categories) {
      cat._matched = 0;
      for (const nom of cat.nominations) {
        const hit = nom.work_title ? pickMatch(nom.work_title, ceremony.film_year, candidates) : null;
        nom._tmdb_id = hit?.tmdb_id ?? null;
        if (hit) {
          matched += 1;
          cat._matched += 1;
        } else {
          unmatchedTitles.add(nom.work_title ?? "(no title)");
        }
      }
    }

    const totalNoms = categories.reduce((n, c) => n + c.nominations.length, 0);
    const distinctFilms = new Set(categories.flatMap((c) => c.nominations.map((n) => n.work_title))).size;

    console.log(`${ceremony.official_name} — film year ${ceremony.film_year}, ${ceremony.event_date}`);
    console.log(`${categories.length} categories, ${totalNoms} nominations, ${distinctFilms} distinct films`);
    console.log(`TMDB matched: ${matched}/${totalNoms} nominations   unmatched films: ${unmatchedTitles.size}\n`);

    // Per-category coverage is the number that decides whether a readiness
    // list can honestly show "X of Y seen" for that category. A category at
    // 0/5 is listable but not trackable.
    console.log("per-category coverage:");
    for (const cat of categories) {
      const n = cat.nominations.length;
      const flag = cat._matched === 0 ? "  <-- no films trackable" : cat._matched < n ? "  <-- partial" : "";
      console.log(`  ${String(cat._matched).padStart(2)}/${n}  ${cat.canonical_slug}${flag}`);
    }

    if (unmatchedTitles.size) {
      console.log("\nfilms with no movies row (nomination still ingests, tmdb_id stays null):");
      [...unmatchedTitles].forEach((t) => console.log(`  - ${t}`));
    }
    console.log("");

    const { rows: existing } = await client.query(
      `SELECT count(n.*)::int AS n
         FROM nominations n
         JOIN award_categories ac ON ac.id = n.category_id
         JOIN ceremonies c ON c.id = ac.ceremony_id
        WHERE c.domain = 'film' AND c.year = $1`,
      [ceremony.film_year]
    );
    const existingCount = existing[0].n;
    if (existingCount) console.log(`note: ${existingCount} nomination(s) already stored for this ceremony`);

    if (!apply) {
      console.log("\nDry run — nothing written. Re-run with --apply to write.");
      return;
    }
    if (existingCount && !replace) {
      console.error(
        `\nRefusing to write: this ceremony already has ${existingCount} nominations.\n` +
          "Re-run with --replace to reload them (deletes and re-inserts this ceremony's nominations only)."
      );
      process.exitCode = 1;
      return;
    }

    await client.query("BEGIN");

    const { rows: cerRows } = await client.query(
      `INSERT INTO ceremonies (domain, year, official_name, short_name, event_date, location)
       VALUES ('film', $1, $2, $3, $4, $5)
       ON CONFLICT (domain, year) DO UPDATE
         SET official_name = EXCLUDED.official_name,
             short_name    = EXCLUDED.short_name,
             event_date    = EXCLUDED.event_date,
             location      = EXCLUDED.location
       RETURNING id`,
      [
        ceremony.film_year,
        ceremony.official_name,
        ceremony.short_name,
        ceremony.event_date,
        ceremony.location,
      ]
    );
    const ceremonyId = cerRows[0].id;

    if (existingCount) {
      // Scoped to this ceremony's categories only.
      await client.query(
        `DELETE FROM nominations
          WHERE category_id IN (SELECT id FROM award_categories WHERE ceremony_id = $1)`,
        [ceremonyId]
      );
    }

    let insertedNoms = 0;
    for (const cat of categories) {
      const { rows: catRows } = await client.query(
        `INSERT INTO award_categories (ceremony_id, canonical_slug, display_name, category_type, ordinal)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (ceremony_id, canonical_slug) DO UPDATE
           SET display_name  = EXCLUDED.display_name,
               category_type = EXCLUDED.category_type,
               ordinal       = EXCLUDED.ordinal
         RETURNING id`,
        [ceremonyId, cat.canonical_slug, cat.display_name, cat.category_type, cat.ordinal]
      );
      const categoryId = catRows[0].id;

      for (const nom of cat.nominations) {
        await client.query(
          `INSERT INTO nominations (category_id, is_winner, work_title, work_year, tmdb_id, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [categoryId, nom.is_winner, nom.work_title, ceremony.film_year, nom._tmdb_id, nom.notes]
        );
        insertedNoms += 1;
      }
    }

    await client.query("COMMIT");
    console.log(`\nWrote ceremony + ${categories.length} categories + ${insertedNoms} nominations.`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

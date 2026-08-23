#!/usr/bin/env node
/**
 * fetch-oscar-nominations.mjs — build the nominee slate for one Academy Awards
 * ceremony from Wikipedia's revision text, and write it to
 * scripts/data/oscar-nominations-<filmYear>.json for review.
 *
 * This is deliberately split from the ingest step (ingest-oscar-nominations.mjs).
 * On nominations morning the ordering is: run this, EYEBALL THE JSON, then
 * ingest. The parse is mechanical but the source is a wiki that anyone can
 * edit, and this is reference data users will trust — a human reads it before
 * it reaches the database.
 *
 * Usage: node scripts/fetch-oscar-nominations.mjs 98
 *
 * Note on timing: Wikipedia's nominee tables are usually populated within an
 * hour or two of the announcement, but the ceremony page for an upcoming show
 * exists (and is partly empty) well before that. The script fails loudly on a
 * thin parse rather than writing a half-slate.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Canonical category slugs. Keyed by Wikipedia's section heading, which drifts
// year to year ("Best Directing" vs "Best Director", "Best Writing (Adapted
// Screenplay)" vs "Best Adapted Screenplay"), so the alias map — not the
// heading — is what keeps a slug stable across ceremonies. That stability is
// what makes the multi-year archive joinable.
//
// The four slugs that already exist in official_award_winners
// (best-picture / best-animated / best-documentary / best-international) are
// reused verbatim. Coining second names for the same categories would split
// the awards vocabulary in half.
//
// category_type follows the schema's CHECK constraint and records who the
// statuette goes to: 'work' when the film itself is honoured, 'person' when
// named individuals are.
const CANONICAL_CATEGORIES = [
  { slug: "best-picture", type: "work", aliases: ["Best Picture"] },
  { slug: "best-director", type: "person", aliases: ["Best Directing", "Best Director"] },
  { slug: "best-actor", type: "person", aliases: ["Best Actor in a Leading Role", "Best Actor"] },
  { slug: "best-actress", type: "person", aliases: ["Best Actress in a Leading Role", "Best Actress"] },
  { slug: "best-supporting-actor", type: "person", aliases: ["Best Actor in a Supporting Role", "Best Supporting Actor"] },
  { slug: "best-supporting-actress", type: "person", aliases: ["Best Actress in a Supporting Role", "Best Supporting Actress"] },
  { slug: "best-original-screenplay", type: "person", aliases: ["Best Writing (Original Screenplay)", "Best Original Screenplay"] },
  { slug: "best-adapted-screenplay", type: "person", aliases: ["Best Writing (Adapted Screenplay)", "Best Adapted Screenplay"] },
  { slug: "best-animated", type: "work", aliases: ["Best Animated Feature Film", "Best Animated Feature"] },
  { slug: "best-international", type: "work", aliases: ["Best International Feature Film", "Best Foreign Language Film"] },
  { slug: "best-documentary", type: "work", aliases: ["Best Documentary Feature Film", "Best Documentary Feature"] },
  { slug: "best-documentary-short", type: "work", aliases: ["Best Documentary Short Film", "Best Documentary Short Subject"] },
  { slug: "best-live-action-short", type: "work", aliases: ["Best Live Action Short Film"] },
  { slug: "best-animated-short", type: "work", aliases: ["Best Animated Short Film"] },
  { slug: "best-original-score", type: "person", aliases: ["Best Music (Original Score)", "Best Original Score"] },
  { slug: "best-original-song", type: "person", aliases: ["Best Music (Original Song)", "Best Original Song"] },
  { slug: "best-sound", type: "person", aliases: ["Best Sound"] },
  { slug: "best-casting", type: "person", aliases: ["Best Casting", "Best Achievement in Casting"] },
  { slug: "best-production-design", type: "person", aliases: ["Best Production Design"] },
  { slug: "best-cinematography", type: "person", aliases: ["Best Cinematography"] },
  { slug: "best-makeup-hairstyling", type: "person", aliases: ["Best Makeup and Hairstyling"] },
  { slug: "best-costume-design", type: "person", aliases: ["Best Costume Design"] },
  { slug: "best-film-editing", type: "person", aliases: ["Best Film Editing"] },
  { slug: "best-visual-effects", type: "person", aliases: ["Best Visual Effects"] },
];

const ALIAS_TO_CATEGORY = new Map();
for (const c of CANONICAL_CATEGORIES) {
  for (const a of c.aliases) ALIAS_TO_CATEGORY.set(a.toLowerCase(), c);
}

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function stripMarkup(s) {
  return s
    .replace(/<ref[^>]*\/>/g, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/<\/?small>/g, "")
    .replace(/<br\s*\/?>/g, " ")
    .replace(/\{\{'\}\}/g, "'")
    .replace(/\{\{abbr\|[^|]*\|[^}]*\}\}/g, "")
    // {{ill|Title|de|...}} is an interlanguage link whose first argument IS the
    // title — unwrap it before the generic template strip below eats it. Two of
    // the 98th's short-film nominees are only reachable this way.
    .replace(/\{\{ill\|([^|}]+)[^}]*\}\}/g, "$1")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .trim();
}

function unlink(s) {
  return s
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1");
}

async function fetchWikitext(title) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content" +
    `&rvslots=main&format=json&titles=${encodeURIComponent(title)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Reawarding/1.0 (nominee ingest; contact via reawarding.com)" },
  });
  if (!res.ok) throw new Error(`Wikipedia API returned ${res.status}`);
  const json = await res.json();
  const pages = json.query.pages;
  const key = Object.keys(pages)[0];
  if (key === "-1") throw new Error(`No Wikipedia page titled "${title}"`);
  return { title: pages[key].title, text: pages[key].revisions[0].slots.main["*"] };
}

function parseCeremony(text, number) {
  const filmYear = text.match(/films-year\s*=\s*(\d{4})/)?.[1];
  const dateRaw = text.match(/^\|\s*date\s*=\s*([^\n|<]+)/m)?.[1]?.trim();
  const siteRaw = text.match(/^\|\s*site\s*=\s*([^\n]+)/m)?.[1];

  let eventDate = null;
  const dm = dateRaw?.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
  if (dm) {
    const month = MONTHS[dm[1].toLowerCase()];
    if (month) {
      eventDate = `${dm[3]}-${String(month).padStart(2, "0")}-${String(dm[2]).padStart(2, "0")}`;
    }
  }

  return {
    number: Number(number),
    // `year` is the FILM year, not the calendar year of the telecast. This
    // matches src/lib/awardsSeason.ts (CEREMONY_DATES is keyed by film year)
    // and the product's "current year" definition. Getting this backwards
    // shifts every ballot by one year.
    film_year: filmYear ? Number(filmYear) : null,
    event_date: eventDate,
    official_name: `${number}th Academy Awards`,
    short_name: `${number}th Oscars`,
    location: siteRaw ? unlink(stripMarkup(siteRaw)).replace(/\s+/g, " ").trim() : null,
  };
}

function parseAwards(text) {
  const start = text.indexOf("===Awards===");
  if (start === -1) throw new Error("No ===Awards=== section found");
  // Governors Awards are honorary and not part of the competitive slate; they
  // have no nominees, so a readiness tracker must not count them.
  const endMarkers = ["===Governors Awards===", "===Films with multiple nominations"];
  let end = text.length;
  for (const m of endMarkers) {
    const i = text.indexOf(m, start);
    if (i !== -1 && i < end) end = i;
  }
  const section = text.slice(start, end);

  const categories = [];
  const unknown = [];
  let current = null;
  let ordinal = 0;

  for (const rawLine of section.split("\n")) {
    const catMatch = rawLine.match(/\{\{Award category\|[^|]*\|(.+?)\}\}/);
    if (catMatch) {
      const display = unlink(catMatch[1]).trim();
      const canonical = ALIAS_TO_CATEGORY.get(display.toLowerCase());
      if (!canonical) unknown.push(display);
      current = {
        canonical_slug: canonical?.slug ?? display.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        display_name: display,
        category_type: canonical?.type ?? "work",
        // Wikipedia lists categories in the Academy's own order; keep it as the
        // default sort so a category list reads the way the telecast does,
        // before the readiness view re-sorts incomplete-first.
        ordinal: ++ordinal,
        recognized: Boolean(canonical),
        nominations: [],
      };
      categories.push(current);
      continue;
    }
    if (!current) continue;

    const bullet = rawLine.match(/^(\*{1,2})\s*(.+)$/);
    if (!bullet) continue;

    let body = stripMarkup(bullet[2]);
    // The double dagger, not the bullet depth, marks a winner — ties put two
    // winners in one category (the 98th's Live Action Short is one), and a
    // depth-based rule would silently drop the second.
    const isWinner = body.includes("‡");
    body = body.replace(/‡/g, "").replace(/'''/g, "").trim();
    if (!body) continue;

    // The first italic run is the film in every layout these pages use:
    //   work categories:   ''Film'' – producers
    //   person categories: Person – ''Film'' as Character
    //   original song:     "Song" from ''Film'' – songwriters
    const ital = body.match(/''(.+?)''/);
    const workTitle = ital ? unlink(ital[1]).trim() : null;

    current.nominations.push({
      work_title: workTitle,
      is_winner: isWinner,
      // Keep the full credit line. It is the only record of who was actually
      // nominated, and preserving it here means person-level data can be
      // derived later without re-scraping a page that has since changed.
      notes: unlink(body).replace(/\s+/g, " ").trim(),
    });
  }

  return { categories, unknown };
}

async function main() {
  const number = process.argv[2];
  if (!number || !/^\d+$/.test(number)) {
    console.error("Usage: node scripts/fetch-oscar-nominations.mjs <ceremonyNumber>   e.g. 98");
    process.exit(1);
  }

  const { title, text } = await fetchWikitext(`${number}th Academy Awards`);
  const ceremony = parseCeremony(text, number);
  const { categories, unknown } = parseAwards(text);

  const totalNoms = categories.reduce((n, c) => n + c.nominations.length, 0);
  const winners = categories.reduce((n, c) => n + c.nominations.filter((x) => x.is_winner).length, 0);
  const missingTitle = categories.flatMap((c) =>
    c.nominations.filter((n) => !n.work_title).map((n) => `${c.display_name}: ${n.notes}`)
  );

  console.log(`source: ${title}`);
  console.log(`ceremony: ${ceremony.official_name}  film year ${ceremony.film_year}  ${ceremony.event_date}`);
  console.log(`categories: ${categories.length}   nominations: ${totalNoms}   winners: ${winners}\n`);
  for (const c of categories) {
    const w = c.nominations.filter((n) => n.is_winner).length;
    console.log(
      `  ${String(c.nominations.length).padStart(2)} noms  ${w} win  ${c.canonical_slug}${c.recognized ? "" : "   <-- NEW CATEGORY, needs a canonical slug"}`
    );
  }

  const problems = [];
  if (!ceremony.film_year) problems.push("could not read the film year from the infobox");
  if (!ceremony.event_date) problems.push("could not read the ceremony date from the infobox");
  if (categories.length < 20) problems.push(`only ${categories.length} categories parsed (expected ~24)`);
  if (totalNoms < 100) problems.push(`only ${totalNoms} nominations parsed (expected ~120)`);
  if (missingTitle.length) problems.push(`${missingTitle.length} nomination(s) with no film title`);

  if (missingTitle.length) {
    console.log("\nnominations with no parsable film title:");
    missingTitle.forEach((m) => console.log(`  - ${m}`));
  }
  if (unknown.length) {
    console.log("\ncategories with no canonical slug (add them to CANONICAL_CATEGORIES):");
    unknown.forEach((u) => console.log(`  - ${u}`));
  }

  if (problems.length) {
    console.error("\nParse looks incomplete — not writing the file:");
    problems.forEach((p) => console.error(`  ! ${p}`));
    console.error("\nIf the ceremony genuinely has fewer categories, adjust the thresholds here.");
    process.exit(1);
  }

  const outDir = path.join(repoRoot, "scripts", "data");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `oscar-nominations-${ceremony.film_year}.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      { source: `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`, ceremony, categories },
      null,
      2
    ) + "\n"
  );
  console.log(`\nwrote ${path.relative(repoRoot, outPath)}`);
  console.log("Review it, then: node scripts/ingest-oscar-nominations.mjs " + path.relative(repoRoot, outPath));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

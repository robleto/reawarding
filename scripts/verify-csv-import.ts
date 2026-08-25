/**
 * Verification for src/lib/csvImport.ts — the CSV parsing, format detection,
 * and column mapping behind /import.
 *
 * Run: npx tsx scripts/verify-csv-import.ts
 *
 * There is no unit-test runner in this project (only Playwright e2e), and the
 * import path is exactly the kind of pure logic where a silent regression is
 * expensive: a mis-detected rating scale rewrites someone's entire history at
 * half or double its real value. So this is a plain script with plain
 * assertions — exits non-zero on any failure, prints what it detected either
 * way. Fixtures below are synthetic but shaped like the real exports.
 */
import {
  parseDelimited,
  detectFormat,
  buildRows,
  batchRows,
  convertRating,
} from "../src/lib/csvImport";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `\n        got ${a}\n        want ${e}`}`);
}

function run(label: string, csv: string, fileName: string) {
  const parsed = parseDelimited(csv);
  const detection = detectFormat(parsed, fileName);
  const built = buildRows(parsed, detection.mapping);
  console.log(`\n── ${label} (${fileName})`);
  console.log(`   detected: ${detection.id} / recognised=${detection.recognised} / scale=${detection.mapping.ratingScale} / treatAs=${detection.mapping.treatAs}`);
  console.log(`   mapping: title=${detection.mapping.title} year=${detection.mapping.year} rating=${detection.mapping.rating} imdb=${detection.mapping.imdbId} tmdb=${detection.mapping.tmdbId}`);
  console.log(`   rows: ${built.rows.length}, issues: ${JSON.stringify(built.issues)}`);
  console.log(`   first: ${JSON.stringify(built.rows[0])}`);
  return { parsed, detection, built };
}

// ── 1. Letterboxd ratings.csv ────────────────────────────────────────────────
const letterboxd = `Date,Name,Year,Letterboxd URI,Rating
2024-01-04,Parasite,2019,https://boxd.it/aaa,4.5
2024-01-05,"Everything Everywhere All at Once",2022,https://boxd.it/bbb,5
2024-01-06,Cats,2019,https://boxd.it/ccc,0.5
2024-01-07,Aftersun,2022,https://boxd.it/ddd,`;
{
  const { detection, built } = run("Letterboxd ratings", letterboxd, "ratings.csv");
  check("lb: id", detection.id, "letterboxd");
  check("lb: scale", detection.mapping.ratingScale, "half-stars-5");
  check("lb: treatAs", detection.mapping.treatAs, "watched");
  check("lb: 4.5 stars -> 9", built.rows[0].rating, 9);
  check("lb: 5 stars -> 10", built.rows[1].rating, 10);
  check("lb: 0.5 stars -> 1", built.rows[2].rating, 1);
  check("lb: blank rating -> null, still watched", [built.rows[3].rating, built.rows[3].watched], [null, true]);
  check("lb: quoted title intact", built.rows[1].title, "Everything Everywhere All at Once");
}

// ── 2. Letterboxd watchlist.csv — identical headers to watched.csv (IMP-2) ───
const lbWatchlist = `Date,Name,Year,Letterboxd URI
2024-02-01,Anatomy of a Fall,2023,https://boxd.it/eee`;
{
  const { detection, built } = run("Letterboxd watchlist", lbWatchlist, "watchlist.csv");
  check("lb-wl: treatAs from filename", detection.mapping.treatAs, "watchlist");
  check("lb-wl: row is watchlist", built.rows[0].watched, false);
  // Regression: the banner used to say "import as watched" on a real
  // watchlist.csv — telling the user the opposite of what would happen.
  check("lb-wl: note agrees with treatAs", detection.note.includes("watchlist"), true);
  check("lb-wl: note does not promise watched", /import as watched/.test(detection.note), false);
}
{
  const { detection } = run("Letterboxd watched (same headers)", lbWatchlist, "watched.csv");
  check("lb-watched: treatAs from filename", detection.mapping.treatAs, "watched");
}

// ── 3. IMDb ratings export, incl. a TV row that must be filtered ────────────
const imdb = `Const,Your Rating,Date Rated,Title,Title Type,IMDb Rating,Year,Genres
tt6751668,9,2024-01-02,Parasite,movie,8.5,2019,Thriller
tt0903747,10,2024-01-03,Breaking Bad,tvSeries,9.5,2008,Drama
tt1517268,7,2024-01-04,Barbie,movie,6.9,2023,Comedy`;
{
  const { detection, built } = run("IMDb ratings", imdb, "ratings.csv");
  check("imdb: id", detection.id, "imdb");
  check("imdb: scale", detection.mapping.ratingScale, "ten");
  check("imdb: rating column is Your Rating", detection.mapping.rating, "Your Rating");
  check("imdb: tt-id captured", built.rows[0].imdbId, "tt6751668");
  check("imdb: 9 -> 9", built.rows[0].rating, 9);
  check("imdb: TV row filtered", built.issues.nonFilm, 1);
  check("imdb: film rows kept", built.rows.length, 2);
}

// ── 4. TMDB-style export (detected by the id column, not an exact schema) ────
const tmdb = `TMDb ID,IMDB ID,Title,Release Date,Rating
496243,tt6751668,Parasite,2019-05-30,9
299534,tt4154796,Avengers: Endgame,2019-04-24,7.5`;
{
  const { detection, built } = run("TMDB export", tmdb, "ratings.csv");
  check("tmdb: id", detection.id, "tmdb");
  check("tmdb: tmdbId numeric", built.rows[0].tmdbId, 496243);
  check("tmdb: year from Release Date", built.rows[0].year, 2019);
  check("tmdb: imdb also captured", built.rows[0].imdbId, "tt6751668");
}

// ── 5. Home-grown CSV: semicolons, star glyphs, quoted newline, /100 scale ──
const custom = `Film;Watched On;My Score;Notes
Parasite;2019-05-30;85;"Saw it twice,
second time better"
Whiplash;2014-10-10;92;Loud
Tár;2022-10-07;70;`;
{
  const { parsed, detection, built } = run("Custom semicolon CSV", custom, "my-movies.csv");
  check("custom: delimiter sniffed", parsed.delimiter, ";");
  check("custom: id", detection.id, "custom");
  check("custom: not recognised", detection.recognised, false);
  check("custom: title guessed", detection.mapping.title, "Film");
  check("custom: scale inferred as /100", detection.mapping.ratingScale, "hundred");
  // "Watched On" is deliberately NOT auto-mapped to release year — a 1995 film
  // watched in 2019 would file under 2019's ballot. The UI requires the user to
  // pick, so nothing imports until they do.
  check("custom: year left unmapped", detection.mapping.year, null);
  check("custom: nothing imports without a year", built.rows.length, 0);
  check("custom: all rows reported as noYear", built.issues.noYear, 3);

  // Now simulate what the user does in the mapping step: point year at the
  // date column anyway, and confirm the manual path works end to end.
  const manual = buildRows(parsed, { ...detection.mapping, year: "Watched On" });
  check("custom+manual: rows built", manual.rows.length, 3);
  check("custom+manual: 85 -> 9", manual.rows[0].rating, 9);
  check("custom+manual: 92 -> 9", manual.rows[1].rating, 9);
  check("custom+manual: 70 -> 7", manual.rows[2].rating, 7);
  check("custom+manual: quoted newline did not split the row", manual.rows[0].title, "Parasite");
  check("custom+manual: year parsed from date", manual.rows[0].year, 2019);
  check("custom+manual: diacritics preserved", manual.rows[2].title, "Tár");

  // And the scale override the UI exposes: same file read as out-of-10.
  const asTen = buildRows(parsed, { ...detection.mapping, year: "Watched On", ratingScale: "ten" });
  check("custom+override: 85 clamps to 10 on a /10 scale", asTen.rows[0].rating, 10);
}

// ── 6. Diary-style rewatches collapse to one row, rating preferred ──────────
const diary = `Date,Name,Year,Letterboxd URI,Rating,Rewatch
2023-01-01,Heat,1995,https://boxd.it/x,,
2024-01-01,Heat,1995,https://boxd.it/x,4,Yes
2024-06-01,Heat,1995,https://boxd.it/x,,Yes`;
{
  const { built } = run("Letterboxd diary with rewatches", diary, "diary.csv");
  check("diary: collapsed to one film", built.rows.length, 1);
  check("diary: duplicates counted", built.issues.duplicates, 2);
  check("diary: rating survived the unrated rewatch", built.rows[0].rating, 8);
}

// ── 7. Star glyphs + batching + scale overrides ─────────────────────────────
check("glyphs: ★★★★½ -> 9", convertRating("★★★★½", "half-stars-5"), 9);
check("glyphs: ★★★ -> 6", convertRating("★★★", "half-stars-5"), 6);
check("scale override: 4 as /10 stays 4", convertRating("4", "ten"), 4);
check("scale override: 4 as stars becomes 8", convertRating("4", "stars-5"), 8);
check("comma decimal: 4,5 stars -> 9", convertRating("4,5", "half-stars-5"), 9);
check("garbage rating -> null", convertRating("n/a", "ten"), null);
check("out of range clamps", convertRating("150", "hundred"), 10);

const many = Array.from({ length: 450 }, (_, i) => ({
  title: `Film ${i}`,
  year: 2000,
  rating: null,
  watched: true,
}));
const batches = batchRows(many);
check("batching: batch count", batches.length, 3);
check("batching: sizes", batches.map((b) => b.length), [200, 200, 50]);

// ── 8. A file with no usable year is reported, not silently emptied ─────────
{
  const noYear = `Title,Rating\nParasite,9`;
  const parsed = parseDelimited(noYear);
  const detection = detectFormat(parsed, "weird.csv");
  const built = buildRows(parsed, detection.mapping);
  check("no-year: nothing imported", built.rows.length, 0);
  check("no-year: counted as noYear", built.issues.noYear, 1);
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

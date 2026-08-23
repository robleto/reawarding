import type { ImportRow } from "@/app/api/import/library/route";

/**
 * CSV parsing, format detection, and column mapping for library import.
 *
 * Split out of the importer UI so the rules live in one testable place. Two
 * jobs:
 *
 *  1. Recognise the exports people actually have — Letterboxd, IMDb, TMDB —
 *     and map them without asking the user anything.
 *  2. Fall back to a *guessed* mapping the user can correct, so a home-grown
 *     spreadsheet works too. Every guess is shown, never silently applied.
 *
 * Detection works off column names, not exact file signatures. That's on
 * purpose: a "known format" is really just a set of recognisable headers, and
 * matching loosely means a hand-edited Letterboxd export or a re-saved IMDb
 * file still gets recognised instead of falling through to manual mapping.
 */

// ── Limits ────────────────────────────────────────────────────────────────────

/**
 * Films sent per request. A whole export is uploaded as a sequence of these
 * batches, so file size never decides whether the import succeeds — it only
 * decides how many round trips it takes. Kept comfortably under the API
 * route's own MAX_ROWS_PER_REQUEST ceiling, which exists because unmatched
 * titles trigger live TMDB lookups and serverless functions have a wall-clock
 * limit.
 */
export const IMPORT_BATCH_SIZE = 200;

/** Guard against a browser tab locking up on a pathological file. */
export const MAX_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_ROWS = 25_000;

// ── Parsing ───────────────────────────────────────────────────────────────────

export type ParsedCsv = {
  headers: string[];
  rows: string[][];
  delimiter: string;
};

const DELIMITER_CANDIDATES = [",", ";", "\t", "|"] as const;

/**
 * Pick the delimiter by counting candidates outside quoted regions in the
 * first chunk of the file. Home-grown exports out of Excel in a European
 * locale are semicolon-separated, and "paste from a spreadsheet" is often
 * tab-separated — both are common enough to be worth handling silently.
 */
function sniffDelimiter(text: string): string {
  const sample = text.slice(0, 8192);
  let best = ",";
  let bestCount = 0;
  for (const candidate of DELIMITER_CANDIDATES) {
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < sample.length; i++) {
      const ch = sample[i];
      if (ch === '"') {
        // A doubled quote inside a quoted field is an escaped quote, not a
        // state change — skip its partner so the in/out tracking stays right.
        if (inQuotes && sample[i + 1] === '"') i++;
        else inQuotes = !inQuotes;
      } else if (!inQuotes && ch === candidate) count++;
      else if (!inQuotes && ch === "\n" && count > 0) break; // first line is enough
    }
    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }
  return best;
}

/**
 * RFC 4180-ish parser: quoted fields may contain the delimiter, newlines, and
 * doubled escaped quotes. The previous implementation split on newlines before
 * parsing fields, which corrupted any row containing a quoted newline — rare
 * in Letterboxd/IMDb exports, entirely normal in a hand-made spreadsheet with
 * a notes column.
 */
export function parseDelimited(input: string): ParsedCsv {
  // Strip a UTF-8 BOM — Excel writes one, and it would otherwise become part
  // of the first header's name and break every mapping lookup.
  const text = input.replace(new RegExp("^\\uFEFF"), "");
  const delimiter = sniffDelimiter(text);

  const all: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let sawAnyChar = false;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    // Drop rows that are entirely empty (trailing newline, blank separator row).
    if (row.some((cell) => cell.trim() !== "")) all.push(row);
    row = [];
    sawAnyChar = false;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      sawAnyChar = true;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      sawAnyChar = true;
      continue;
    }
    if (ch === delimiter) {
      endField();
      sawAnyChar = true;
      continue;
    }
    if (ch === "\r") continue; // CRLF — the \n does the work
    if (ch === "\n") {
      endRow();
      continue;
    }
    field += ch;
    sawAnyChar = true;
  }
  if (sawAnyChar || field !== "" || row.length > 0) endRow();

  const [headerRow, ...dataRows] = all;
  return {
    headers: (headerRow ?? []).map((h) => h.trim()),
    rows: dataRows,
    delimiter,
  };
}

/** Value of `header` in `row`, or "" when the column is absent/short. */
export function cell(headers: string[], row: string[], header: string | null): string {
  if (!header) return "";
  const idx = headers.indexOf(header);
  if (idx === -1) return "";
  return (row[idx] ?? "").trim();
}

// ── Rating scales ─────────────────────────────────────────────────────────────

export type RatingScale = "half-stars-5" | "stars-5" | "ten" | "hundred";

export const RATING_SCALES: { id: RatingScale; label: string; example: string }[] = [
  { id: "half-stars-5", label: "Stars, half steps (0.5–5)", example: "4.5 → 9/10" },
  { id: "stars-5", label: "Whole numbers 1–5", example: "4 → 8/10" },
  { id: "ten", label: "Out of 10", example: "8 → 8/10" },
  { id: "hundred", label: "Out of 100 / percent", example: "85 → 9/10" },
];

/**
 * Reawarding stores 1–10. Letterboxd's half-star scale doubles cleanly onto
 * it; the others are scaled and rounded. Returns null for anything unparseable
 * or empty so an unrated row imports as watched-but-unrated rather than as a
 * guessed rating.
 */
export function convertRating(raw: string, scale: RatingScale): number | null {
  const value = raw.trim();
  if (!value) return null;

  // Some hand-made spreadsheets store literal star glyphs ("★★★★½").
  if (/[★☆]/.test(value)) {
    const stars = (value.match(/★/g)?.length ?? 0) + (value.includes("½") ? 0.5 : 0);
    if (!stars) return null;
    return clampTen(Math.round(stars * 2));
  }

  const numeric = parseFloat(value.replace(",", ".").replace("%", ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  switch (scale) {
    case "half-stars-5":
    case "stars-5":
      return clampTen(Math.round(numeric * 2));
    case "ten":
      return clampTen(Math.round(numeric));
    case "hundred":
      return clampTen(Math.round(numeric / 10));
  }
}

function clampTen(n: number): number | null {
  if (!Number.isFinite(n)) return null;
  return Math.min(10, Math.max(1, n));
}

/**
 * Guess a scale from the values themselves. Used only for formats we don't
 * recognise — Letterboxd and IMDb have known, fixed scales. The guess is
 * always shown in the mapping step with an override, because getting this
 * wrong silently would halve or double someone's entire rating history.
 */
export function inferRatingScale(values: string[]): RatingScale {
  const numbers = values
    .map((v) => parseFloat(v.replace(",", ".").replace("%", "")))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (numbers.length === 0) return "ten";

  const max = Math.max(...numbers);
  const hasFractions = numbers.some((n) => !Number.isInteger(n));

  if (max > 10) return "hundred";
  if (max > 5) return "ten";
  if (hasFractions) return "half-stars-5";
  // 1–5 integers only. Could be a 5-star scale or a very low-rated 10-point
  // scale; the star scale is far likelier in a film-rating export.
  return "stars-5";
}

// ── Column mapping ────────────────────────────────────────────────────────────

export type ColumnMapping = {
  title: string | null;
  year: string | null;
  rating: string | null;
  imdbId: string | null;
  tmdbId: string | null;
  /** IMDb exports include TV; used to filter non-film rows out. */
  titleType: string | null;
  ratingScale: RatingScale;
  /** Whether these rows are films the user has seen, or a watchlist. */
  treatAs: "watched" | "watchlist";
};

export type SourceId = "letterboxd" | "imdb" | "tmdb" | "custom";

export type FormatDetection = {
  id: SourceId;
  /** What we tell the user we think this file is. */
  label: string;
  /** Why — the specific signal, so a wrong guess is obvious rather than magic. */
  note: string;
  mapping: ColumnMapping;
  /** True when the file matched a known export's columns, not just a guess. */
  recognised: boolean;
};

/**
 * Header synonyms, lowercased. Order matters — earlier entries win, so the
 * explicit "your rating" beats a generic "rating" in an IMDb file that
 * contains both (yours and IMDb's public average).
 */
const SYNONYMS: Record<"title" | "year" | "rating" | "imdbId" | "tmdbId" | "titleType", string[]> = {
  title: ["name", "title", "film", "movie", "original title", "original_title", "movie title"],
  year: ["year", "release year", "release_year", "release date", "release_date", "date released"],
  rating: [
    "your rating",
    "my rating",
    "rating",
    "score",
    "stars",
    "my score",
    "personal rating",
    "vote",
  ],
  imdbId: ["const", "imdb id", "imdb_id", "imdbid", "imdb"],
  tmdbId: ["tmdb id", "tmdb_id", "tmdbid", "themoviedb id", "tmdb"],
  titleType: ["title type", "title_type", "titletype", "type", "media type"],
};

function findHeader(headers: string[], candidates: string[]): string | null {
  const lowered = headers.map((h) => h.toLowerCase().trim());
  // Candidates are lowercased here rather than trusted to be, so call sites can
  // pass a header as it's spelled in the wild ("Your Rating") without it
  // silently never matching.
  const wanted = candidates.map((c) => c.toLowerCase().trim());
  // Exact matches first, in synonym-priority order.
  for (const candidate of wanted) {
    const idx = lowered.indexOf(candidate);
    if (idx !== -1) return headers[idx];
  }
  // Then contains-matches, so "Rating (out of 10)" or "TMDb ID #" still land.
  for (const candidate of wanted) {
    const idx = lowered.findIndex((h) => h.includes(candidate));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

function has(headers: string[], name: string): boolean {
  return headers.some((h) => h.toLowerCase().trim() === name);
}

/** Column values for a header, used for scale inference. */
function columnValues(parsed: ParsedCsv, header: string | null, limit = 400): string[] {
  if (!header) return [];
  const idx = parsed.headers.indexOf(header);
  if (idx === -1) return [];
  return parsed.rows
    .slice(0, limit)
    .map((r) => (r[idx] ?? "").trim())
    .filter(Boolean);
}

/**
 * Letterboxd's watched.csv and watchlist.csv are byte-for-byte identical in
 * structure (Date, Name, Year, Letterboxd URI) — there is no column that
 * distinguishes "seen it" from "want to see it" (IMP-2). The filename is the
 * only signal, so use it as the default and let the user override it in the
 * mapping step rather than guessing silently from the absence of ratings.
 */
function guessTreatAs(fileName: string): "watched" | "watchlist" {
  const name = fileName.toLowerCase();
  if (name.includes("watchlist") || name.includes("want")) return "watchlist";
  return "watched";
}

export function detectFormat(parsed: ParsedCsv, fileName: string): FormatDetection {
  const { headers } = parsed;
  const lowered = headers.map((h) => h.toLowerCase().trim());

  const guess = (): ColumnMapping => {
    const rating = findHeader(headers, SYNONYMS.rating);
    return {
      title: findHeader(headers, SYNONYMS.title),
      year: findHeader(headers, SYNONYMS.year),
      rating,
      imdbId: findHeader(headers, SYNONYMS.imdbId),
      tmdbId: findHeader(headers, SYNONYMS.tmdbId),
      titleType: findHeader(headers, SYNONYMS.titleType),
      ratingScale: inferRatingScale(columnValues(parsed, rating)),
      treatAs: guessTreatAs(fileName),
    };
  };

  // ── Letterboxd ── "Letterboxd URI" is unique to their exports; Name+Year is
  // the fallback for a file that's been through a spreadsheet round trip.
  const isLetterboxd =
    lowered.some((h) => h.includes("letterboxd")) || (has(lowered, "name") && has(lowered, "year"));
  if (isLetterboxd) {
    const rating = findHeader(headers, ["Rating"]) ?? findHeader(headers, SYNONYMS.rating);
    const treatAs = guessTreatAs(fileName);
    return {
      id: "letterboxd",
      label: "Letterboxd export",
      note: rating
        ? "Ratings read as half-stars (0.5–5) and doubled onto the 1–10 scale."
        : "No rating column — these rows import as watched, without ratings.",
      recognised: true,
      mapping: {
        title: findHeader(headers, ["Name"]) ?? findHeader(headers, SYNONYMS.title),
        year: findHeader(headers, ["Year"]),
        rating,
        imdbId: null,
        tmdbId: null,
        titleType: null,
        ratingScale: "half-stars-5",
        treatAs,
      },
    };
  }

  // ── TMDB ── checked before IMDb, because TMDB's exports carry an IMDb id
  // column too and would otherwise be labelled "IMDb export" — the tmdb_id is
  // the stronger signal *and* the better match key (our catalog is keyed on
  // it). Detected by the presence of that column rather than an exact header
  // list, since TMDB's export shape has changed over time.
  const tmdbId = findHeader(headers, SYNONYMS.tmdbId);
  if (tmdbId) {
    const rating = findHeader(headers, SYNONYMS.rating);
    const scale = inferRatingScale(columnValues(parsed, rating));
    return {
      id: "tmdb",
      label: "TMDB export",
      note: "Matched on TMDB ID, which is how our catalog is keyed — these will be exact.",
      recognised: true,
      mapping: {
        title: findHeader(headers, SYNONYMS.title),
        year: findHeader(headers, SYNONYMS.year),
        rating,
        imdbId: findHeader(headers, SYNONYMS.imdbId),
        tmdbId,
        titleType: findHeader(headers, SYNONYMS.titleType),
        ratingScale: scale,
        treatAs: guessTreatAs(fileName),
      },
    };
  }

  // ── IMDb ── "Const" is IMDb's own name for the tt-id column and appears in
  // every ratings/list export they produce.
  if (has(lowered, "const") || findHeader(headers, ["imdb id", "imdb_id"])) {
    const rating = findHeader(headers, ["Your Rating", "Your rating"]);
    return {
      id: "imdb",
      label: "IMDb export",
      note: rating
        ? "Ratings are already 1–10, and the tt-id column gives exact matches."
        : "No “Your Rating” column — these rows import as watched or watchlist, without ratings.",
      recognised: true,
      mapping: {
        title: findHeader(headers, ["Title"]) ?? findHeader(headers, SYNONYMS.title),
        year: findHeader(headers, ["Year"]) ?? findHeader(headers, SYNONYMS.year),
        rating,
        imdbId: findHeader(headers, ["Const"]) ?? findHeader(headers, SYNONYMS.imdbId),
        tmdbId: findHeader(headers, SYNONYMS.tmdbId),
        titleType: findHeader(headers, SYNONYMS.titleType),
        ratingScale: "ten",
        treatAs: guessTreatAs(fileName),
      },
    };
  }

  // ── Anything else ── a guessed mapping for the user to confirm or fix.
  const mapping = guess();
  const found = [mapping.title && "title", mapping.year && "year", mapping.rating && "rating"]
    .filter(Boolean)
    .join(", ");
  return {
    id: "custom",
    label: "Custom CSV",
    note: found
      ? `Guessed your columns (${found}) — check them below before importing.`
      : "Couldn't guess your columns — pick which is which below.",
    recognised: false,
    mapping,
  };
}

// ── Row building ──────────────────────────────────────────────────────────────

export type BuildIssues = {
  noTitle: number;
  noYear: number;
  nonFilm: number;
  duplicates: number;
};

export type BuildResult = {
  rows: ImportRow[];
  issues: BuildIssues;
};

/** IMDb title types that aren't films — excluded when a type column exists. */
const NON_FILM_TYPES = ["tvseries", "tvminiseries", "tvepisode", "tvspecial", "videogame", "podcast"];

function extractYear(value: string): number | null {
  const match = value.match(/(1[89]\d{2}|20\d{2}|21\d{2})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  return Number.isFinite(year) ? year : null;
}

export function buildRows(parsed: ParsedCsv, mapping: ColumnMapping): BuildResult {
  const issues: BuildIssues = { noTitle: 0, noYear: 0, nonFilm: 0, duplicates: 0 };
  // Collapse per film: diary.csv has one row per viewing, so a rewatch appears
  // several times. Prefer a row that carries a rating; among those, the last in
  // file order (diary.csv is chronological, so that's the most recent viewing).
  const byKey = new Map<string, ImportRow>();

  for (const row of parsed.rows) {
    const title = cell(parsed.headers, row, mapping.title);
    if (!title) {
      issues.noTitle++;
      continue;
    }

    if (mapping.titleType) {
      const type = cell(parsed.headers, row, mapping.titleType).toLowerCase().replace(/[\s_-]/g, "");
      if (NON_FILM_TYPES.includes(type)) {
        issues.nonFilm++;
        continue;
      }
    }

    const year = extractYear(cell(parsed.headers, row, mapping.year));
    if (!year) {
      issues.noYear++;
      continue;
    }

    const rawImdb = cell(parsed.headers, row, mapping.imdbId);
    const imdbId = /^tt\d+$/i.test(rawImdb) ? rawImdb.toLowerCase() : undefined;

    const rawTmdb = cell(parsed.headers, row, mapping.tmdbId);
    const tmdbNumeric = parseInt(rawTmdb, 10);
    const tmdbId = Number.isFinite(tmdbNumeric) && tmdbNumeric > 0 ? tmdbNumeric : undefined;

    const rating =
      mapping.treatAs === "watchlist"
        ? null
        : convertRating(cell(parsed.headers, row, mapping.rating), mapping.ratingScale);

    const built: ImportRow = {
      title,
      year,
      rating,
      imdbId,
      tmdbId,
      watched: mapping.treatAs === "watched",
    };

    const key = imdbId ?? (tmdbId ? `tmdb:${tmdbId}` : `${title.toLowerCase()}::${year}`);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, built);
      continue;
    }
    issues.duplicates++;
    // Later row wins unless it would drop a rating we already have.
    if (built.rating !== null || existing.rating === null) byKey.set(key, built);
  }

  return { rows: [...byKey.values()], issues };
}

/** Split into request-sized batches. */
export function batchRows(rows: ImportRow[], size = IMPORT_BATCH_SIZE): ImportRow[][] {
  const batches: ImportRow[][] = [];
  for (let i = 0; i < rows.length; i += size) batches.push(rows.slice(i, i + size));
  return batches;
}

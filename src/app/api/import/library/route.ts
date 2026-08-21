import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { isPremiumUser } from "@/lib/premium";
import { findTmdbIdByImdbId, importTmdbMovie, searchTmdbMovies } from "@/lib/tmdbImport";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ImportRow = {
  title: string;
  year: number;
  /** 1–10, already converted from source scale */
  rating: number | null;
  /** IMDb tt-id, used for precise matching when available */
  imdbId?: string;
  /** true = Watch (seen_it); false = Watchlist only */
  watched: boolean;
};

export type ImportSource = "letterboxd" | "imdb";

export type ImportRequestBody = {
  rows: ImportRow[];
  source: ImportSource;
};

export type ImportResult = {
  imported: number;
  skipped: number;
  watchlistAdded: number;
  notFound: string[];
  /**
   * For rows in `notFound`, a near-miss TMDB candidate that was found during
   * live backfill search but rejected (title matched, year was outside
   * tolerance) — keyed by the same `"${title} (${year})"` string used in
   * `notFound`. Kept so a future UI can offer a manual "is this it?"
   * confirmation instead of an unexplained "not in our catalog."
   */
  notFoundCandidates?: Record<string, { title: string; year: number | null }>;
  /** Rows that matched a movie you already gave a non-null rating to — deliberately left untouched. */
  preservedExisting: number;
  /**
   * Rows whose database write failed (a real server-side error during the
   * chunked upsert) — tracked separately from `skipped` so a genuine data-loss
   * condition is never confused with an intentional duplicate-skip. Retrying
   * the import is the expected recovery path.
   */
  failed: number;
  /** Title/year identifiers for rows counted in `failed`, for user-facing detail. */
  failedToSave?: string[];
  /** Set when more unmatched rows existed than the live-backfill cap could attempt this request. */
  backfillCapped?: number;
  /** Set when a non-premium user submitted more rows than FREE_IMPORT_ROW_CAP — the excess was never processed. */
  premiumCapped?: number;
};

// Free users can import up to this many rows per request so anyone can
// experience their history in Reawarding before being asked to pay; larger
// or repeat imports are the premium "automation" pillar (IMP-1 —
// docs/audits/2026-08-21-launch-readiness.md — the prior all-or-nothing
// paywall blocked exactly the pre-conversion users onboarding sends here).
const FREE_IMPORT_ROW_CAP = 50;

// Netlify function time limits make unbounded sequential TMDB calls risky for
// large Letterboxd exports — cap how many unmatched rows get a live lookup
// per request. Anything beyond the cap still reports as notFound.
const LIVE_BACKFILL_CAP = 75;
const BACKFILL_CONCURRENCY = 5;
// TMDB's primary release year sometimes differs from Letterboxd/IMDb's year
// by one (festival premiere vs. wide release) — accept a title-matched TMDB
// hit within this many years when there's no exact-year hit.
const BACKFILL_YEAR_TOLERANCE = 1;

// Normalize a title for comparison: strip diacritics, fold case, collapse
// punctuation/whitespace, and drop a leading article — so e.g. "Amélie",
// "Amelie", and "AMÉLIE" all compare equal, and "The Thing" matches "Thing".
// Applied everywhere titles are compared (local rowKey/matching-map
// construction AND the TMDB backfill match check) so both paths agree on
// what counts as "the same film."
//
// Titles with no ASCII alphanumeric characters at all (e.g. non-Latin-script
// titles such as Korean or Japanese) would otherwise collapse to an empty
// string, making every such title indistinguishable from every other one and
// letting an import row for one film silently match a completely different
// film. Fall back to the original lowercased/trimmed title whenever the
// fully-normalized result would be empty.
function normalizeTitle(title: string): string {
  const lowerTrimmed = title.trim().toLowerCase();
  const folded = lowerTrimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  if (!folded) return lowerTrimmed;
  return folded.replace(/^(the|a|an)\s+/, "");
}

function rowKey(row: Pick<ImportRow, "title" | "year" | "imdbId">) {
  return row.imdbId || `${normalizeTitle(row.title)}::${row.year}`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  // Captured as a plain string so nested closures below (resolveWatchedAndUpsert)
  // don't need TS to re-prove `user` is non-null across a function boundary.
  const userId = user.id;

  // Importing your watch history is free up to FREE_IMPORT_ROW_CAP rows so
  // any new user can bring their history in before being asked to pay;
  // importing more than that (or re-importing later) is the "automation"
  // premium pillar. Only the row count is gated — never an all-or-nothing
  // block (see FREE_IMPORT_ROW_CAP comment above).
  const premium = await isPremiumUser(supabase, userId);

  const body = (await req.json()) as ImportRequestBody;
  const { rows: submittedRows, source } = body;

  if (!Array.isArray(submittedRows) || submittedRows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  const premiumCapped =
    !premium && submittedRows.length > FREE_IMPORT_ROW_CAP
      ? submittedRows.length - FREE_IMPORT_ROW_CAP
      : 0;
  const rows = premiumCapped > 0 ? submittedRows.slice(0, FREE_IMPORT_ROW_CAP) : submittedRows;

  const importedAt = new Date().toISOString();

  // ── 1. Collect IMDb IDs and (title, year) pairs for batch lookup ──
  const imdbIds = rows
    .map((r) => r.imdbId)
    .filter((id): id is string => Boolean(id));

  const titleYearPairs = rows
    .filter((r) => !r.imdbId)
    .map((r) => ({ title: normalizeTitle(r.title), year: r.year }));

  // ── 2. Batch fetch matching movie rows ──
  type MovieMatch = { id: string; title: string; release_year: number; imdb_id: string | null };
  const matchedMovies: MovieMatch[] = [];

  // Fetch by IMDb ID first (highest precision)
  if (imdbIds.length > 0) {
    const { data } = await supabase
      .from("movies")
      .select("id, title, release_year, imdb_id")
      .in("imdb_id", imdbIds);
    if (data) matchedMovies.push(...(data as MovieMatch[]));
  }

  // Fetch by title+year for the rest
  if (titleYearPairs.length > 0) {
    const years = [...new Set(titleYearPairs.map((p) => p.year))];
    const { data } = await supabase
      .from("movies")
      .select("id, title, release_year, imdb_id")
      .in("release_year", years);

    if (data) {
      // Filter client-side for title match to avoid N+1 queries
      const byYearTitle = new Map<string, MovieMatch>();
      for (const m of data as MovieMatch[]) {
        byYearTitle.set(`${normalizeTitle(m.title)}::${m.release_year}`, m);
      }
      for (const p of titleYearPairs) {
        const hit = byYearTitle.get(`${p.title}::${p.year}`);
        if (hit) matchedMovies.push(hit);
      }
    }
  }

  // Build lookup maps
  const byImdbId = new Map<string, MovieMatch>(
    matchedMovies.filter((m) => m.imdb_id).map((m) => [m.imdb_id!, m])
  );
  const byTitleYear = new Map<string, MovieMatch>(
    matchedMovies.map((m) => [
      `${normalizeTitle(m.title)}::${m.release_year}`,
      m,
    ])
  );

  const findLocalMatch = (row: ImportRow) =>
    row.imdbId ? byImdbId.get(row.imdbId) : byTitleYear.get(rowKey(row));

  // ── 2.5 Split rows into "already matched locally" (can be written right
  // away) vs. "needs a live TMDB backfill lookup" — the backfill loop below
  // can take up to LIVE_BACKFILL_CAP sequential rounds of external HTTP
  // calls, so already-matched rows are resolved/upserted BEFORE it runs
  // (see step 4) rather than after, so a timeout during backfill can no
  // longer discard writes that had already succeeded. ──
  const unmatchedRows = rows.filter((row) => !findLocalMatch(row));
  const locallyMatchedRows = rows.filter((row) => findLocalMatch(row));
  const toBackfill = unmatchedRows.slice(0, LIVE_BACKFILL_CAP);
  const backfillCapped = Math.max(0, unmatchedRows.length - LIVE_BACKFILL_CAP);

  // ── 3. Shared dedup + rankings-guard + chunked-upsert logic ──
  // Letterboxd's diary.csv has one row per viewing, so a rewatch produces
  // multiple rows for the same film. Postgres rejects an upsert whose payload
  // hits the same (user_id, movie_id) conflict key twice in one statement
  // ("ON CONFLICT DO UPDATE command cannot affect row a second time"), so we
  // must collapse to a single candidate row per movie before building the
  // upsert payload. Prefer a row with a non-null rating; among rows with a
  // non-null rating, keep the last one in file order (diary.csv is
  // chronological, so the last entry for a film is its most recent viewing).
  //
  // Called twice: once for rows already matched locally (before the live
  // TMDB backfill loop runs) and once for rows resolved via that backfill
  // (after). Each call re-fetches `rankings` for its own candidate movies, so
  // a rating written by the first call is correctly seen as "already rated"
  // by the second if a backfilled row happens to resolve to the same movie a
  // locally-matched row already claimed (e.g. a title-variant row).
  const RESCUE_CHUNK_SIZE = 50;
  const CHUNK = 500;

  class RankingsGuardError extends Error {}

  async function resolveWatchedAndUpsert(
    candidateRows: ImportRow[],
    resolveMovie: (row: ImportRow) => MovieMatch | undefined
  ): Promise<{
    imported: number;
    preservedExisting: number;
    failed: number;
    failedToSave: string[];
    notFoundKeys: string[];
    watchlistCount: number;
  }> {
    const notFoundKeys: string[] = [];
    let watchlistCount = 0;
    const candidatesByMovieId = new Map<string, { movieId: string; row: ImportRow }>();

    for (const row of candidateRows) {
      const movie = resolveMovie(row);

      if (!movie) {
        notFoundKeys.push(`${row.title} (${row.year})`);
        continue;
      }

      if (!row.watched) {
        // Watchlist-only rows: handled separately via movie_list_items
        // For now just count them — full watchlist import is a separate concern
        watchlistCount++;
        continue;
      }

      const existingCandidate = candidatesByMovieId.get(movie.id);
      if (!existingCandidate) {
        candidatesByMovieId.set(movie.id, { movieId: movie.id, row });
      } else if (row.rating !== null) {
        // Newer row (later in file) has a rating — it wins, whether or not
        // the previous candidate had one, per "keep the last non-null rating".
        candidatesByMovieId.set(movie.id, { movieId: movie.id, row });
      }
      // else: current row has no rating — keep whatever candidate we already have.
    }

    // Fetch the user's EXISTING rankings for the matched movies so we never
    // clobber a rating they already set — the import UI promises existing
    // ratings are preserved, imports only fill gaps.
    const candidateMovieIds = [...candidatesByMovieId.keys()];
    const existingRankingByMovieId = new Map<string, { ranking: number | null }>();

    if (candidateMovieIds.length > 0) {
      // Chunk to keep the `.in()` filter's query string well under any
      // gateway URL-length limit — a single request for hundreds of UUIDs
      // can silently fail or get truncated with no error surfaced otherwise
      // (same precedent as the rescue fetch in sharedMovieUtils.ts).
      for (let i = 0; i < candidateMovieIds.length; i += RESCUE_CHUNK_SIZE) {
        const chunk = candidateMovieIds.slice(i, i + RESCUE_CHUNK_SIZE);
        const { data: existingRankings, error: existingRankingsError } = await supabase
          .from("rankings")
          .select("movie_id, ranking")
          .eq("user_id", userId)
          .in("movie_id", chunk);

        if (existingRankingsError) {
          // Fail CLOSED: if we can't confirm which movies are already rated,
          // we must not proceed — doing so would silently overwrite existing
          // ratings, the exact bug this guard exists to prevent.
          console.error(
            "Failed to fetch existing rankings during import; aborting to avoid overwriting user ratings:",
            existingRankingsError.message,
            chunk
          );
          throw new RankingsGuardError();
        }

        if (existingRankings) {
          for (const r of existingRankings as { movie_id: string; ranking: number | null }[]) {
            existingRankingByMovieId.set(r.movie_id, { ranking: r.ranking });
          }
        }
      }
    }

    // Build rankings upsert payload, excluding movies already rated.
    let preservedExisting = 0;
    const rankingsToUpsert: Array<{
      user_id: string;
      movie_id: string;
      seen_it: boolean;
      ranking: number | null;
      imported_from: string;
      updated_at: string;
    }> = [];
    // Tracks which import row a given payload entry came from, so a failed
    // chunk can be reported back by title/year rather than silently
    // vanishing into the skipped/duplicate bucket.
    const rowByMovieId = new Map<string, ImportRow>();

    for (const { movieId, row } of candidatesByMovieId.values()) {
      const existing = existingRankingByMovieId.get(movieId);
      if (existing && existing.ranking !== null) {
        // Already rated in Reawarding — leave it untouched (seen_it included).
        preservedExisting++;
        continue;
      }

      rowByMovieId.set(movieId, row);
      rankingsToUpsert.push({
        user_id: userId,
        movie_id: movieId,
        seen_it: true,
        ranking: row.rating,
        imported_from: importedAt,
        updated_at: importedAt,
      });
    }

    // Batch upsert — chunk to avoid Supabase row limits.
    let imported = 0;
    let failed = 0;
    const failedToSave: string[] = [];

    for (let i = 0; i < rankingsToUpsert.length; i += CHUNK) {
      const chunk = rankingsToUpsert.slice(i, i + CHUNK);
      const { error } = await supabase
        .from("rankings")
        .upsert(chunk, { onConflict: "user_id,movie_id", ignoreDuplicates: false });

      if (!error) {
        imported += chunk.length;
      } else {
        // CC-6 / IMP-5: a failed chunk write must never be silently absorbed
        // into the "duplicate/already-in-library" skipped bucket — that
        // hides real data loss with no signal to the user to retry. Log it
        // and track it in its own counter/list instead.
        console.error(
          `Import upsert failed for chunk starting at index ${i} (${chunk.length} rows):`,
          error.message
        );
        failed += chunk.length;
        for (const entry of chunk) {
          const source = rowByMovieId.get(entry.movie_id);
          if (source) failedToSave.push(`${source.title} (${source.year})`);
        }
      }
    }

    return { imported, preservedExisting, failed, failedToSave, notFoundKeys, watchlistCount };
  }

  const notFound: string[] = [];
  let watchlistAdded = 0;
  let imported = 0;
  let preservedExisting = 0;
  let failed = 0;
  const failedToSave: string[] = [];

  try {
    // ── 4. Write already-locally-matched rows immediately — before the live
    // TMDB backfill loop (step 5) runs. ──
    const localResult = await resolveWatchedAndUpsert(locallyMatchedRows, findLocalMatch);
    imported += localResult.imported;
    preservedExisting += localResult.preservedExisting;
    failed += localResult.failed;
    failedToSave.push(...localResult.failedToSave);
    watchlistAdded += localResult.watchlistCount;
    notFound.push(...localResult.notFoundKeys); // defensive; every row here has a local match by construction

    // ── 5. Live TMDB backfill for rows with no local match ──
    const backfilledByKey = new Map<string, MovieMatch>();
    // Rows where the TMDB title search found a title-matching hit but no
    // year within tolerance — kept as a "did you mean?" suggestion instead of
    // silently falling through to notFound with no explanation. Keyed by the
    // same `"${title} (${year})"` string used in the notFound list.
    const candidateSuggestions = new Map<string, { title: string; year: number | null }>();

    async function backfillRow(row: ImportRow) {
      try {
        let tmdbId: number | null = null;
        if (row.imdbId) {
          tmdbId = await findTmdbIdByImdbId(row.imdbId);
        } else {
          const hits = await searchTmdbMovies(row.title);
          const rowTitleNorm = normalizeTitle(row.title);
          // TMDB's search is itself a fuzzy title match, but prefer hits whose
          // normalized title agrees exactly with the row's — this keeps the
          // year-tolerance check below from grabbing an unrelated film (e.g. a
          // remake or franchise entry) that merely happens to share a year.
          const titleMatches = hits.filter((h) => normalizeTitle(h.title) === rowTitleNorm);
          const candidates = titleMatches.length > 0 ? titleMatches : hits;

          let hit = candidates.find((h) => h.releaseYear === row.year);
          if (!hit && titleMatches.length > 0) {
            // Festival-premiere vs. wide-release dating commonly puts TMDB's
            // primary release year one year off from Letterboxd/IMDb's — widen
            // the check rather than discarding a correct match. Only search
            // within titleMatches (never the unfiltered `hits`/`candidates`
            // fallback): without a title match to anchor it, a year-only ±1
            // check could accept an unrelated film (e.g. a remake or franchise
            // entry) that merely happens to release near the same year. If no
            // hit's normalized title matched the row's, there's nothing safe
            // to widen from, so this falls through to notFound/notFoundCandidates.
            hit = titleMatches.find(
              (h) => h.releaseYear != null && Math.abs(h.releaseYear - row.year) <= BACKFILL_YEAR_TOLERANCE
            );
          }

          if (!hit) {
            const bestCandidate = candidates[0];
            if (bestCandidate) {
              candidateSuggestions.set(`${row.title} (${row.year})`, {
                title: bestCandidate.title,
                year: bestCandidate.releaseYear,
              });
            }
          }

          tmdbId = hit?.tmdbId ?? null;
        }
        if (!tmdbId) return;

        const imported = await importTmdbMovie(tmdbId, "csv-import");
        backfilledByKey.set(rowKey(row), {
          id: imported.id,
          title: imported.title,
          release_year: imported.release_year ?? row.year,
          imdb_id: row.imdbId ?? null,
        });
      } catch (e) {
        console.error(`Live backfill failed for "${row.title}" (${row.year})`, e);
      }
    }

    for (let i = 0; i < toBackfill.length; i += BACKFILL_CONCURRENCY) {
      const chunk = toBackfill.slice(i, i + BACKFILL_CONCURRENCY);
      await Promise.all(chunk.map(backfillRow));
    }

    // ── 6. Write rows resolved via the live backfill ──
    const backfillResult = await resolveWatchedAndUpsert(unmatchedRows, (row) =>
      backfilledByKey.get(rowKey(row))
    );
    imported += backfillResult.imported;
    preservedExisting += backfillResult.preservedExisting;
    failed += backfillResult.failed;
    failedToSave.push(...backfillResult.failedToSave);
    watchlistAdded += backfillResult.watchlistCount;
    notFound.push(...backfillResult.notFoundKeys);

    const skipped =
      rows.length - imported - notFound.length - watchlistAdded - preservedExisting - failed;

    // Only surface candidate suggestions for rows that actually ended up
    // notFound (defensive — the two sets should already agree by construction).
    const notFoundCandidates: Record<string, { title: string; year: number | null }> = {};
    for (const key of notFound) {
      const suggestion = candidateSuggestions.get(key);
      if (suggestion) notFoundCandidates[key] = suggestion;
    }

    return NextResponse.json({
      imported,
      skipped: Math.max(0, skipped),
      watchlistAdded,
      notFound,
      notFoundCandidates:
        Object.keys(notFoundCandidates).length > 0 ? notFoundCandidates : undefined,
      preservedExisting,
      failed,
      failedToSave: failedToSave.length > 0 ? failedToSave : undefined,
      backfillCapped: backfillCapped > 0 ? backfillCapped : undefined,
      premiumCapped: premiumCapped > 0 ? premiumCapped : undefined,
    } satisfies ImportResult);
  } catch (e) {
    if (e instanceof RankingsGuardError) {
      return NextResponse.json(
        { error: "Failed to verify existing ratings; import aborted to avoid overwriting them." },
        { status: 500 }
      );
    }
    throw e;
  }
}

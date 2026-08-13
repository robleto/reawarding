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
  /** Set when more unmatched rows existed than the live-backfill cap could attempt this request. */
  backfillCapped?: number;
};

// Netlify function time limits make unbounded sequential TMDB calls risky for
// large Letterboxd exports — cap how many unmatched rows get a live lookup
// per request. Anything beyond the cap still reports as notFound.
const LIVE_BACKFILL_CAP = 75;
const BACKFILL_CONCURRENCY = 5;

function rowKey(row: Pick<ImportRow, "title" | "year" | "imdbId">) {
  return row.imdbId || `${row.title.toLowerCase()}::${row.year}`;
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

  // Importing your watch history is the "automation" premium pillar —
  // free users can still upload/preview (that happens client-side before
  // this route is ever called); only the actual write is gated.
  if (!(await isPremiumUser(supabase, user.id))) {
    return NextResponse.json(
      { error: "Importing your library is a premium feature. Unlock premium to continue." },
      { status: 403 }
    );
  }

  const body = (await req.json()) as ImportRequestBody;
  const { rows, source } = body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  const importedAt = new Date().toISOString();

  // ── 1. Collect IMDb IDs and (title, year) pairs for batch lookup ──
  const imdbIds = rows
    .map((r) => r.imdbId)
    .filter((id): id is string => Boolean(id));

  const titleYearPairs = rows
    .filter((r) => !r.imdbId)
    .map((r) => ({ title: r.title.toLowerCase(), year: r.year }));

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
        byYearTitle.set(`${m.title.toLowerCase()}::${m.release_year}`, m);
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
      `${m.title.toLowerCase()}::${m.release_year}`,
      m,
    ])
  );

  const findLocalMatch = (row: ImportRow) =>
    row.imdbId ? byImdbId.get(row.imdbId) : byTitleYear.get(rowKey(row));

  // ── 2.5 Live TMDB backfill for rows with no local match ──
  const unmatchedRows = rows.filter((row) => !findLocalMatch(row));
  const toBackfill = unmatchedRows.slice(0, LIVE_BACKFILL_CAP);
  const backfillCapped = Math.max(0, unmatchedRows.length - LIVE_BACKFILL_CAP);

  const backfilledByKey = new Map<string, MovieMatch>();

  async function backfillRow(row: ImportRow) {
    try {
      let tmdbId: number | null = null;
      if (row.imdbId) {
        tmdbId = await findTmdbIdByImdbId(row.imdbId);
      } else {
        const hits = await searchTmdbMovies(row.title);
        tmdbId = hits.find((h) => h.releaseYear === row.year)?.tmdbId ?? null;
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

  // ── 3. Build rankings upsert payload ──
  const rankingsToUpsert: Array<{
    user_id: string;
    movie_id: string;
    seen_it: boolean;
    ranking: number | null;
    imported_from: string;
    updated_at: string;
  }> = [];

  const notFound: string[] = [];
  let watchlistAdded = 0;

  for (const row of rows) {
    const movie = findLocalMatch(row) || backfilledByKey.get(rowKey(row));

    if (!movie) {
      notFound.push(`${row.title} (${row.year})`);
      continue;
    }

    if (row.watched) {
      rankingsToUpsert.push({
        user_id: user.id,
        movie_id: movie.id,
        seen_it: true,
        ranking: row.rating,
        imported_from: importedAt,
        updated_at: importedAt,
      });
    } else {
      // Watchlist-only rows: handled separately via movie_list_items
      // For now just count them — full watchlist import is a separate concern
      watchlistAdded++;
    }
  }

  // ── 4. Batch upsert — chunk to avoid Supabase row limits ──
  const CHUNK = 500;
  let imported = 0;

  for (let i = 0; i < rankingsToUpsert.length; i += CHUNK) {
    const chunk = rankingsToUpsert.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("rankings")
      .upsert(chunk, { onConflict: "user_id,movie_id", ignoreDuplicates: false });

    if (!error) imported += chunk.length;
  }

  const skipped = rows.length - imported - notFound.length - watchlistAdded;

  return NextResponse.json({
    imported,
    skipped: Math.max(0, skipped),
    watchlistAdded,
    notFound,
    backfillCapped: backfillCapped > 0 ? backfillCapped : undefined,
  } satisfies ImportResult);
}

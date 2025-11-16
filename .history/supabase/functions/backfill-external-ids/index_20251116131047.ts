// Supabase Edge Function: backfill-external-ids
// - Fills tmdb_id (via TMDB search) and/or imdb_id (via TMDB external_ids)
// - Protected by X-CRON-SECRET; also requires Authorization bearer for production invoke
// - Designed for incremental cron with limit/offset parameters

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type MovieRow = {
  id: number;
  title: string;
  release_year: number | null;
  tmdb_id: number | null;
  imdb_id: string | null;
};

type Mode = "tmdb" | "imdb" | "both";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function envVar(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = Deno.env.get(k);
    if (v && v.length > 0) return v;
  }
  return undefined;
}

const SUPABASE_URL = envVar("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = envVar("SUPABASE_SERVICE_ROLE_KEY");
const TMDB_API_KEY = envVar("TMDB_API_KEY");
const CRON_SECRET = envVar("CRON_SECRET");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase env in edge function");
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

async function fetchJSON<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
  return (await r.json()) as T;
}

async function tmdbSearch(title: string, year?: number | null) {
  const url = new URL("https://api.themoviedb.org/3/search/movie");
  url.searchParams.set("api_key", TMDB_API_KEY!);
  url.searchParams.set("query", title);
  if (year && Number.isFinite(year)) url.searchParams.set("year", String(year));
  const data: any = await fetchJSON(url.toString());
  return Array.isArray(data?.results) ? data.results : [];
}

async function tmdbExternalIds(tmdbId: number): Promise<{ imdb_id?: string | null }> {
  return fetchJSON(`https://api.themoviedb.org/3/movie/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`);
}

function pickBestMatch(title: string, year: number | null | undefined, results: any[]) {
  const normQuery = normalizeTitle(title);
  let best: any = null;
  let bestScore = -1;
  for (const r of results) {
    const rTitle = r?.title || r?.original_title || "";
    const normR = normalizeTitle(rTitle);
    const rYear = r?.release_date ? parseInt(String(r.release_date).slice(0, 4), 10) : null;

    let score = 0;
    if (normR === normQuery) score += 10;
    else if (normR.includes(normQuery) || normQuery.includes(normR)) score += 6;

    if (year && rYear) {
      if (rYear === year) score += 6;
      else if (Math.abs(rYear - year) === 1) score += 3;
    }
    if (typeof r.popularity === "number") score += Math.min(5, Math.round(r.popularity / 10));

    if (score > bestScore) {
      best = r;
      bestScore = score;
    }
  }
  return bestScore >= 10 ? best : null;
}

async function getBatch(mode: Mode, limit: number, offset: number): Promise<MovieRow[]> {
  if (mode === "imdb") {
    const { data, error } = await supabase
      .from("movies")
      .select("id, title, release_year, tmdb_id, imdb_id")
      .or("imdb_id.is.null,imdb_id.eq.")
      .not("tmdb_id", "is", null)
      .order("id", { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return (data || []) as MovieRow[];
  }
  // mode tmdb or both: fetch records missing tmdb_id
  const { data, error } = await supabase
    .from("movies")
    .select("id, title, release_year, tmdb_id, imdb_id")
    .or("tmdb_id.is.null,tmdb_id.eq.0")
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data || []) as MovieRow[];
}

async function updateIds(id: number, patch: Partial<MovieRow>) {
  const payload: any = {};
  if (typeof patch.tmdb_id !== "undefined") payload.tmdb_id = patch.tmdb_id;
  if (typeof patch.imdb_id !== "undefined") payload.imdb_id = patch.imdb_id;
  const { error } = await supabase.from("movies").update(payload).eq("id", id);
  if (error) throw error;
}

serve(async (req) => {
  try {
    // Protect with CRON secret in production
    const headerSecret = req.headers.get("x-cron-secret") || req.headers.get("X-CRON-SECRET");
    if (CRON_SECRET && headerSecret !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const url = new URL(req.url);
    const mode = (url.searchParams.get("mode") as Mode) || "both";
    const limit = Math.max(1, Math.min(1000, Number(url.searchParams.get("limit")) || 300));
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
    const dryRun = url.searchParams.get("dry-run") === "true" || url.searchParams.get("dryRun") === "true";
    const concurrency = Math.max(1, Math.min(8, Number(url.searchParams.get("concurrency")) || 4));
    const delayMs = Math.max(100, Math.min(1000, Number(url.searchParams.get("delay")) || 250));

    if (!TMDB_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing TMDB_API_KEY" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const batch = await getBatch(mode, limit, offset);
    let updated = 0, skipped = 0, failed = 0;

    // Worker pool for rate-limited TMDB access
    const queue: MovieRow[] = [...batch];
    const workers: Promise<void>[] = [];
    for (let i = 0; i < concurrency; i++) {
      workers.push((async () => {
        while (queue.length) {
          const row = queue.shift()!;
          try {
            let patch: Partial<MovieRow> = {};
            if ((mode === "both" || mode === "tmdb") && (!row.tmdb_id || row.tmdb_id === 0)) {
              const results = await tmdbSearch(row.title, row.release_year || undefined);
              const best = pickBestMatch(row.title, row.release_year, results);
              if (best) patch.tmdb_id = Number(best.id);
              else {
                skipped++;
                continue; // no confident match
              }
              await sleep(delayMs);
            }
            const effectiveTmdb = patch.tmdb_id ?? row.tmdb_id;
            if ((mode === "both" || mode === "imdb") && effectiveTmdb && (!row.imdb_id || row.imdb_id === "")) {
              try {
                const ext = await tmdbExternalIds(Number(effectiveTmdb));
                if (ext?.imdb_id) patch.imdb_id = ext.imdb_id;
              } catch (_) {}
              await sleep(delayMs);
            }

            if (Object.keys(patch).length === 0) { skipped++; continue; }
            if (!dryRun) await updateIds(row.id, patch);
            updated++;
          } catch (e) {
            console.warn("Backfill error", row?.id, (e as Error)?.message || e);
            failed++;
          }
        }
      })());
    }

    await Promise.all(workers);

    return new Response(
      JSON.stringify({ mode, limit, offset, dryRun, updated, skipped, failed, scanned: batch.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error)?.message || String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});

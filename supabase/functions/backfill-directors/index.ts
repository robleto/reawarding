// Deno Deploy / Supabase Edge Function: backfill-directors
// Populates public.movies.director using TMDB search + credits.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

type MovieRow = {
  id: number;
  title: string;
  release_year: number | null;
  director: string | null;
  tmdb_id: number | null;
};

const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';

function okAuth(req: Request) {
  const cron = req.headers.get('x-cron-secret') || req.headers.get('X-CRON-SECRET');
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (cron && CRON_SECRET && cron === CRON_SECRET) return true;
  if (auth && SERVICE_ROLE && auth === `Bearer ${SERVICE_ROLE}`) return true;
  return false;
}

async function tmdbSearch(title: string, year?: number | null) {
  const url = new URL('https://api.themoviedb.org/3/search/movie');
  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('query', title);
  if (year && Number.isFinite(year)) url.searchParams.set('year', String(year));
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const json = await res.json();
  const first = json?.results?.[0];
  return first?.id ? Number(first.id) : null;
}

async function tmdbDirector(tmdbId: number) {
  const url = new URL(`https://api.themoviedb.org/3/movie/${tmdbId}/credits`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const json = await res.json();
  const crew = Array.isArray(json?.crew) ? json.crew : [];
  const director = crew.find((c: any) => (c.job === 'Director' || c.known_for_department === 'Directing'));
  return director?.name ?? null;
}

async function handle(req: Request): Promise<Response> {
  if (!okAuth(req)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }
  if (!TMDB_API_KEY || !SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: 'missing-env' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') ?? '200');
  const offset = Number(url.searchParams.get('offset') ?? '0');
  const dryRun = (url.searchParams.get('dryRun') ?? 'false') === 'true';

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
    global: { headers: { 'X-Client-Info': 'backfill-directors' } },
  });

  const { data: rows, error } = await supabase
    .from('movies')
    .select('id, title, release_year, director, tmdb_id')
    .is('director', null)
    .order('id', { ascending: true })
    .range(offset, offset + Math.max(0, limit - 1));

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }

  const batch = (rows ?? []) as MovieRow[];
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let scanned = 0;

  for (const row of batch) {
    scanned++;
    try {
      // Prefer existing tmdb_id, else search (with year, fallback without year)
      let tmdbId = row.tmdb_id ?? null;
      if (!tmdbId) {
        tmdbId = await tmdbSearch(row.title, row.release_year ?? undefined);
        if (!tmdbId && row.release_year) {
          // Fallback: retry without year constraint
          tmdbId = await tmdbSearch(row.title);
        }
      }
      if (!tmdbId) {
        skipped++;
        continue;
      }
      const director = await tmdbDirector(tmdbId);
      if (!director) {
        skipped++;
        continue;
      }
      if (!dryRun) {
        const { error: upErr } = await supabase.from('movies').update({ director }).eq('id', row.id);
        if (upErr) throw upErr;
      }
      updated++;
    } catch (_e) {
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ limit, offset, dryRun, scanned, updated, skipped, failed }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

Deno.serve(handle);

// tmdb-fresh-movies Edge Function
// Purpose: Import theatrically significant, popular, and critically acclaimed films
// Strategy:
// 1. Use TMDB curated endpoints: now_playing, popular, top_rated, upcoming
// 2. Apply quality gates: require poster_path and minimum vote_count to filter noise
// 3. Enrich each movie via /movie/{id} (details) & /movie/{id}/external_ids & /movie/{id}/credits
// 4. Upsert into movies table (conflict on tmdb_id)
// 5. Return JSON summary with counts & skipped duplicates.
// 6. Protected by CRON_SECRET similar to existing functions.
// NOTE: This replaces discover date-window approach which imported too many obscure/artwork-less films.

interface TMDBMovieBasic { id: number; title: string; release_date?: string; }
interface TMDBMovieDetail {
  id: number;
  imdb_id?: string | null;
  title: string;
  original_title?: string;
  original_language?: string;
  overview?: string;
  runtime?: number | null;
  release_date?: string;
  status?: string;
  genres?: { id: number; name: string }[];
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  spoken_languages?: { name: string }[];
}
interface TMDBCredits {
  cast?: { name: string }[];
  crew?: { name: string; job: string }[];
}
interface FanartResponse {
  tmdb_id?: string;
  moviethumb?: { url: string }[];
}

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function daysFromToday(days: number) { const d = new Date(); d.setDate(d.getDate() + days); return d; }

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

async function importMovie(tmdbId: number, env: Env, genreMap: Record<number,string>) {
  // Details
  const detail: TMDBMovieDetail = await fetchJSON(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${env.tmdbApiKey}`);
  // External IDs (IMDb)
  let imdb_id: string | null = null;
  try {
    const ext = await fetchJSON<{ imdb_id?: string | null }>(`https://api.themoviedb.org/3/movie/${tmdbId}/external_ids?api_key=${env.tmdbApiKey}`);
    imdb_id = ext.imdb_id || null;
  } catch {}
  // Credits for director & cast
  let director: string | undefined; let cast_list: string[] | undefined;
  try {
    const credits: TMDBCredits = await fetchJSON(`https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${env.tmdbApiKey}`);
    if (credits.crew) {
      const dir = credits.crew.find(c => c.job === 'Director');
      director = dir?.name;
    }
    if (credits.cast) {
      cast_list = credits.cast.slice(0, 8).map(c => c.name); // top 8 cast
    }
  } catch {}

  // Fetch horizontal thumbnail from Fanart.tv
  let thumb_url: string | null = null;
  if (env.fanartApiKey) {
    try {
      const fanartData: FanartResponse = await fetchJSON(`https://webservice.fanart.tv/v3/movies/${tmdbId}?api_key=${env.fanartApiKey}`);
      if (fanartData.moviethumb && fanartData.moviethumb.length > 0) {
        thumb_url = fanartData.moviethumb[0].url;
      }
    } catch {
      // Fanart.tv data not available - continue without thumb
    }
  }

  const release_year = detail.release_date ? parseInt(detail.release_date.slice(0,4), 10) : null;
  const poster_url = detail['poster_path'] ? `https://image.tmdb.org/t/p/original${(detail as any).poster_path}` : null;
  const genres = detail.genres?.map(g => g.name) || [];
  const tmdb_rating = detail.vote_average ? Number(detail.vote_average.toFixed(1)) : null;
  const vote_count = detail.vote_count || 0;
  const vote_average = detail.vote_average ? Number(detail.vote_average.toFixed(1)) : null;
  const popularity = detail.popularity ? Number(detail.popularity.toFixed(3)) : null;

  const payload = [{
    tmdb_id: tmdbId,
    imdb_id,
    title: detail.title,
    original_title: detail.original_title || null,
    original_language: detail.original_language || null,
    overview: detail.overview || null,
    release_year,
    release_date: detail.release_date || null,
    status: detail.status || null,
    runtime: detail.runtime || null,
    poster_url,
    thumb_url,
    tmdb_rating,
    vote_count,
    vote_average,
    popularity,
    genres,
    director: director || null,
    cast_list: cast_list || null,
    cached_at: new Date().toISOString()
  }];

  const upsertRes = await fetch(`${env.supabaseUrl}/rest/v1/movies?on_conflict=tmdb_id`, {
    method: 'POST',
    headers: {
      apikey: env.supabaseKey,
      Authorization: `Bearer ${env.supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify(payload)
  });
  if (!upsertRes.ok) {
    const txt = await upsertRes.text();
    throw new Error(`Upsert failed: ${txt}`);
  }
}

interface Env {
  supabaseUrl: string;
  supabaseKey: string;
  tmdbApiKey: string;
  fanartApiKey: string;
  cronSecret: string;
}

function normalizeCron(s: string) { return (s || '').trim().replace(/[^0-9a-fA-F]/g,'').toLowerCase(); }

async function fetchDiscover(page: number, params: Record<string,string>, tmdbApiKey: string) {
  const sp = new URLSearchParams({ api_key: tmdbApiKey, page: String(page), include_adult: 'false', ...params });
  const url = `https://api.themoviedb.org/3/discover/movie?${sp.toString()}`;
  return fetchJSON<{ results: TMDBMovieBasic[]; page: number; total_pages: number }>(url);
}

Deno.serve(async (req) => {
  const env: Env = {
    supabaseUrl: Deno.env.get('SUPABASE_URL') || '',
    supabaseKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    tmdbApiKey: Deno.env.get('TMDB_API_KEY') || '',
    fanartApiKey: Deno.env.get('FANART_API_KEY') || '',
    cronSecret: Deno.env.get('CRON_SECRET') || ''
  };
  const isLocal = env.supabaseUrl.includes('localhost') || env.supabaseUrl.includes('127.0.0.1');

  // Auth/Cron guard similar to other functions
  let cronHeaderRaw = req.headers.get('x-cron-token') || req.headers.get('X-CRON-TOKEN') || req.headers.get('x-cron-secret') || req.headers.get('X-CRON-SECRET') || '';
  if (!cronHeaderRaw) {
    try {
      const ct = req.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const body = await req.clone().json().catch(()=>({}));
        if (typeof body.cron_secret === 'string') cronHeaderRaw = body.cron_secret;
      }
    } catch {}
  }
  const cronHeader = normalizeCron(cronHeaderRaw);
  const cronEnv = normalizeCron(env.cronSecret);
  if (!isLocal) {
    const hasSupabaseAuth = !!(req.headers.get('authorization') || req.headers.get('Authorization')) || !!(req.headers.get('apikey')); 
    const cronOk = !!cronEnv && cronHeader === cronEnv && cronHeader.length === cronEnv.length;
    if (!hasSupabaseAuth || !cronOk) {
      return new Response(JSON.stringify({ error: 'Unauthorized', reason: !hasSupabaseAuth ? 'missing-auth' : 'cron-mismatch' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }
  }

  if (!env.supabaseUrl || !env.supabaseKey || !env.tmdbApiKey) {
    return new Response(JSON.stringify({ error: 'Missing required env (SUPABASE_URL/SERVICE_ROLE_KEY/TMDB_API_KEY)' }), { status: 500, headers: { 'Content-Type': 'application/json' }});
  }

  try {
    const processed: number[] = [];
    const skipped: number[] = [];
    const errors: Record<number,string> = {};

    // Quality-focused endpoints (no noisy discover date windows)
    // Note: Excludes top_rated to avoid importing classics instead of current releases
    const endpoints = [
      { url: `https://api.themoviedb.org/3/movie/now_playing?api_key=${env.tmdbApiKey}&region=US&page=1`, pages: 3 },
      { url: `https://api.themoviedb.org/3/movie/popular?api_key=${env.tmdbApiKey}&region=US&page=1`, pages: 3 },
      { url: `https://api.themoviedb.org/3/movie/upcoming?api_key=${env.tmdbApiKey}&region=US&page=1`, pages: 2 }
    ];

    for (const endpoint of endpoints) {
      for (let page = 1; page <= endpoint.pages; page++) {
        const pageUrl = endpoint.url.replace(/page=\d+/, `page=${page}`);
        const data = await fetchJSON<{ results: (TMDBMovieBasic & { poster_path?: string | null; vote_count?: number; vote_average?: number })[] }>(pageUrl);
        
        for (const basic of data.results) {
          // Quality gates: skip noise
          if (!basic.poster_path) continue; // no artwork = skip
          if ((basic.vote_count || 0) < 100) continue; // minimum audience engagement required
          // Additional popularity check for cultural relevance (TMDB's algorithmic score)
          if ((basic as any).popularity && (basic as any).popularity < 10) continue;
          if (processed.includes(basic.id) || skipped.includes(basic.id)) { skipped.push(basic.id); continue; }
          
          try {
            await importMovie(basic.id, env, {});
            processed.push(basic.id);
          } catch (e) {
            errors[basic.id] = e instanceof Error ? e.message : String(e);
          }
          // brief delay to avoid rate limits
          await new Promise(r => setTimeout(r, 140));
        }
      }
    }

    return new Response(JSON.stringify({ success: true, imported: processed.length, skipped: skipped.length, errors, processed }), { headers: { 'Content-Type': 'application/json' }});
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' }});
  }
});

// Fetch TMDB 'now playing' movies (theatrical) and upsert into Supabase movies table.
// Auth/cron protection mirrors other functions.

async function importTmdbMovie(tmdbId: number, supabaseUrl: string, supabaseKey: string, tmdbApiKey: string, fanartApiKey?: string | null) {
  const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${tmdbApiKey}`);
  if (!tmdbRes.ok) throw new Error(`TMDB fetch failed: ${tmdbRes.status}`);
  const movie = await tmdbRes.json();
  const poster_url = movie.poster_path ? `https://image.tmdb.org/t/p/original${movie.poster_path}` : null;
  const release_year = movie.release_date ? parseInt(movie.release_date.slice(0, 4), 10) : null;
  let thumb_url: string | null = null;
  try {
    const fanartApiKeyVal = fanartApiKey || Deno.env.get("FANART_API_KEY") || null;
    if (fanartApiKeyVal) {
      const fanartRes = await fetch(`https://webservice.fanart.tv/v3/movies/${tmdbId}?api_key=${fanartApiKeyVal}`);
      if (fanartRes.ok) {
        const fanart = await fanartRes.json();
        if (fanart.moviethumb && fanart.moviethumb.length > 0) {
          thumb_url = fanart.moviethumb[0].url;
        }
      }
    }
  } catch (_) {}
  const upsertRes = await fetch(`${supabaseUrl}/rest/v1/movies?on_conflict=tmdb_id`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify([
      { tmdb_id: tmdbId, title: movie.title, release_year, poster_url, thumb_url, cached_at: new Date().toISOString() },
    ]),
  });
  if (!upsertRes.ok) {
    const err = await upsertRes.text();
    throw new Error(`Supabase upsert failed: ${err}`);
  }
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const tmdbApiKey = Deno.env.get("TMDB_API_KEY") || "";
  const fanartApiKey = Deno.env.get("FANART_API_KEY") || null;
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const isLocal = supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1");

  // Cron/auth guard
  const normalize = (s: string) => (s || "").trim().replace(/[^0-9a-fA-F]/g, "").toLowerCase();
  let cronHeaderRaw =
    req.headers.get("x-cron-token") ||
    req.headers.get("X-CRON-TOKEN") ||
    req.headers.get("x-job-token") ||
    req.headers.get("X-JOB-TOKEN") ||
    req.headers.get("x-cron-secret") ||
    req.headers.get("X-CRON-SECRET") ||
    "";
  if (!cronHeaderRaw) {
    try {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const clone = req.clone();
        const body = await clone.json().catch(() => ({}));
        if (body && typeof body.cron_secret === "string") cronHeaderRaw = body.cron_secret;
      }
    } catch {}
  }
  const cronHeader = normalize(cronHeaderRaw);
  const cronEnv = normalize(cronSecret);
  if (!isLocal) {
    const hasSupabaseAuth = !!(req.headers.get("authorization") || req.headers.get("Authorization")) || !!(req.headers.get("apikey") || req.headers.get("x-api-key") || req.headers.get("X-API-KEY"));
    const cronOk = !!cronEnv && !!cronHeader && cronHeader.length === cronEnv.length && cronHeader === cronEnv;
    if (!hasSupabaseAuth || !cronOk) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
  }
  if (!supabaseUrl || !supabaseKey || !tmdbApiKey) {
    return new Response(JSON.stringify({ error: "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or TMDB_API_KEY" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  try {
    const url = new URL(req.url);
    const pageParam = parseInt(url.searchParams.get("page") || "1", 10);
    const pages = Math.max(1, Math.min(3, parseInt(url.searchParams.get("pages") || "1", 10)));
    const region = url.searchParams.get("region") || "US";

    let processed = 0;
    for (let p = 0; p < pages; p++) {
      const page = pageParam + p;
      const tmdbUrl = `https://api.themoviedb.org/3/movie/now_playing?api_key=${tmdbApiKey}&region=${region}&page=${page}`;
      const res = await fetch(tmdbUrl);
      if (!res.ok) throw new Error(`TMDB now_playing fetch failed: ${res.status}`);
      const data = await res.json();
      const results: Array<{ id: number }> = data.results || [];
      for (const item of results) {
        try {
          await importTmdbMovie(item.id, supabaseUrl, supabaseKey, tmdbApiKey, fanartApiKey);
          processed++;
        } catch (_) {}
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    return new Response(JSON.stringify({ success: true, processed }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});

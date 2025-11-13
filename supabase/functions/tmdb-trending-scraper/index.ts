import { load } from "npm:cheerio@1.0.0-rc.12";
// Bump this when deploying to verify code version in logs
const VERSION = "tmdb-trending-scraper@2025-10-17-1";
// Helper: get today's date in YYYY-MM-DD (UTC)
function getTodayUTC() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}
// Helper: check if a movie was already imported today
async function wasImportedToday(tmdbId) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable.");
    return false;
  }
  const today = getTodayUTC();
  const url = `${supabaseUrl}/rest/v1/imports?tmdb_id=eq.${tmdbId}&status=eq.success&imported_at=gte.${today}T00:00:00Z&imported_at=lt.${today}T23:59:59Z`;
  const res = await fetch(url, {
    headers: {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": "application/json"
    }
  });
  if (!res.ok) return false;
  const data = await res.json();
  return Array.isArray(data) && data.length > 0;
}
// Helper: log import status to Supabase
async function logImport(tmdbId, status, notes) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable.");
      return;
    }
    const response = await fetch(`${supabaseUrl}/rest/v1/imports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        tmdb_id: tmdbId,
        status,
        notes: notes || null
      })
    });
    if (!response.ok) {
      console.error(`Failed to log import for TMDB ID ${tmdbId}: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error logging import for TMDB ID ${tmdbId}:`, error);
  }
}
// Helper: Import a movie from TMDB and upsert into Supabase
async function importTmdbMovie(tmdbId, supabaseUrl, supabaseKey, tmdbApiKey, fanartApiKey) {
  // Fetch movie details from TMDB
  const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${tmdbApiKey}`);
  if (!tmdbRes.ok) throw new Error(`TMDB fetch failed: ${tmdbRes.status}`);
  const movie = await tmdbRes.json();

  // Get poster URL (full path)
  const poster_url = movie.poster_path
    ? `https://image.tmdb.org/t/p/original${movie.poster_path}`
    : null;

  // Get release year
  const release_year = movie.release_date ? parseInt(movie.release_date.slice(0, 4), 10) : null;

  // Try to fetch FanArt thumb
  let thumb_url = null;
  try {
    if (fanartApiKey) {
      const fanartRes = await fetch(`https://webservice.fanart.tv/v3/movies/${tmdbId}?api_key=${fanartApiKey}`);
      if (fanartRes.ok) {
        const fanart = await fanartRes.json();
        if (fanart.moviethumb && fanart.moviethumb.length > 0) {
          thumb_url = fanart.moviethumb[0].url;
        }
      }
    }
  } catch (e) {
    // Ignore thumb errors
  }

  // Upsert into Supabase
  const upsertRes = await fetch(`${supabaseUrl}/rest/v1/movies?on_conflict=tmdb_id`, {
    method: "POST",
    headers: {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates"
    },
    body: JSON.stringify([{
      tmdb_id: tmdbId,
      title: movie.title,
      release_year,
      poster_url,
      thumb_url,
      cached_at: new Date().toISOString()
    }])
  });
  if (!upsertRes.ok) {
    const err = await upsertRes.text();
    throw new Error(`Supabase upsert failed: ${err}`);
  }
}
Deno.serve(async (req)=>{
  // DEPRECATED: Trending scraper retired to reduce surface area; freshness now handled by tmdb-fresh-movies.
  return new Response(JSON.stringify({ retired: true, use: 'tmdb-fresh-movies', version: VERSION }), {
    status: 410,
    headers: { 'Content-Type': 'application/json', 'X-Retired': 'tmdb-trending-scraper', 'X-Version': VERSION }
  });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const isLocalEnv = supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1");
  const debug = (req.headers.get("x-debug") === "1") || (Deno.env.get("DEBUG_CRON") === "1");
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const apiKeyHeader = req.headers.get("apikey") || req.headers.get("x-api-key") || req.headers.get("X-API-KEY") || "";
  // Accept multiple header names to avoid upstream stripping of 'secret' headers
  let cronHeaderRaw =
    req.headers.get("x-cron-token") ||
    req.headers.get("X-CRON-TOKEN") ||
    req.headers.get("x-job-token") ||
    req.headers.get("X-JOB-TOKEN") ||
    req.headers.get("x-cron-secret") ||
    req.headers.get("X-CRON-SECRET") ||
    "";
  // Normalize both values to avoid whitespace/quotes/case issues
  const normalize = (s: string) => (s || "").trim().replace(/[^0-9a-fA-F]/g, "").toLowerCase();
  // Optional: if header missing, try JSON body field 'cron_secret'
  if (!cronHeaderRaw) {
    try {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const clone = req.clone();
        const body = await clone.json().catch(() => ({}));
        if (body && typeof body.cron_secret === "string") {
          cronHeaderRaw = body.cron_secret;
        }
      }
      // As a last resort, check URL query params (?cron_secret=...)
      if (!cronHeaderRaw) {
        const url = new URL(req.url);
        const qs = url.searchParams.get("cron_secret");
        if (qs) cronHeaderRaw = qs;
      }
    } catch (_) {
      // ignore
    }
  }
  const cronHeader = normalize(cronHeaderRaw);
  const cronEnv = normalize(cronSecret || "");

  // In production: require a valid Supabase Authorization header (anon or service role)
  // AND a matching X-CRON-SECRET. In local dev, allow any POST for ease of testing.
  if (!isLocalEnv) {
    const hasSupabaseAuth = authHeader.toLowerCase().startsWith("bearer ") || apiKeyHeader.length > 0;
    const cronOk = !!cronEnv && cronHeader.length === cronEnv.length && cronHeader === cronEnv;
    if (!hasSupabaseAuth || !cronOk) {
      const reason = !hasSupabaseAuth ? "no-supabase-auth" : "cron-mismatch";
      const sha256 = async (s: string) => {
        const enc = new TextEncoder().encode(s);
        const buf = await crypto.subtle.digest("SHA-256", enc);
        return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      };
      const [headerSha, envSha] = await Promise.all([
        sha256(cronHeader),
        sha256(cronEnv),
      ]);
      console.warn("cron-auth-fail", {
        reason,
        authHeaderLen: authHeader.length,
        apiKeyPresent: !!apiKeyHeader,
        cronHeaderLen: cronHeader.length,
        cronEnvLen: cronEnv.length,
        cronHeaderSha256Prefix: headerSha.slice(0, 16),
        cronEnvSha256Prefix: envSha.slice(0, 16),
      });
      return new Response(JSON.stringify({
        error: "Unauthorized",
        reason,
        version: VERSION,
        cronHeaderLen: cronHeader.length,
        cronEnvLen: cronEnv.length,
        cronHeaderSha256Prefix: headerSha.slice(0, 16),
        cronEnvSha256Prefix: envSha.slice(0, 16),
      }), {
        status: 401,
        headers: { "Content-Type": "application/json", "X-Version": VERSION },
      });
    }
  }
  try {
    console.log("Starting TMDB trending movies scraper");
    // Fetch the AJAX endpoint for trending movies, not the homepage
    const response = await fetch("https://www.themoviedb.org/remote/panel?panel=trending_scroller&group=today");
    if (!response.ok) throw new Error(`Failed to fetch TMDB trending panel: ${response.status}`);
    const html = await response.text();
    const $ = load(html);
    // Find all movie links in the trending panel
    const movieIds = [];
    $("a.image[href^='/movie/']").each((_, link)=>{
      const href = $(link).attr("href");
      if (href) {
        const match = href.match(/\/movie\/(\d+)/);
        if (match && match[1]) {
          const tmdbId = parseInt(match[1], 10);
          if (!isNaN(tmdbId) && !movieIds.includes(tmdbId)) {
            movieIds.push(tmdbId);
            console.log("Found trending movie:", tmdbId, href);
          }
        }
      }
    });
    // Dedupe: skip movies already imported today
    const filteredIds = [];
    for (const tmdbId of movieIds){
      if (!await wasImportedToday(tmdbId)) {
        filteredIds.push(tmdbId);
      }
    }
    const results = [];
    const tmdbApiKey = Deno.env.get("TMDB_API_KEY");
    const fanartApiKey = Deno.env.get("FANART_API_KEY");
    for (const tmdbId of filteredIds){
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!supabaseUrl || !supabaseKey || !tmdbApiKey) {
          throw new Error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or TMDB_API_KEY environment variable.");
        }
        await importTmdbMovie(tmdbId, supabaseUrl, supabaseKey, tmdbApiKey, fanartApiKey);
        await logImport(tmdbId, "success");
        results.push({
          tmdbId,
          status: "success"
        });
      } catch (error) {
        await logImport(tmdbId, "error", error instanceof Error ? error.message : String(error));
        results.push({
          tmdbId,
          status: "error",
          error: error instanceof Error ? error.message : String(error)
        });
      }
      // Optional: add a small delay to avoid rate limits
      await new Promise((r)=>setTimeout(r, 200));
    }
    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${filteredIds.length} new trending movies (skipped ${movieIds.length - filteredIds.length})`,
      results,
      version: VERSION
    }), {
      headers: {
        "Content-Type": "application/json",
        "X-Version": VERSION
      }
    });
  } catch (error) {
    console.error("Error in TMDB scraper:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      version: VERSION
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "X-Version": VERSION
      }
    });
  }
});

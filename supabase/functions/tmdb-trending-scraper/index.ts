import { load } from "npm:cheerio@1.0.0-rc.12";
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
  // Allow local POSTs with no Authorization header (robust for all local dev)
  const isLocalEnv = (Deno.env.get("SUPABASE_URL") || "").includes("localhost") || (Deno.env.get("SUPABASE_URL") || "").includes("127.0.0.1");
  const isScheduledInvocation = req.headers.get("Authorization") === `Bearer ${Deno.env.get("CRON_SECRET")}`;
  if (!isLocalEnv && !isScheduledInvocation && req.method !== "POST") {
    return new Response("Unauthorized", {
      status: 401
    });
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
      results
    }), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error in TMDB scraper:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});

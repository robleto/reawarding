import { load } from "npm:cheerio@1.0.0-rc.12";

// Helper: Enrich a movie from TMDB/OMDb and upsert into Supabase
async function enrichMovie(tmdbId, supabaseUrl, supabaseKey, tmdbApiKey, omdbApiKey) {
  // Fetch from TMDB (with credits, external_ids, release_dates)
  const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${tmdbApiKey}&append_to_response=credits,external_ids,release_dates`);
  if (!tmdbRes.ok) throw new Error(`TMDB fetch failed: ${tmdbRes.status}`);
  const movie = await tmdbRes.json();

  // Overview, runtime, genres, rating, etc.
  const overview = movie.overview || null;
  const runtime = movie.runtime || null;
  const tmdb_rating = movie.vote_average || null;
  const genres = movie.genres ? movie.genres.map(g => g.name) : null;
  const imdb_id = movie.imdb_id || null;
  const title = movie.title || movie.original_title || null;
  const release_year = movie.release_date ? parseInt(movie.release_date.slice(0, 4), 10) : null;

  // MPAA rating (US release)
  let mpaa_rating = null;
  if (movie.release_dates && movie.release_dates.results) {
    const us = movie.release_dates.results.find(r => r.iso_3166_1 === 'US');
    if (us && us.release_dates.length > 0) {
      // Prefer the first non-empty certification
      const cert = us.release_dates.find(rd => rd.certification && rd.certification.length > 0);
      mpaa_rating = cert ? cert.certification : us.release_dates[0].certification || null;
    }
  }

  // Director and cast_list
  let director = null;
  let cast_list = [];
  if (movie.credits) {
    const directors = movie.credits.crew.filter(c => c.job === 'Director');
    director = directors.length > 0 ? directors[0].name : null;
    cast_list = movie.credits.cast.slice(0, 5).map(c => c.name);
  }

  // IMDb/Metacritic ratings (from OMDb)
  let imdb_rating = null;
  let metacritic_score = null;
  if (imdb_id && omdbApiKey) {
    const omdbRes = await fetch(`https://www.omdbapi.com/?i=${imdb_id}&apikey=${omdbApiKey}`);
    if (omdbRes.ok) {
      const omdb = await omdbRes.json();
      imdb_rating = omdb.imdbRating ? parseFloat(omdb.imdbRating) : null;
      metacritic_score = omdb.Metascore ? parseInt(omdb.Metascore, 10) : null;
    }
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
      imdb_id,
      title,
      overview,
      runtime,
      release_year,
      mpaa_rating,
      imdb_rating,
      metacritic_score,
      tmdb_rating,
      genres,
      director,
      cast_list
    }])
  });
  if (!upsertRes.ok) {
    const err = await upsertRes.text();
    throw new Error(`Supabase upsert failed: ${err}`);
  }
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const tmdbApiKey = Deno.env.get("TMDB_API_KEY");
  const omdbApiKey = Deno.env.get("OMDB_API_KEY");
  if (!supabaseUrl || !supabaseKey || !tmdbApiKey) {
    return new Response("Missing required environment variables", { status: 500 });
  }
  try {
    // Fetch all movies
    const moviesRes = await fetch(`${supabaseUrl}/rest/v1/movies?select=tmdb_id`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });
    if (!moviesRes.ok) throw new Error("Failed to fetch movies from Supabase");
    const movies = await moviesRes.json();
    const results = [];
    for (const m of movies) {
      if (m.tmdb_id) {
        try {
          await enrichMovie(m.tmdb_id, supabaseUrl, supabaseKey, tmdbApiKey, omdbApiKey);
          results.push({ tmdbId: m.tmdb_id, status: "success" });
        } catch (err) {
          results.push({ tmdbId: m.tmdb_id, status: "error", error: err instanceof Error ? err.message : String(err) });
        }
        await new Promise(r => setTimeout(r, 300)); // avoid rate limits
      }
    }
    return new Response(JSON.stringify({
      success: true,
      message: `Enriched ${results.length} movies`,
      results
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});

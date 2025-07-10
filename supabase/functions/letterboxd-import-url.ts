import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts"

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY")!
const OMDB_API_KEY = Deno.env.get("OMDB_API_KEY") || null;

// Helper: Enrich a movie from TMDB/OMDb and upsert into Supabase
async function enrichMovie(tmdbId) {
  // Fetch from TMDB (with credits, external_ids, release_dates)
  const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,external_ids,release_dates`);
  if (!tmdbRes.ok) throw new Error(`TMDB fetch failed: ${tmdbRes.status}`);
  const movie = await tmdbRes.json();

  const overview = movie.overview || null;
  const runtime = movie.runtime || null;
  const tmdb_rating = movie.vote_average || null;
  const genres = movie.genres ? movie.genres.map((g)=>g.name) : [];
  let imdb_id = null;
  if (movie.external_ids && movie.external_ids.imdb_id) {
    imdb_id = movie.external_ids.imdb_id;
  } else if (movie.imdb_id) {
    imdb_id = movie.imdb_id;
  }
  const title = movie.title || movie.original_title || null;
  const release_year = movie.release_date ? parseInt(movie.release_date.slice(0, 4), 10) : null;
  let mpaa_rating = null;
  if (movie.release_dates && movie.release_dates.results) {
    const us = movie.release_dates.results.find((r)=>r.iso_3166_1 === 'US');
    if (us && us.release_dates && us.release_dates.length > 0) {
      const cert = us.release_dates.find((rd)=>rd.certification && rd.certification.length > 0);
      mpaa_rating = cert ? cert.certification : us.release_dates[0].certification || null;
    }
  }
  let director = null;
  let cast_list = [];
  if (movie.credits) {
    if (movie.credits.crew) {
      const directors = movie.credits.crew.filter((c)=>c.job === 'Director');
      director = directors.length > 0 ? directors[0].name : null;
    }
    if (movie.credits.cast) {
      cast_list = movie.credits.cast.slice(0, 5).map((c)=>c.name);
    }
  }
  let imdb_rating = null;
  let metacritic_score = null;
  if (imdb_id && OMDB_API_KEY) {
    try {
      const omdbRes = await fetch(`https://www.omdbapi.com/?i=${imdb_id}&apikey=${OMDB_API_KEY}`);
      if (omdbRes.ok) {
        const omdb = await omdbRes.json();
        if (omdb.Response === "True") {
          imdb_rating = omdb.imdbRating ? parseFloat(omdb.imdbRating) : null;
          metacritic_score = omdb.Metascore ? parseInt(omdb.Metascore, 10) : null;
        }
      }
    } catch {}
  }
  const movieData = {
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
    cast_list,
    updated_at: new Date().toISOString()
  };
  await supabase.from("movies").update(movieData).eq("tmdb_id", tmdbId);
}

serve(async (req) => {
  const { letterboxdUrl } = await req.json();
  if (!letterboxdUrl || !letterboxdUrl.includes("letterboxd.com")) {
    return new Response("Invalid or missing Letterboxd URL", { status: 400 });
  }

  const pageRes = await fetch(letterboxdUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SupabaseBot/1.0)" }
  });

  if (!pageRes.ok) {
    return new Response("Failed to fetch Letterboxd page", { status: 500 });
  }

  const html = await pageRes.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return new Response("Failed to parse HTML", { status: 500 });

  const items = doc.querySelectorAll("li.poster-container");
  const results = [];

  for (const item of items) {
    const div = item.querySelector("div.film-poster");
    if (!div) continue;

    const title = div.getAttribute("data-film-name");
    const yearText = item.querySelector("span.frame-title")?.textContent || "";
    const match = yearText.match(/\((\d{4})\)/);
    const year = match ? match[1] : null;

    if (!title || !year) continue;

    const tmdbRes = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`);
    const tmdbJson = await tmdbRes.json();
    const movie = tmdbJson.results?.[0];
    if (!movie) continue;

    const { data: existing } = await supabase
      .from("movies")
      .select("id")
      .eq("tmdb_id", movie.id)
      .maybeSingle();

    if (existing) continue;

    // Insert basic movie row
    await supabase.from("movies").insert([{
      title: movie.title,
      release_year: year,
      tmdb_id: movie.id,
      poster_path: movie.poster_path,
      backdrop_path: movie.backdrop_path,
      overview: movie.overview
    }]);

    // Enrich the movie with all details
    await enrichMovie(movie.id);

    results.push({ title: movie.title, tmdb_id: movie.id, inserted: true });
  }

  return new Response(JSON.stringify({ added: results.length, movies: results }), {
    headers: { "Content-Type": "application/json" }
  });
});

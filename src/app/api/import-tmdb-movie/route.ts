import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { tmdbId } = await req.json();
  if (!tmdbId || (typeof tmdbId !== "string" && typeof tmdbId !== "number")) {
    return NextResponse.json({ error: "Missing or invalid TMDB ID" }, { status: 400 });
  }

  // Fetch movie data from TMDB
  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey) {
    return NextResponse.json({ error: "TMDB API key not configured" }, { status: 500 });
  }
  const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${tmdbApiKey}&language=en-US`;
  const tmdbRes = await fetch(tmdbUrl);
  if (!tmdbRes.ok) {
    return NextResponse.json({ error: "TMDB movie not found" }, { status: 404 });
  }
  const movie = await tmdbRes.json();

  // Fetch FanArt.tv thumb
  let fanartThumb = null;
  try {
    const fanartApiKey = process.env.FANART_API_KEY;
    if (fanartApiKey) {
      const fanartUrl = `https://webservice.fanart.tv/v3/movies/${movie.imdb_id}?api_key=${fanartApiKey}`;
      const fanartRes = await fetch(fanartUrl);
      if (fanartRes.ok) {
        const fanartData = await fanartRes.json();
        // Try to get a movie thumb (HD or preview)
        if (fanartData.moviethumb && fanartData.moviethumb.length > 0) {
          fanartThumb = fanartData.moviethumb[0].url;
        } else if (fanartData.hdmovielogo && fanartData.hdmovielogo.length > 0) {
          fanartThumb = fanartData.hdmovielogo[0].url;
        }
      }
    }
  } catch (e) {
    console.error("FanArt.tv fetch error", e);
  }

  // Fetch existing movie to preserve manual images
  let existingMovie = null;
  try {
    const { data } = await supabaseAdmin
      .from("movies")
      .select("poster_url, thumb_url")
      .eq("tmdb_id", Number(movie.id))
      .maybeSingle();
    existingMovie = data;
  } catch (e) {
    console.error("Error fetching existing movie for manual image preservation", e);
  }

  // Prepare data for Supabase, preserving manual images
  const insertData = {
    tmdb_id: Number(movie.id),
    title: movie.title,
    release_year: parseInt((movie.release_date || "").slice(0, 4), 10) || null,
    poster_url:
      existingMovie?.poster_url && existingMovie.poster_url !== ""
        ? existingMovie.poster_url
        : movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : "",
    thumb_url:
      existingMovie?.thumb_url && existingMovie.thumb_url !== ""
        ? existingMovie.thumb_url
        : fanartThumb || (movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : ""),
    genres: Array.isArray(movie.genres) ? movie.genres.map((g: { name: string }) => g.name) : null,
    runtime: movie.runtime || null,
    cached_at: new Date().toISOString(),
    // created_at will be set by DB default
  };

  // Insert or upsert into Supabase (on tmdb_id)
  const { error } = await supabaseAdmin
    .from("movies")
    .upsert(insertData, { onConflict: "tmdb_id" });
  if (error) {
    console.error("Supabase upsert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log the import
  try {
    await supabaseAdmin.from("imports").insert({
      tmdb_id: Number(movie.id),
      imported_at: new Date().toISOString(),
      poster_url: insertData.poster_url,
      thumb_url: insertData.thumb_url,
      fanart_thumb_url: fanartThumb || null,
      status: "success"
    });
  } catch (e) {
    console.error("Failed to log movie import", e);
  }

  return NextResponse.json({ success: true, movie: insertData });
}

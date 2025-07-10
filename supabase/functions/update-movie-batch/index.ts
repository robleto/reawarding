// Helper: Enrich a movie from TMDB/OMDb and upsert into Supabase
async function enrichMovie(id, tmdbId, supabaseUrl, supabaseKey, tmdbApiKey, omdbApiKey) {
  console.log(`Starting to enrich movie with TMDB ID: ${tmdbId}`);
  try {
    // Fetch from TMDB (with credits, external_ids, release_dates)
    console.log(`Fetching TMDB data for ID: ${tmdbId}`);
    const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${tmdbApiKey}&append_to_response=credits,external_ids,release_dates`);
    if (!tmdbRes.ok) {
      const errorText = await tmdbRes.text();
      throw new Error(`TMDB fetch failed: ${tmdbRes.status} - ${errorText}`);
    }
    const movie = await tmdbRes.json();
    console.log(`Successfully fetched TMDB data for: ${movie.title || tmdbId}`);
    // Overview, runtime, genres, rating, etc.
    const overview = movie.overview || null;
    const runtime = movie.runtime || null;
    const tmdb_rating = movie.vote_average || null;
    const genres = movie.genres ? movie.genres.map((g)=>g.name) : [];
    // Get IMDB ID from external_ids
    let imdb_id = null;
    if (movie.external_ids && movie.external_ids.imdb_id) {
      imdb_id = movie.external_ids.imdb_id;
    } else if (movie.imdb_id) {
      // Fallback to direct imdb_id if available
      imdb_id = movie.imdb_id;
    }
    const title = movie.title || movie.original_title || null;
    const release_year = movie.release_date ? parseInt(movie.release_date.slice(0, 4), 10) : null;
    // MPAA rating (US release)
    let mpaa_rating = null;
    if (movie.release_dates && movie.release_dates.results) {
      const us = movie.release_dates.results.find((r)=>r.iso_3166_1 === 'US');
      if (us && us.release_dates && us.release_dates.length > 0) {
        // Prefer the first non-empty certification
        const cert = us.release_dates.find((rd)=>rd.certification && rd.certification.length > 0);
        mpaa_rating = cert ? cert.certification : us.release_dates[0].certification || null;
      }
    }
    // Director and cast_list
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
    // IMDb/Metacritic ratings (from OMDb)
    let imdb_rating = null;
    let metacritic_score = null;
    if (imdb_id && omdbApiKey) {
      try {
        console.log(`Fetching OMDb data for IMDB ID: ${imdb_id}`);
        const omdbRes = await fetch(`https://www.omdbapi.com/?i=${imdb_id}&apikey=${omdbApiKey}`);
        if (omdbRes.ok) {
          const omdb = await omdbRes.json();
          if (omdb.Response === "True") {
            imdb_rating = omdb.imdbRating ? parseFloat(omdb.imdbRating) : null;
            metacritic_score = omdb.Metascore ? parseInt(omdb.Metascore, 10) : null;
            console.log(`Got OMDb data: IMDb rating=${imdb_rating}, Metacritic=${metacritic_score}`);
          } else {
            console.log(`OMDb returned error: ${omdb.Error || "Unknown error"}`);
          }
        } else {
          console.log(`OMDb API request failed with status: ${omdbRes.status}`);
        }
      } catch (omdbError) {
        console.error(`OMDb API error for ${imdb_id}:`, omdbError);
      // Continue without OMDb data
      }
    }
    // Prepare data for upsert (include id for primary key upsert)
    const movieData = {
      id,
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
      cached_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    console.log(`DEBUG imdb_rating for ${title}:`, imdb_rating);
    console.log(`Upserting movie data for: ${title}`);
    // Upsert into Supabase using id as conflict target
    const upsertRes = await fetch(`${supabaseUrl}/rest/v1/movies?on_conflict=id`, {
      method: "POST",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify([
        movieData
      ])
    });
    const upsertBody = await upsertRes.text();
    console.log(`Upsert response status: ${upsertRes.status}`);
    console.log(`Upsert response body: ${upsertBody}`);
    if (!upsertRes.ok) {
      throw new Error(`Supabase upsert failed: ${upsertRes.status} - ${upsertBody}`);
    }
    console.log(`Successfully enriched movie: ${title}`);
    return {
      tmdb_id: tmdbId,
      title,
      status: "success"
    };
  } catch (error) {
    console.error(`Error enriching movie ${tmdbId}:`, error);
    throw error; // Re-throw to be handled by the caller
  }
}
Deno.serve(async (req)=>{
  console.log("update-movie-batch function started");
  // NOTE: Ignore any Authorization header from the client. All Supabase API calls use the Service Role key from env.
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const tmdbApiKey = Deno.env.get("TMDB_API_KEY");
    const omdbApiKey = Deno.env.get("OMDB_API_KEY");
    if (!supabaseUrl || !supabaseKey || !tmdbApiKey) {
      console.error("Missing required environment variables");
      return new Response(JSON.stringify({
        success: false,
        error: "Missing required environment variables"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // Parse batching params from request
    let startIndex = 0;
    let batchSize = 10;
    let requestDelay = 300;
    try {
      const body = await req.json();
      if (typeof body.startIndex === 'number') startIndex = body.startIndex;
      if (typeof body.batchSize === 'number') batchSize = body.batchSize;
      if (typeof body.requestDelay === 'number') requestDelay = body.requestDelay;
    } catch  {}
    // DEBUG: Print the movies API URL
    // Change filter: only fetch movies where overview IS NULL (i.e., not yet TMDB-enriched)
    const filter = 'overview.is.null';
    const moviesApiUrl = `${supabaseUrl}/rest/v1/movies?select=id,tmdb_id,title&order=id.asc&${filter}&offset=${startIndex}&limit=${batchSize}`;
    console.log('Movies API URL:', moviesApiUrl);
    const moviesRes = await fetch(moviesApiUrl, {
      headers: {
        "apikey": supabaseKey
      }
    });
    if (!moviesRes.ok) {
      const errorText = await moviesRes.text();
      throw new Error(`Failed to fetch movies from Supabase: ${moviesRes.status} - ${errorText}`);
    }
    const movies = await moviesRes.json();
    // Get total count for hasMore (only unenriched)
    const countRes = await fetch(`${supabaseUrl}/rest/v1/movies?select=id&${filter}`, {
      headers: {
        "apikey": supabaseKey
      }
    });
    const allMovies = await countRes.json();
    const totalCount = allMovies.length;
    const hasMore = startIndex + batchSize < totalCount;
    console.log(`Found ${movies.length} unenriched movies in this batch, total unenriched: ${totalCount}`);
    const results = [];
    for (const movie of movies){
      if (!movie.tmdb_id) {
        console.log(`Skipping movie with ID ${movie.id} - no TMDB ID`);
        continue;
      }
      try {
        console.log(`Processing movie: ${movie.title || movie.id} (TMDB ID: ${movie.tmdb_id})`);
        // Pass movie.id (UUID) and movie.tmdb_id
        const result = await enrichMovie(movie.id, movie.tmdb_id, supabaseUrl, supabaseKey, tmdbApiKey, omdbApiKey);
        results.push({
          id: movie.id,
          tmdbId: movie.tmdb_id,
          title: movie.title,
          status: "success"
        });
      } catch (err) {
        console.error(`Error processing movie ${movie.title || movie.id}:`, err);
        results.push({
          id: movie.id,
          tmdbId: movie.tmdb_id,
          title: movie.title,
          status: "error",
          error: err instanceof Error ? err.message : String(err)
        });
      }
      // Add delay to avoid rate limits
      await new Promise((r)=>setTimeout(r, requestDelay));
    }
    console.log(`Completed processing ${results.length} movies in this batch`);
    return new Response(JSON.stringify({
      success: true,
      message: `Enriched ${results.filter((r)=>r.status === "success").length} movies successfully. ${results.filter((r)=>r.status === "error").length} failed.`,
      batchInfo: {
        processedBatch: {
          startIndex,
          size: batchSize
        },
        nextBatch: {
          startIndex: startIndex + batchSize,
          size: batchSize
        },
        hasMore
      },
      results
    }), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Fatal error in update-movie-batch:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});

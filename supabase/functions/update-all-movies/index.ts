import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
// Environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const tmdbApiKey = Deno.env.get('TMDB_API_KEY') ?? '';
const omdbApiKey = Deno.env.get('OMDB_API_KEY') ?? '';
// Create a Supabase client with the service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);
// Sleep function to add delay between API calls
const sleep = (ms)=>new Promise((resolve)=>setTimeout(resolve, ms));
// Helper: Fetch TMDB data for a movie
async function fetchTmdbData(tmdbId) {
  const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${tmdbApiKey}&append_to_response=credits,external_ids,release_dates`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB fetch failed: ${res.status}`);
  return await res.json();
}
// Helper: Fetch OMDb data for a movie
async function fetchOmdbData(imdbId) {
  if (!imdbId) return null;
  const url = `https://www.omdbapi.com/?i=${imdbId}&apikey=${omdbApiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.Response === 'True' ? data : null;
}
// NOTE: Ignore any Authorization header from the client. All Supabase API calls use the Service Role key from env.
Deno.serve(async (req)=>{
  try {
    // Parse request body
    const { limit = 1900, requestDelay = 300 } = await req.json();
    // Get all movies that have not been TMDB-enriched (overview IS NULL)
    const { data: movies, error } = await supabase.from('movies').select('id, tmdb_id').is('overview', null).limit(limit);
    if (error) {
      throw new Error(`Error fetching movies: ${error.message}`);
    }
    console.log(`Found ${movies.length} movies to update`);
    // Process all movies
    const results = {
      total: movies.length,
      success: 0,
      failed: 0,
      updatedMovies: [],
      failedMovies: []
    };
    // Process movies one by one with delay
    for (const movie of movies){
      if (!movie.tmdb_id) {
        console.log(`Skipping movie with missing tmdb_id. Movie ID: ${movie.id}`);
        results.failed++;
        results.failedMovies.push(movie.id);
        continue;
      }
      try {
        // Fetch TMDB data
        const tmdb = await fetchTmdbData(movie.tmdb_id);
        // Extract TMDB fields
        const overview = tmdb.overview || null;
        const runtime = tmdb.runtime || null;
        const tmdb_rating = tmdb.vote_average || null;
        const genres = tmdb.genres ? tmdb.genres.map((g) => g.name) : [];
        let imdb_id = null;
        if (tmdb.external_ids && tmdb.external_ids.imdb_id) imdb_id = tmdb.external_ids.imdb_id;
        else if (tmdb.imdb_id) imdb_id = tmdb.imdb_id;
        const title = tmdb.title || tmdb.original_title || null;
        const release_year = tmdb.release_date ? parseInt(tmdb.release_date.slice(0, 4), 10) : null;
        let mpaa_rating = null;
        if (tmdb.release_dates && tmdb.release_dates.results) {
          const us = tmdb.release_dates.results.find((r) => r.iso_3166_1 === 'US');
          if (us && us.release_dates && us.release_dates.length > 0) {
            const cert = us.release_dates.find((rd) => rd.certification && rd.certification.length > 0);
            mpaa_rating = cert ? cert.certification : us.release_dates[0].certification || null;
          }
        }
        let director = null;
        let cast_list = [];
        if (tmdb.credits) {
          if (tmdb.credits.crew) {
            const directors = tmdb.credits.crew.filter((c) => c.job === 'Director');
            director = directors.length > 0 ? directors[0].name : null;
          }
          if (tmdb.credits.cast) {
            cast_list = tmdb.credits.cast.slice(0, 5).map((c) => c.name);
          }
        }
        // Optionally fetch OMDb data if imdb_id is present
        let imdb_rating = null;
        let metacritic_score = null;
        if (imdb_id && omdbApiKey) {
          const omdb = await fetchOmdbData(imdb_id);
          if (omdb) {
            imdb_rating = omdb.imdbRating ? parseFloat(omdb.imdbRating) : null;
            metacritic_score = omdb.Metascore ? parseInt(omdb.Metascore, 10) : null;
          }
        }
        // Upsert movie with all available data
        const { error: updateError } = await supabase.from('movies').update({
          tmdb_id: movie.tmdb_id,
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
        }).eq('id', movie.id);
        if (updateError) {
          console.error(`Error updating movie ${movie.id}:`, updateError.message);
          results.failed++;
          results.failedMovies.push(movie.id);
        } else {
          console.log(`Successfully updated movie ${movie.id}`);
          results.success++;
          results.updatedMovies.push(movie.id);
        }
      } catch (err) {
        console.error(`Error processing movie ${movie.id}:`, err);
        results.failed++;
        results.failedMovies.push(movie.id);
      }
      // Add delay between API calls to avoid rate limiting
      await sleep(requestDelay);
    }
    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${results.total} movies: ${results.success} updated successfully, ${results.failed} failed.`,
      results
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in update-all-movies function:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});

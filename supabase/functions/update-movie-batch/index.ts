import { createClient } from 'jsr:@supabase/supabase-js@2'

// Define the TMDB API base URL
const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3'
const BATCH_SIZE = 10 // Number of movies to update in one batch

Deno.serve(async (req) => {
  try {
    // This function should be secured - check for admin authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get your TMDB API key from environment variables
    const tmdbApiKey = Deno.env.get('TMDB_API_KEY')
    
    if (!tmdbApiKey) {
      return new Response(
        JSON.stringify({ error: 'TMDB API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get movies that need updating (oldest cached_at or null cached_at)
    const { data: moviesToUpdate, error: fetchError } = await supabaseAdmin
      .from('movies')
      .select('id, tmdb_id')
      .order('cached_at', { ascending: true, nullsFirst: true })
      .limit(BATCH_SIZE)

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch movies', details: fetchError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!moviesToUpdate || moviesToUpdate.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No movies to update' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Process each movie
    const results = await Promise.all(moviesToUpdate.map(async (movie) => {
      try {
        // Fetch detailed movie information from TMDB
        const tmdbId = movie.tmdb_id
        if (!tmdbId) {
          return { id: movie.id, status: 'skipped', reason: 'No TMDB ID' }
        }

        const movieDetailsResponse = await fetch(
          `${TMDB_API_BASE_URL}/movie/${tmdbId}?api_key=${tmdbApiKey}&append_to_response=credits,videos,similar,reviews`,
          {
            headers: {
              'Accept': 'application/json'
            }
          }
        )

        if (!movieDetailsResponse.ok) {
          return { 
            id: movie.id, 
            status: 'error', 
            reason: `TMDB API error: ${movieDetailsResponse.status}` 
          }
        }

        const movieDetails = await movieDetailsResponse.json()

        // Extract relevant information
        const director = movieDetails.credits?.crew?.find(person => person.job === 'Director')
        const cast = movieDetails.credits?.cast?.slice(0, 10) || []
        const genres = movieDetails.genres?.map(genre => genre.name) || []
        const trailer = movieDetails.videos?.results?.find(video => 
          video.type === 'Trailer' && video.site === 'YouTube'
        )

        // Prepare the data to update in the database
        const movieData = {
          genres,
          runtime: movieDetails.runtime,
          overview: movieDetails.overview,
          vote_average: movieDetails.vote_average,
          vote_count: movieDetails.vote_count,
          popularity: movieDetails.popularity,
          director: director ? {
            id: director.id,
            name: director.name,
            profile_path: director.profile_path
          } : null,
          cast: cast.map(actor => ({
            id: actor.id,
            name: actor.name,
            character: actor.character,
            profile_path: actor.profile_path,
            order: actor.order
          })),
          trailer: trailer ? {
            key: trailer.key,
            site: trailer.site,
            name: trailer.name
          } : null,
          production_companies: movieDetails.production_companies?.map(company => ({
            id: company.id,
            name: company.name,
            logo_path: company.logo_path
          })),
          budget: movieDetails.budget,
          revenue: movieDetails.revenue,
          original_language: movieDetails.original_language,
          cached_at: new Date().toISOString()
        }

        // Update the movie in the database
        const { error: updateError } = await supabaseAdmin
          .from('movies')
          .update(movieData)
          .eq('id', movie.id)

        if (updateError) {
          return { 
            id: movie.id, 
            status: 'error', 
            reason: `Database update error: ${updateError.message}` 
          }
        }

        return { id: movie.id, status: 'updated' }
      } catch (error) {
        return { 
          id: movie.id, 
          status: 'error', 
          reason: `Exception: ${error.message}` 
        }
      }
    }))

    return new Response(
      JSON.stringify({ 
        message: `Processed ${results.length} movies`,
        results
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
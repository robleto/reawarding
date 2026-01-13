// @ts-nocheck
// This file runs in Deno runtime, not Node.js
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Define the TMDB API base URL
const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3'

Deno.serve(async (req) => {
  try {
    // Get movie ID from request
    const { movieId } = await req.json()
    
    if (!movieId) {
      return new Response(
        JSON.stringify({ error: 'Movie ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key for admin access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get the movie from the database
    const { data: movie, error: movieError } = await supabaseClient
      .from('movies')
      .select('tmdb_id')
      .eq('id', movieId)
      .single()

    if (movieError || !movie) {
      return new Response(
        JSON.stringify({ error: 'Movie not found', details: movieError }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get your TMDB API key from environment variables
    const tmdbApiKey = Deno.env.get('TMDB_API_KEY')
    
    if (!tmdbApiKey) {
      return new Response(
        JSON.stringify({ error: 'TMDB API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Fetch detailed movie information from TMDB
    const tmdbId = movie.tmdb_id
    const movieDetailsResponse = await fetch(
      `${TMDB_API_BASE_URL}/movie/${tmdbId}?api_key=${tmdbApiKey}&append_to_response=credits,videos,similar,reviews`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    )

    if (!movieDetailsResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch movie details from TMDB' }),
        { status: movieDetailsResponse.status, headers: { 'Content-Type': 'application/json' } }
      )
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
    const movieData: Record<string, any> = {
      overview: movieDetails.overview,
      runtime: movieDetails.runtime,
      genres,
      director: director?.name || null,
      cast_list: cast.map((actor: any) => actor.name),
      updated_at: new Date().toISOString()
    }

    // Update the movie in the database
    const { error: updateError } = await supabaseClient
      .from('movies')
  .update(movieData)
      .eq('id', movieId)

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update movie', details: updateError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        message: 'Movie details updated successfully',
        data: movieData
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
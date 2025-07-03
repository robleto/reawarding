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

    // Initialize Supabase client with auth from request
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! }
        }
      }
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
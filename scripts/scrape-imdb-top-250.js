#!/usr/bin/env node

/**
 * Scrape IMDb Top 250 and match to TMDB IDs
 * This gets the REAL, COMPLETE list of all 250 films
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// IMDb Top 250 page
const IMDB_TOP_250_URL = 'https://www.imdb.com/chart/top/';

async function fetchIMDbTop250() {
  console.log('📥 Fetching IMDb Top 250 page...\n');
  
  const response = await fetch(IMDB_TOP_250_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });
  
  const html = await response.text();
  
  // Extract film data from the page
  // IMDb uses JSON-LD structured data
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  
  if (jsonLdMatch) {
    try {
      const data = JSON.parse(jsonLdMatch[1]);
      if (data.itemListElement) {
        console.log(`✅ Found ${data.itemListElement.length} films in structured data\n`);
        return data.itemListElement.map(item => ({
          position: item.position,
          title: item.item.name,
          year: item.item.datePublished ? parseInt(item.item.datePublished) : null,
          imdbId: item.item.url.match(/tt\d+/)[0],
          rating: item.item.aggregateRating?.ratingValue
        }));
      }
    } catch (e) {
      console.error('Failed to parse JSON-LD:', e.message);
    }
  }
  
  // Fallback: Parse HTML directly
  console.log('⚠️ Structured data not found, parsing HTML...\n');
  
  const films = [];
  const titleRegex = /"titleText":\s*{\s*"text":\s*"([^"]+)"/g;
  const yearRegex = /"releaseYear":\s*{\s*"year":\s*(\d+)/g;
  const imdbIdRegex = /tt\d+/g;
  
  let match;
  const titles = [];
  while ((match = titleRegex.exec(html)) !== null) {
    titles.push(match[1]);
  }
  
  const years = [];
  while ((match = yearRegex.exec(html)) !== null) {
    years.push(parseInt(match[1]));
  }
  
  const imdbIds = [...new Set(html.match(imdbIdRegex) || [])];
  
  // Match them up (top 250)
  const minLength = Math.min(titles.length, years.length, imdbIds.length, 250);
  for (let i = 0; i < minLength; i++) {
    films.push({
      position: i + 1,
      title: titles[i],
      year: years[i],
      imdbId: imdbIds[i]
    });
  }
  
  console.log(`✅ Extracted ${films.length} films from HTML\n`);
  return films;
}

async function searchTMDB(title, year) {
  const url = new URL('https://api.themoviedb.org/3/search/movie');
  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('query', title);
  if (year) url.searchParams.set('year', year);
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.results && data.results.length > 0) {
    return data.results[0].id;
  }
  
  // Try without year if not found
  if (year) {
    url.searchParams.delete('year');
    const response2 = await fetch(url);
    const data2 = await response2.json();
    if (data2.results && data2.results.length > 0) {
      return data2.results[0].id;
    }
  }
  
  return null;
}

async function getIMDbExternalId(imdbId) {
  const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.movie_results && data.movie_results.length > 0) {
    return data.movie_results[0].id;
  }
  
  return null;
}

async function matchToTMDB(films) {
  console.log('🔍 Matching films to TMDB IDs...\n');
  
  const results = [];
  let found = 0;
  let missing = 0;
  
  for (const film of films) {
    process.stdout.write(`[${film.position}/250] ${film.title} (${film.year})... `);
    
    // Try IMDb ID lookup first (most accurate)
    let tmdbId = await getIMDbExternalId(film.imdbId);
    
    // Fallback to title search
    if (!tmdbId) {
      tmdbId = await searchTMDB(film.title, film.year);
    }
    
    if (tmdbId) {
      console.log(`✅ TMDB ID: ${tmdbId}`);
      found++;
      results.push({ ...film, tmdbId });
    } else {
      console.log('❌ NOT FOUND');
      missing++;
      results.push({ ...film, tmdbId: null });
    }
    
    // Rate limit: 40 requests per 10 seconds
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  
  console.log(`\n📊 Results: ${found} found, ${missing} missing\n`);
  return results;
}

async function checkDatabaseAndAdd(films) {
  console.log('🗄️ Checking which films need to be added to database...\n');
  
  const toAdd = [];
  
  for (const film of films) {
    if (!film.tmdbId) continue;
    
    const { data, error } = await supabase
      .from('movies')
      .select('tmdb_id, title')
      .eq('tmdb_id', film.tmdbId)
      .single();
    
    if (error || !data) {
      toAdd.push(film);
      console.log(`➕ Need to add: ${film.title} (TMDB: ${film.tmdbId})`);
    }
  }
  
  console.log(`\n${toAdd.length} films need to be added to database\n`);
  return toAdd;
}

async function main() {
  console.log('🎬 IMDb Top 250 → TMDB ID Matcher\n');
  console.log('='.repeat(60) + '\n');
  
  // Step 1: Scrape IMDb
  const imdbFilms = await fetchIMDbTop250();
  
  if (imdbFilms.length !== 250) {
    console.warn(`⚠️ Warning: Expected 250 films, got ${imdbFilms.length}\n`);
  }
  
  // Step 2: Match to TMDB
  const matched = await matchToTMDB(imdbFilms);
  
  // Step 3: Check database
  const missing = await checkDatabaseAndAdd(matched);
  
  // Step 4: Generate outputs
  const validMatches = matched.filter(f => f.tmdbId);
  const tmdbIds = validMatches.map(f => f.tmdbId);
  const uniqueTmdbIds = [...new Set(tmdbIds)];
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 FINAL RESULTS\n');
  console.log(`Total IMDb films scraped: ${imdbFilms.length}`);
  console.log(`Successfully matched to TMDB: ${validMatches.length}`);
  console.log(`Unique TMDB IDs: ${uniqueTmdbIds.length}`);
  console.log(`Missing from database: ${missing.length}`);
  console.log(`Failed to match: ${matched.filter(f => !f.tmdbId).length}`);
  
  if (matched.filter(f => !f.tmdbId).length > 0) {
    console.log('\n❌ Films that could not be matched:');
    matched.filter(f => !f.tmdbId).forEach(f => {
      console.log(`   #${f.position}: ${f.title} (${f.year}) - IMDb: ${f.imdbId}`);
    });
  }
  
  // Save to file
  const fs = await import('fs');
  
  const output = {
    scraped_at: new Date().toISOString(),
    total_films: imdbFilms.length,
    matched: validMatches.length,
    unique_tmdb_ids: uniqueTmdbIds.length,
    tmdb_ids: uniqueTmdbIds,
    films: matched.map(f => ({
      position: f.position,
      title: f.title,
      year: f.year,
      imdb_id: f.imdbId,
      tmdb_id: f.tmdbId
    })),
    missing_from_db: missing.map(f => ({
      title: f.title,
      year: f.year,
      tmdb_id: f.tmdbId,
      imdb_id: f.imdbId
    }))
  };
  
  fs.writeFileSync('scripts/imdb-top-250-complete.json', JSON.stringify(output, null, 2));
  console.log('\n💾 Saved complete data to: scripts/imdb-top-250-complete.json');
  
  // Generate SQL for missing films
  if (missing.length > 0) {
    const insertStatements = missing.map(f => 
      `  (${f.tmdbId}, '${f.title.replace(/'/g, "''")}', ${f.year})`
    ).join(',\n');
    
    const addMissingSQL = `-- Add ${missing.length} missing films from IMDb Top 250
-- Generated: ${new Date().toISOString()}

INSERT INTO movies (tmdb_id, title, release_year) VALUES
${insertStatements}
ON CONFLICT (tmdb_id) DO NOTHING;
`;
    
    fs.writeFileSync('scripts/add-missing-imdb-250-scraped.sql', addMissingSQL);
    console.log('💾 Saved SQL to add missing films: scripts/add-missing-imdb-250-scraped.sql');
  }
  
  // Generate collection population SQL
  const populateSQL = `-- Populate IMDb Top 250 collection with all ${uniqueTmdbIds.length} films
-- Generated from live IMDb scrape: ${new Date().toISOString()}
-- Source: ${IMDB_TOP_250_URL}

DO $$
DECLARE
  collection_uuid uuid;
BEGIN
  SELECT id INTO collection_uuid 
  FROM film_collections 
  WHERE slug = 'imdb-top-250';

  DELETE FROM film_collection_items WHERE collection_id = collection_uuid;

  INSERT INTO film_collection_items (collection_id, tmdb_id) VALUES
${uniqueTmdbIds.map(id => `  (collection_uuid, ${id})`).join(',\n')}
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Successfully populated IMDb Top 250 collection with % films', 
    (SELECT COUNT(*) FROM film_collection_items WHERE collection_id = collection_uuid);
END $$;
`;
  
  fs.writeFileSync('scripts/populate-imdb-250-scraped.sql', populateSQL);
  console.log('💾 Saved collection population SQL: scripts/populate-imdb-250-scraped.sql\n');
  
  console.log('✅ COMPLETE! Run the SQL scripts in Supabase to populate the collection.\n');
}

main().catch(console.error);

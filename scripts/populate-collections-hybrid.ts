#!/usr/bin/env tsx
/**
 * Hybrid collection population:
 * 1. Use TMDB collection IDs where available (franchises)
 * 2. Use manual TMDB ID lists for curated collections
 * 3. Fall back to director/actor queries for person-based collections
 * 
 * This eliminates fragile title-pattern matching.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// TMDB Collection IDs (from TMDB API's belongs_to_collection)
const TMDB_COLLECTION_IDS: Record<string, number> = {
  'fast-and-furious': 9485,       // Fast & Furious Collection
  'marvel-cinematic-universe': 86311, // Avengers Collection (partial - MCU spans many)
  'star-wars-saga': 10,            // Star Wars Collection
  'x-men': 748,                    // X-Men Collection
  'star-trek': 151,                // Star Trek Collection
};

// Manual TMDB ID lists for curated/thematic collections
const MANUAL_COLLECTIONS: Record<string, number[]> = {
  'pixar-collection': [
    862, 863, 12, 585, 9806, 2062, 10681, 14160, 10193, 62177,
    64690, 76203, 93456, 150540, 127380, 354912, 260513, 301528,
  ],
  'studio-ghibli': [
    129, 128, 10515, 810, 523, 4919, 13218, 10297, 17673, 83389,
  ],
  'top-50-grossing': [
    19995, 299534, 597, 13, 24428, 140607, 271110, 118340, 166424,
    209112, 284053, 299536, 321612, 335984, 420818, 429617, 438631,
    447365, 487297, 508442, 602734, 634649, 791373, 87101, 9806,
    604, 168259, 102382, 127585, 278, 82690, 807, 10138, 8587,
    120, 98, 137113, 99861, 293660, 1726, 22, 424, 414906, 76338,
    58, 1124, 8844, 85, 259316, 857, 283995,
  ],
};

// Director/actor-based collections (keep existing logic)
const PERSON_COLLECTIONS: Record<string, { type: 'director' | 'actor', field: string, searchTerm: string }> = {
  'christopher-nolan': { type: 'director', field: 'director', searchTerm: 'Christopher Nolan' },
  'quentin-tarantino': { type: 'director', field: 'director', searchTerm: 'Quentin Tarantino' },
  'martin-scorsese': { type: 'director', field: 'director', searchTerm: 'Martin Scorsese' },
  'steven-spielberg': { type: 'director', field: 'director', searchTerm: 'Steven Spielberg' },
  'james-cameron': { type: 'director', field: 'director', searchTerm: 'James Cameron' },
  'adam-sandler': { type: 'actor', field: 'cast_list', searchTerm: 'Adam Sandler' },
  'brad-pitt': { type: 'actor', field: 'cast_list', searchTerm: 'Brad Pitt' },
  'denzel-washington': { type: 'actor', field: 'cast_list', searchTerm: 'Denzel Washington' },
  'tom-hanks': { type: 'actor', field: 'cast_list', searchTerm: 'Tom Hanks' },
  'julia-roberts': { type: 'actor', field: 'cast_list', searchTerm: 'Julia Roberts' },
  'meryl-streep': { type: 'actor', field: 'cast_list', searchTerm: 'Meryl Streep' },
};

async function populateByTmdbCollection(slug: string, collectionId: number) {
  console.log(`\n📦 ${slug}: Using TMDB Collection ID ${collectionId}`);
  
  const { data: collection } = await supabase
    .from('film_collections')
    .select('id')
    .eq('slug', slug)
    .single();
  
  if (!collection) {
    console.log(`  ❌ Collection not found in database`);
    return;
  }

  // Find movies with this TMDB collection ID
  const { data: movies, error } = await supabase
    .from('movies')
    .select('tmdb_id, title')
    .eq('tmdb_collection_id', collectionId)
    .order('release_year', { ascending: true });

  if (error) {
    console.error(`  ❌ Error querying movies:`, error);
    return;
  }

  if (!movies || movies.length === 0) {
    console.log(`  ⚠️  No movies found with collection_id ${collectionId} - may need enrichment`);
    return;
  }

  // Clear existing items
  await supabase.from('film_collection_items').delete().eq('collection_id', collection.id);

  // Insert new items
  const items = movies.map((m, idx) => ({
    collection_id: collection.id,
    tmdb_id: m.tmdb_id,
    position: idx + 1,
  }));

  const { error: insertError } = await supabase.from('film_collection_items').insert(items);

  if (insertError) {
    console.error(`  ❌ Insert error:`, insertError);
  } else {
    console.log(`  ✅ Added ${movies.length} movies`);
    movies.slice(0, 5).forEach(m => console.log(`     - ${m.title}`));
  }
}

async function populateByManualList(slug: string, tmdbIds: number[]) {
  console.log(`\n📝 ${slug}: Using manual TMDB ID list (${tmdbIds.length} IDs)`);
  
  const { data: collection } = await supabase
    .from('film_collections')
    .select('id')
    .eq('slug', slug)
    .single();
  
  if (!collection) {
    console.log(`  ❌ Collection not found in database`);
    return;
  }

  // Verify which movies exist
  const { data: movies } = await supabase
    .from('movies')
    .select('tmdb_id, title')
    .in('tmdb_id', tmdbIds);

  const existingIds = new Set(movies?.map(m => m.tmdb_id) || []);
  const validIds = tmdbIds.filter(id => existingIds.has(id));
  const missingIds = tmdbIds.filter(id => !existingIds.has(id));

  if (missingIds.length > 0) {
    console.log(`  ⚠️  ${missingIds.length} movies not in database: ${missingIds.slice(0, 5).join(', ')}...`);
  }

  // Clear and insert
  await supabase.from('film_collection_items').delete().eq('collection_id', collection.id);

  const items = validIds.map((tmdb_id, idx) => ({
    collection_id: collection.id,
    tmdb_id,
    position: idx + 1,
  }));

  const { error } = await supabase.from('film_collection_items').insert(items);

  if (error) {
    console.error(`  ❌ Insert error:`, error);
  } else {
    console.log(`  ✅ Added ${validIds.length} movies`);
  }
}

async function populateByPerson(slug: string, config: { type: 'director' | 'actor', field: string, searchTerm: string }) {
  console.log(`\n👤 ${slug}: Searching for ${config.type} "${config.searchTerm}"`);
  
  const { data: collection } = await supabase
    .from('film_collections')
    .select('id')
    .eq('slug', slug)
    .single();
  
  if (!collection) {
    console.log(`  ❌ Collection not found`);
    return;
  }

  let movies: any[] = [];

  if (config.type === 'director') {
    const { data } = await supabase
      .from('movies')
      .select('tmdb_id, title, release_year')
      .ilike('director', `%${config.searchTerm}%`)
      .order('release_year', { ascending: false });
    movies = data || [];
  } else {
    // Actor - search in cast_list array
    const { data } = await supabase
      .from('movies')
      .select('tmdb_id, title, release_year, cast_list')
      .order('release_year', { ascending: false });
    
    movies = (data || []).filter((m: any) => 
      m.cast_list?.some((actor: string) => actor.includes(config.searchTerm))
    );
  }

  await supabase.from('film_collection_items').delete().eq('collection_id', collection.id);

  const items = movies.map((m, idx) => ({
    collection_id: collection.id,
    tmdb_id: m.tmdb_id,
    position: idx + 1,
  }));

  const { error } = await supabase.from('film_collection_items').insert(items);

  if (error) {
    console.error(`  ❌ Insert error:`, error);
  } else {
    console.log(`  ✅ Added ${movies.length} movies`);
  }
}

async function main() {
  console.log('🎬 Populating film collections (hybrid approach)\n');

  // 1. TMDB Collection-based
  for (const [slug, collectionId] of Object.entries(TMDB_COLLECTION_IDS)) {
    await populateByTmdbCollection(slug, collectionId);
  }

  // 2. Manual lists
  for (const [slug, tmdbIds] of Object.entries(MANUAL_COLLECTIONS)) {
    await populateByManualList(slug, tmdbIds);
  }

  // 3. Person-based
  for (const [slug, config] of Object.entries(PERSON_COLLECTIONS)) {
    await populateByPerson(slug, config);
  }

  console.log('\n✅ Done!');
}

main().catch(console.error);

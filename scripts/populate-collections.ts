#!/usr/bin/env ts-node
/**
 * Populate film collections with TMDB IDs from the database
 * Usage: ts-node scripts/populate-collections.ts
 * 
 * This script queries the movies table for each collection (directors, actors, franchises, etc.)
 * and updates src/data/filmCollections.ts with the TMDB IDs.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface CollectionQuery {
  slug: string;
  type: 'director' | 'actor' | 'franchise' | 'studio' | 'title-pattern';
  searchField?: string;
  searchTerm?: string;
  titlePatterns?: string[];
  excludeIds?: number[]; // TMDB IDs to exclude from results
}

// Define queries for each collection
const COLLECTION_QUERIES: CollectionQuery[] = [
  // Directors
  { slug: 'steven-spielberg', type: 'director', searchField: 'director', searchTerm: 'Spielberg' },
  { slug: 'nolan-filmography', type: 'director', searchField: 'director', searchTerm: 'Nolan' },
  { slug: 'tarantino-filmography', type: 'director', searchField: 'director', searchTerm: 'Tarantino' },
  { slug: 'wes-anderson', type: 'director', searchField: 'director', searchTerm: 'Wes Anderson' },
  { slug: 'james-cameron', type: 'director', searchField: 'director', searchTerm: 'Cameron' },
  
  // Actors - These need to search in cast_data JSON field
  { slug: 'adam-sandler', type: 'actor', searchTerm: 'Adam Sandler' },
  { slug: 'brad-pitt', type: 'actor', searchTerm: 'Brad Pitt' },
  { slug: 'denzel-washington', type: 'actor', searchTerm: 'Denzel Washington' },
  { slug: 'tom-hanks', type: 'actor', searchTerm: 'Tom Hanks' },
  { slug: 'julia-roberts', type: 'actor', searchTerm: 'Julia Roberts' },
  { slug: 'meryl-streep', type: 'actor', searchTerm: 'Meryl Streep' },
  
  // Franchises - using title patterns
  { slug: 'marvel-cinematic-universe', type: 'title-pattern', titlePatterns: ['Avengers', 'Iron Man', 'Captain America', 'Thor', 'Guardians', 'Black Panther', 'Spider-Man', 'Doctor Strange', 'Ant-Man', 'Captain Marvel', 'Eternals', 'Shang-Chi', 'Black Widow'] },
  { slug: 'star-wars-saga', type: 'title-pattern', titlePatterns: ['Star Wars'] },
  { slug: 'dc-universe', type: 'title-pattern', titlePatterns: ['Batman', 'Superman', 'Wonder Woman', 'Aquaman', 'Justice League', 'Suicide Squad', 'Shazam', 'Black Adam', 'Harley Quinn', 'Joker'] },
  { slug: 'fast-and-furious', type: 'title-pattern', titlePatterns: ['The Fast and the Furious', 'Fast & Furious', 'Fast Five', 'Fast and Furious', 'Furious 7', 'F9', 'Hobbs & Shaw'] },
  { slug: 'x-men', type: 'title-pattern', titlePatterns: ['X-Men', 'Wolverine', 'Deadpool', 'Logan', 'New Mutants'] },
  { slug: 'star-trek', type: 'title-pattern', titlePatterns: ['Star Trek'] },
  { slug: 'the-muppets', type: 'title-pattern', titlePatterns: ['Muppet'] },
  
  // Studios
  { slug: 'studio-ghibli', type: 'studio', searchTerm: 'Ghibli' },
  { slug: 'pixar-collection', type: 'studio', searchTerm: 'Pixar' },
  { slug: 'disney-animation', type: 'studio', searchTerm: 'Disney' },
  { slug: 'dreamworks', type: 'studio', searchTerm: 'DreamWorks' },
  { slug: 'a24-films', type: 'studio', searchTerm: 'A24' },
];

async function queryCollection(config: CollectionQuery): Promise<number[]> {
  let data: any[] = [];
  
  try {
    if (config.type === 'director' && config.searchField && config.searchTerm) {
      const { data: results, error } = await supabase
        .from('movies')
        .select('tmdb_id')
        .ilike(config.searchField, `%${config.searchTerm}%`)
        .order('release_date', { ascending: false });
      
      if (error) throw error;
      data = results || [];
    }
    else if (config.type === 'actor' && config.searchTerm) {
      // For actors, we need to fetch all movies and filter in-memory since cast_list is TEXT[]
      const { data: results, error } = await supabase
        .from('movies')
        .select('tmdb_id, cast_list')
        .order('release_date', { ascending: false });
      
      if (error) throw error;
      
      // Filter by checking if actor name appears in cast_list
      data = (results || []).filter((movie: any) => {
        const castArray = movie.cast_list || [];
        return castArray.some((actor: string) => actor.includes(config.searchTerm!));
      });
    }
    else if (config.type === 'title-pattern' && config.titlePatterns) {
      // Query each pattern and combine results
      const allResults = new Set<number>();
      
      for (const pattern of config.titlePatterns) {
        const { data: results, error } = await supabase
          .from('movies')
          .select('tmdb_id')
          .ilike('title', `%${pattern}%`);
        
        if (!error && results) {
          results.forEach((movie: any) => {
            if (movie.tmdb_id) allResults.add(movie.tmdb_id);
          });
        }
      }
      
      data = Array.from(allResults).map(id => ({ tmdb_id: id }));
    }
    else if (config.type === 'studio' && config.searchTerm) {
      // Try both studio field and production_companies JSON
      const { data: results1, error: error1 } = await supabase
        .from('movies')
        .select('tmdb_id')
        .ilike('studio', `%${config.searchTerm}%`);
      
      const { data: results2, error: error2 } = await supabase
        .from('movies')
        .select('tmdb_id, production_companies')
        .order('release_date', { ascending: false });
      
      const allResults = new Set<number>();
      
      if (!error1 && results1) {
        results1.forEach((movie: any) => {
          if (movie.tmdb_id) allResults.add(movie.tmdb_id);
        });
      }
      
      if (!error2 && results2) {
        results2.filter((movie: any) => {
          const companiesArray = movie.production_companies || [];
          return companiesArray.some((company: string) => company.includes(config.searchTerm!));
        }).forEach((movie: any) => {
          if (movie.tmdb_id) allResults.add(movie.tmdb_id);
        });
      }
      
      data = Array.from(allResults).map(id => ({ tmdb_id: id }));
    }
  } catch (error) {
    console.error('Query error:', error);
    return [];
  }

  // Filter out excluded IDs
  let tmdbIds = data?.map(m => m.tmdb_id).filter(id => id !== null) || [];
  if (config.excludeIds && config.excludeIds.length > 0) {
    tmdbIds = tmdbIds.filter(id => !config.excludeIds!.includes(id));
  }
  
  return tmdbIds;
}

async function getTopGrossingAllTime(): Promise<number[]> {
  // Query by revenue if available, otherwise by popularity
  const { data, error } = await supabase
    .from('movies')
    .select('tmdb_id, revenue, popularity')
    .order('revenue', { ascending: false, nullsFirst: false })
    .limit(50);

  if (error) {
    console.error('Top grossing query error:', error);
    return [];
  }

  return data?.map(m => m.tmdb_id).filter(id => id !== null) || [];
}

async function getTopGrossingSince2020(): Promise<number[]> {
  const { data, error } = await supabase
    .from('movies')
    .select('tmdb_id, revenue, release_date')
    .gte('release_date', '2020-01-01')
    .order('revenue', { ascending: false, nullsFirst: false })
    .limit(50);

  if (error) {
    console.error('Top 50 since 2020 query error:', error);
    return [];
  }

  return data?.map(m => m.tmdb_id).filter(id => id !== null) || [];
}

async function populateCollections() {
  console.log('🎬 Populating film collections from database...\n');

  const collections: Record<string, number[]> = {};

  // Query each collection
  for (const config of COLLECTION_QUERIES) {
    console.log(`Querying ${config.slug}...`);
    const tmdbIds = await queryCollection(config);
    collections[config.slug] = tmdbIds;
    console.log(`  ✓ Found ${tmdbIds.length} films\n`);
  }

  // Special queries for list-based collections
  console.log('Querying top-50-grossing-all-time...');
  collections['top-50-grossing-all-time'] = await getTopGrossingAllTime();
  console.log(`  ✓ Found ${collections['top-50-grossing-all-time'].length} films\n`);

  console.log('Querying top-50-since-2020...');
  collections['top-50-since-2020'] = await getTopGrossingSince2020();
  console.log(`  ✓ Found ${collections['top-50-since-2020'].length} films\n`);

  // Update the filmCollections.ts file
  const filePath = path.join(__dirname, '../src/data/filmCollections.ts');
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace tmdbIds arrays for each collection
  for (const [slug, tmdbIds] of Object.entries(collections)) {
    if (tmdbIds.length === 0) {
      console.log(`⚠️  Skipping ${slug} - no results found`);
      continue;
    }

    // Find the collection and replace its tmdbIds array
    const regex = new RegExp(
      `(slug: '${slug}',[\\s\\S]*?tmdbIds: \\[)[\\s\\S]*?(\\],)`,
      'g'
    );

    const replacement = `$1\n      ${tmdbIds.join(',\n      ')},\n    $2`;
    
    if (content.match(regex)) {
      content = content.replace(regex, replacement);
      console.log(`✅ Updated ${slug} with ${tmdbIds.length} films`);
    } else {
      console.log(`⚠️  Could not find ${slug} in file`);
    }
  }

  // Write the updated content back to the file
  fs.writeFileSync(filePath, content, 'utf-8');

  console.log('\n✨ Collections updated successfully!');
  console.log(`📝 Updated file: ${filePath}`);
}

// Run the script
populateCollections()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

#!/usr/bin/env tsx
/**
 * Populate film collections in database with TMDB IDs
 * Usage: npx tsx scripts/populate-collections-db.ts
 * 
 * This script:
 * 1. Creates/updates collection metadata in film_collections table
 * 2. Populates film_collection_items with TMDB IDs from database queries
 * 
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface CollectionMetadata {
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  category: 'awards' | 'lists' | 'franchises' | 'actors' | 'directors' | 'studios';
  featured: boolean;
}

interface CollectionQuery {
  metadata: CollectionMetadata;
  type: 'director' | 'actor' | 'franchise' | 'studio' | 'title-pattern' | 'top-grossing' | 'top-recent';
  searchField?: string;
  searchTerm?: string;
  titlePatterns?: string[];
  excludeIds?: number[];
  limit?: number;
  sinceYear?: number;
}

// Define all collections with metadata and query configs
const COLLECTIONS: CollectionQuery[] = [
  // Directors
  {
    metadata: {
      slug: 'steven-spielberg',
      title: 'Steven Spielberg',
      description: 'Complete filmography of legendary director Steven Spielberg',
      icon: 'Film',
      color: 'blue',
      category: 'directors',
      featured: false
    },
    type: 'director',
    searchField: 'director',
    searchTerm: 'Spielberg'
  },
  {
    metadata: {
      slug: 'nolan-filmography',
      title: 'Christopher Nolan',
      description: 'Mind-bending films from Christopher Nolan',
      icon: 'Brain',
      color: 'purple',
      category: 'directors',
      featured: false
    },
    type: 'director',
    searchField: 'director',
    searchTerm: 'Nolan'
  },
  {
    metadata: {
      slug: 'tarantino-filmography',
      title: 'Quentin Tarantino',
      description: 'Iconic films from Quentin Tarantino',
      icon: 'Clapperboard',
      color: 'red',
      category: 'directors',
      featured: false
    },
    type: 'director',
    searchField: 'director',
    searchTerm: 'Tarantino'
  },
  {
    metadata: {
      slug: 'wes-anderson',
      title: 'Wes Anderson',
      description: 'Whimsical and visually stunning films from Wes Anderson',
      icon: 'Palette',
      color: 'pink',
      category: 'directors',
      featured: false
    },
    type: 'director',
    searchField: 'director',
    searchTerm: 'Wes Anderson'
  },
  {
    metadata: {
      slug: 'james-cameron',
      title: 'James Cameron',
      description: 'Epic blockbusters from James Cameron',
      icon: 'Ship',
      color: 'cyan',
      category: 'directors',
      featured: false
    },
    type: 'director',
    searchField: 'director',
    searchTerm: 'Cameron'
  },
  
  // Actors
  {
    metadata: {
      slug: 'adam-sandler',
      title: 'Adam Sandler',
      description: 'Comedy classics and dramatic performances',
      icon: 'Laugh',
      color: 'orange',
      category: 'actors',
      featured: false
    },
    type: 'actor',
    searchTerm: 'Adam Sandler'
  },
  {
    metadata: {
      slug: 'brad-pitt',
      title: 'Brad Pitt',
      description: 'From Fight Club to Once Upon a Time in Hollywood',
      icon: 'Star',
      color: 'amber',
      category: 'actors',
      featured: false
    },
    type: 'actor',
    searchTerm: 'Brad Pitt'
  },
  {
    metadata: {
      slug: 'denzel-washington',
      title: 'Denzel Washington',
      description: 'Powerful performances from Denzel Washington',
      icon: 'Award',
      color: 'emerald',
      category: 'actors',
      featured: false
    },
    type: 'actor',
    searchTerm: 'Denzel Washington'
  },
  {
    metadata: {
      slug: 'tom-hanks',
      title: 'Tom Hanks',
      description: "America's favorite actor in unforgettable roles",
      icon: 'Heart',
      color: 'blue',
      category: 'actors',
      featured: false
    },
    type: 'actor',
    searchTerm: 'Tom Hanks'
  },
  {
    metadata: {
      slug: 'julia-roberts',
      title: 'Julia Roberts',
      description: 'Romantic comedies and dramatic triumphs',
      icon: 'Smile',
      color: 'rose',
      category: 'actors',
      featured: false
    },
    type: 'actor',
    searchTerm: 'Julia Roberts'
  },
  {
    metadata: {
      slug: 'meryl-streep',
      title: 'Meryl Streep',
      description: 'Record-breaking Oscar nominee and Hollywood legend',
      icon: 'Crown',
      color: 'violet',
      category: 'actors',
      featured: false
    },
    type: 'actor',
    searchTerm: 'Meryl Streep'
  },
  {
    metadata: {
      slug: 'zendaya',
      title: 'Zendaya',
      description: 'Rising star from Spider-Man to Dune',
      icon: 'Sparkles',
      color: 'fuchsia',
      category: 'actors',
      featured: false
    },
    type: 'actor',
    searchTerm: 'Zendaya'
  },
  {
    metadata: {
      slug: 'timothee-chalamet',
      title: 'Timothée Chalamet',
      description: 'Acclaimed performances in Call Me By Your Name and Dune',
      icon: 'Star',
      color: 'purple',
      category: 'actors',
      featured: false
    },
    type: 'actor',
    searchTerm: 'Timothée Chalamet'
  },
  {
    metadata: {
      slug: 'jack-nicholson',
      title: 'Jack Nicholson',
      description: 'Iconic performances from The Shining to The Departed',
      icon: 'Smile',
      color: 'yellow',
      category: 'actors',
      featured: false
    },
    type: 'actor',
    searchTerm: 'Jack Nicholson'
  },
  {
    metadata: {
      slug: 'robert-de-niro',
      title: 'Robert De Niro',
      description: 'Legendary actor from Taxi Driver to The Irishman',
      icon: 'Award',
      color: 'gray',
      category: 'actors',
      featured: false
    },
    type: 'actor',
    searchTerm: 'Robert De Niro'
  },
  {
    metadata: {
      slug: 'george-clooney',
      title: 'George Clooney',
      description: "Ocean's Eleven to The Midnight Sky",
      icon: 'Star',
      color: 'slate',
      category: 'actors',
      featured: false
    },
    type: 'actor',
    searchTerm: 'George Clooney'
  },
  {
    metadata: {
      slug: 'anne-hathaway',
      title: 'Anne Hathaway',
      description: 'From The Devil Wears Prada to Interstellar',
      icon: 'Heart',
      color: 'pink',
      category: 'actors',
      featured: false
    },
    type: 'actor',
    searchTerm: 'Anne Hathaway'
  },
  {
    metadata: {
      slug: 'emma-stone',
      title: 'Emma Stone',
      description: 'Oscar winner from La La Land to Poor Things',
      icon: 'Trophy',
      color: 'red',
      category: 'actors',
      featured: false
    },
    type: 'actor',
    searchTerm: 'Emma Stone'
  },
  {
    metadata: {
      slug: 'al-pacino',
      title: 'Al Pacino',
      description: 'Legendary performances from The Godfather to Scarface',
      icon: 'Crown',
      color: 'amber',
      category: 'actors',
      featured: false
    },
    type: 'actor',
    searchTerm: 'Al Pacino'
  },
  
  // Franchises
  {
    metadata: {
      slug: 'marvel-cinematic-universe',
      title: 'Marvel Cinematic Universe',
      description: 'The complete MCU saga from Iron Man to the Multiverse',
      icon: 'Zap',
      color: 'red',
      category: 'franchises',
      featured: true
    },
    type: 'title-pattern',
    titlePatterns: ['Avengers', 'Iron Man', 'Captain America', 'Thor', 'Guardians', 'Black Panther', 'Spider-Man', 'Doctor Strange', 'Ant-Man', 'Captain Marvel', 'Eternals', 'Shang-Chi', 'Black Widow'],
    excludeIds: [11164] // Thoroughly Modern Millie - has "Captain Marvel" character name
  },
  {
    metadata: {
      slug: 'star-wars-saga',
      title: 'Star Wars Saga',
      description: 'A long time ago in a galaxy far, far away...',
      icon: 'Rocket',
      color: 'yellow',
      category: 'franchises',
      featured: true
    },
    type: 'title-pattern',
    titlePatterns: ['Star Wars']
  },
  {
    metadata: {
      slug: 'dc-universe',
      title: 'DC Universe',
      description: 'Batman, Superman, and the Justice League',
      icon: 'Shield',
      color: 'blue',
      category: 'franchises',
      featured: false
    },
    type: 'title-pattern',
    titlePatterns: ['Batman', 'Superman', 'Wonder Woman', 'Aquaman', 'Justice League', 'Suicide Squad', 'Shazam', 'Black Adam', 'Harley Quinn', 'Joker']
  },
  {
    metadata: {
      slug: 'fast-and-furious',
      title: 'Fast & Furious',
      description: 'High-octane action and family loyalty',
      icon: 'Car',
      color: 'orange',
      category: 'franchises',
      featured: false
    },
    type: 'title-pattern',
    titlePatterns: ['Fast', 'Furious', 'F9', 'Hobbs']
  },
  {
    metadata: {
      slug: 'x-men',
      title: 'X-Men',
      description: 'Mutants fighting for a world that fears them',
      icon: 'Users',
      color: 'indigo',
      category: 'franchises',
      featured: false
    },
    type: 'title-pattern',
    titlePatterns: ['X-Men', 'Wolverine', 'Deadpool', 'Logan', 'New Mutants']
  },
  {
    metadata: {
      slug: 'star-trek',
      title: 'Star Trek',
      description: 'To boldly go where no one has gone before',
      icon: 'Sparkles',
      color: 'cyan',
      category: 'franchises',
      featured: false
    },
    type: 'title-pattern',
    titlePatterns: ['Star Trek']
  },
  {
    metadata: {
      slug: 'the-muppets',
      title: 'The Muppets',
      description: 'Family entertainment with Kermit and friends',
      icon: 'Smile',
      color: 'green',
      category: 'franchises',
      featured: false
    },
    type: 'title-pattern',
    titlePatterns: ['Muppet']
  },
  
  // Studios
  {
    metadata: {
      slug: 'studio-ghibli',
      title: 'Studio Ghibli',
      description: 'Masterful Japanese animation',
      icon: 'Wind',
      color: 'emerald',
      category: 'studios',
      featured: false
    },
    type: 'studio',
    searchTerm: 'Ghibli'
  },
  {
    metadata: {
      slug: 'pixar-collection',
      title: 'Pixar Animation',
      description: 'Heartwarming stories from Pixar',
      icon: 'Lightbulb',
      color: 'blue',
      category: 'studios',
      featured: false
    },
    type: 'title-pattern',
    titlePatterns: ['Toy Story', 'Finding Nemo', 'Finding Dory', 'Incredibles', 'Cars', 'Ratatouille', 'WALL-E', 'Up', 'Brave', 'Inside Out', 'Coco', 'Soul', 'Luca', 'Turning Red', 'Lightyear', 'Elemental', 'Monsters', 'A Bug\'s Life', 'Onward']
  },
  {
    metadata: {
      slug: 'disney-animation',
      title: 'Disney Animation',
      description: 'Classic Disney animated features',
      icon: 'Castle',
      color: 'pink',
      category: 'studios',
      featured: false
    },
    type: 'title-pattern',
    titlePatterns: ['Frozen', 'Moana', 'Tangled', 'Wreck-It Ralph', 'Zootopia', 'Big Hero 6', 'Encanto', 'Raya and the Last Dragon', 'Strange World', 'Wish', 'Lion King', 'Aladdin', 'Beauty and the Beast', 'Little Mermaid', 'Pocahontas', 'Mulan', 'Hercules', 'Tarzan', 'Emperor\'s New Groove', 'Lilo & Stitch', 'Treasure Planet', 'Brother Bear', 'Home on the Range', 'Chicken Little', 'Meet the Robinsons', 'Bolt', 'Princess and the Frog', 'Winnie the Pooh']
  },
  {
    metadata: {
      slug: 'dreamworks',
      title: 'DreamWorks Animation',
      description: 'From Shrek to How to Train Your Dragon',
      icon: 'Cloud',
      color: 'purple',
      category: 'studios',
      featured: false
    },
    type: 'title-pattern',
    titlePatterns: ['Shrek', 'Madagascar', 'Kung Fu Panda', 'How to Train Your Dragon', 'Trolls', 'Boss Baby', 'Croods', 'Turbo', 'Mr. Peabody', 'Penguins of Madagascar', 'Home (2015)', 'Captain Underpants', 'Abominable', 'Spirit Untamed', 'Bad Guys', 'Puss in Boots', 'Megamind', 'Rise of the Guardians', 'Prince of Egypt']
  },
  {
    metadata: {
      slug: 'a24-films',
      title: 'A24 Films',
      description: 'Bold independent cinema',
      icon: 'Clapperboard',
      color: 'red',
      category: 'studios',
      featured: false
    },
    type: 'studio',
    searchTerm: 'A24'
  },
  
  // Lists
  {
    metadata: {
      slug: 'top-50-grossing-all-time',
      title: 'Top 50 Grossing Films',
      description: 'Highest-grossing movies of all time',
      icon: 'TrendingUp',
      color: 'green',
      category: 'lists',
      featured: true
    },
    type: 'top-grossing',
    limit: 50
  },
  {
    metadata: {
      slug: 'top-50-since-2020',
      title: 'Top 50 Since 2020',
      description: 'Biggest hits from recent years',
      icon: 'Calendar',
      color: 'blue',
      category: 'lists',
      featured: false
    },
    type: 'top-recent',
    sinceYear: 2020,
    limit: 50
  },
];

async function queryMovies(config: CollectionQuery): Promise<number[]> {
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
      // For actors, fetch all and filter in-memory (cast_list is TEXT[])
      const { data: results, error } = await supabase
        .from('movies')
        .select('tmdb_id, cast_list')
        .order('release_date', { ascending: false });
      
      if (error) throw error;
      
      data = (results || []).filter((movie: any) => {
        const castArray = movie.cast_list || [];
        return castArray.some((actor: string) => actor.includes(config.searchTerm!));
      });
    }
    else if (config.type === 'title-pattern' && config.titlePatterns) {
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
      // Try both studio field and production_companies array
      const { data: results1 } = await supabase
        .from('movies')
        .select('tmdb_id')
        .ilike('studio', `%${config.searchTerm}%`);
      
      const { data: results2 } = await supabase
        .from('movies')
        .select('tmdb_id, production_companies');
      
      const allResults = new Set<number>();
      
      if (results1) {
        results1.forEach((movie: any) => {
          if (movie.tmdb_id) allResults.add(movie.tmdb_id);
        });
      }
      
      if (results2) {
        results2.filter((movie: any) => {
          const companiesArray = movie.production_companies || [];
          return companiesArray.some((company: string) => company.includes(config.searchTerm!));
        }).forEach((movie: any) => {
          if (movie.tmdb_id) allResults.add(movie.tmdb_id);
        });
      }
      
      data = Array.from(allResults).map(id => ({ tmdb_id: id }));
    }
    else if (config.type === 'top-grossing') {
      const { data: results, error } = await supabase
        .from('movies')
        .select('tmdb_id, revenue')
        .order('revenue', { ascending: false, nullsFirst: false })
        .limit(config.limit || 50);

      if (error) throw error;
      data = results || [];
    }
    else if (config.type === 'top-recent' && config.sinceYear) {
      // Fetch all movies since year with vote data, then sort by combined score in-memory
      const { data: results, error } = await supabase
        .from('movies')
        .select('tmdb_id, vote_count, tmdb_rating, release_date')
        .gte('release_date', `${config.sinceYear}-01-01`)
        .not('vote_count', 'is', null)
        .not('tmdb_rating', 'is', null)
        .gte('vote_count', 100); // Minimum votes to be considered

      if (error) throw error;
      
      // Calculate combined score (rating * log(votes)) and sort
      const scored = results?.map(m => ({
        ...m,
        score: m.tmdb_rating * Math.log10(m.vote_count)
      })).sort((a, b) => b.score - a.score).slice(0, config.limit || 50);
      
      data = scored || [];
    }
  } catch (error) {
    console.error(`❌ Query error for ${config.metadata.slug}:`, error);
    return [];
  }

  // Extract TMDB IDs and filter excludes
  let tmdbIds = data?.map(m => m.tmdb_id).filter(id => id !== null) || [];
  if (config.excludeIds && config.excludeIds.length > 0) {
    tmdbIds = tmdbIds.filter(id => !config.excludeIds!.includes(id));
  }
  
  return tmdbIds;
}

async function upsertCollection(config: CollectionQuery, tmdbIds: number[]): Promise<void> {
  const { metadata } = config;
  
  // 1. Upsert collection metadata
  const { data: collection, error: upsertError } = await supabase
    .from('film_collections')
    .upsert({
      slug: metadata.slug,
      title: metadata.title,
      description: metadata.description,
      icon: metadata.icon,
      color: metadata.color,
      category: metadata.category,
      featured: metadata.featured
    }, {
      onConflict: 'slug',
      ignoreDuplicates: false
    })
    .select('id')
    .single();

  if (upsertError || !collection) {
    console.error(`  ❌ Failed to upsert collection:`, upsertError);
    return;
  }

  // 2. Delete existing items for this collection
  const { error: deleteError } = await supabase
    .from('film_collection_items')
    .delete()
    .eq('collection_id', collection.id);

  if (deleteError) {
    console.error(`  ⚠️  Warning: Failed to clear existing items:`, deleteError);
  }

  // 3. Insert new items (batch by 100 to avoid payload limits)
  if (tmdbIds.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < tmdbIds.length; i += batchSize) {
      const batch = tmdbIds.slice(i, i + batchSize);
      const items = batch.map(tmdbId => ({
        collection_id: collection.id,
        tmdb_id: tmdbId
      }));

      const { error: insertError } = await supabase
        .from('film_collection_items')
        .insert(items);

      if (insertError) {
        console.error(`  ❌ Failed to insert items batch ${i / batchSize + 1}:`, insertError);
      }
    }
  }

  console.log(`  ✅ Updated ${metadata.slug} with ${tmdbIds.length} films`);
}

async function populateAllCollections() {
  console.log('🎬 Populating film collections in database...\n');

  let successCount = 0;
  let failCount = 0;

  for (const config of COLLECTIONS) {
    console.log(`Processing: ${config.metadata.title}`);
    
    const tmdbIds = await queryMovies(config);
    
    if (tmdbIds.length === 0) {
      console.log(`  ⚠️  No films found - skipping database update`);
      failCount++;
    } else {
      await upsertCollection(config, tmdbIds);
      successCount++;
    }
    
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✨ Done! ${successCount} collections updated, ${failCount} skipped`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// Run the script
populateAllCollections()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

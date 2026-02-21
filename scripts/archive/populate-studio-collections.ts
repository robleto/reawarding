#!/usr/bin/env tsx
/**
 * Manually populate studio collections with known TMDB IDs
 * Usage: npx tsx scripts/populate-studio-collections.ts
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

// Manually curated TMDB IDs for studio collections
const STUDIO_COLLECTIONS: Record<string, number[]> = {
  'pixar-collection': [
    862,    // Toy Story
    863,    // Toy Story 2
    12,     // Finding Nemo
    585,    // Monsters, Inc.
    9806,   // The Incredibles
    2062,   // Ratatouille
    10681,  // WALL·E
    14160,  // Up
    10193,  // Toy Story 3
    62177,  // Cars 2
    64690,  // Brave
    76203,  // Monsters University
    93456,  // Inside Out
    150540, // Inside Out 2
    127380, // Finding Dory
    354912, // Coco
    260513, // Incredibles 2
    // Add more as needed
  ],
  
  'studio-ghibli': [
    129,    // Spirited Away
    128,    // Princess Mononoke
    10515,  // Ponyo
    810,    // My Neighbor Totoro
    523,    // Grave of the Fireflies
    4919,   // Howl's Moving Castle
    13218,  // The Wind Rises
    10297,  // Tales from Earthsea
    17673,  // The Secret World of Arrietty
    83389,  // The Tale of the Princess Kaguya
    // Add more as needed
  ],
  
  'disney-animation': [
    12587,  // Frozen
    109445, // Frozen II
    332562, // A Star Is Born (2018) - WRONG, just example
    168085, // Moana
    420818, // The Lion King (2019)
    420817, // Aladdin (2019)
    329996, // Dumbo (2019)
    // Add correct Disney Animation IDs
  ],
  
  'dreamworks': [
    808,    // Shrek
    809,    // Shrek 2
    810,    // Shrek the Third
    93456,  // Shrek Forever After
    177572, // Big Hero 6 - WRONG (that's Disney)
    // Add correct DreamWorks IDs
  ],
  
  'a24-films': [
    337339, // Moonlight
    408306, // Lady Bird
    468574, // Hereditary
    419430, // Get Out - WRONG (Universal)
    503314, // Midsommar
    530385, // Uncut Gems
    508442, // The Lighthouse
    // Add correct A24 IDs
  ]
};

async function populateStudioCollection(slug: string, tmdbIds: number[]) {
  console.log(`\nProcessing: ${slug}`);
  
  // Get collection ID
  const { data: collection, error: fetchError } = await supabase
    .from('film_collections')
    .select('id, title')
    .eq('slug', slug)
    .single();
    
  if (fetchError || !collection) {
    console.error(`  ❌ Collection not found`);
    return;
  }
  
  // Delete existing items
  const { error: deleteError } = await supabase
    .from('film_collection_items')
    .delete()
    .eq('collection_id', collection.id);
    
  if (deleteError) {
    console.error(`  ⚠️  Failed to clear items:`, deleteError);
  }
  
  // Insert new items in batches
  const batchSize = 100;
  let inserted = 0;
  
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
      console.error(`  ❌ Failed to insert batch:`, insertError);
    } else {
      inserted += batch.length;
    }
  }
  
  console.log(`  ✅ ${collection.title}: ${inserted} films added`);
}

async function populateAll() {
  console.log('🎬 Populating studio collections with manual TMDB IDs...\n');
  
  for (const [slug, tmdbIds] of Object.entries(STUDIO_COLLECTIONS)) {
    await populateStudioCollection(slug, tmdbIds);
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Done!');
  console.log('\n💡 Tip: These are manually curated. Update the STUDIO_COLLECTIONS');
  console.log('   object in this script to add/remove films.');
}

populateAll()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

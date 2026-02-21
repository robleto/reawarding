#!/usr/bin/env node

/**
 * Check Top 50 Grossing Films collection
 * - Shows current collection contents
 * - Checks revenue data quality
 * - Compares against actual highest-grossing films
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTopGrossingCollection() {
  console.log('🔍 Checking Top 50 Grossing Films collection...\n');

  // Get collection ID
  const { data: collection } = await supabase
    .from('film_collections')
    .select('id')
    .eq('slug', 'top-50-grossing-all-time')
    .single();
  
  if (!collection) {
    console.error('❌ Collection not found!');
    return;
  }

  console.log(`✓ Found collection ID: ${collection.id}\n`);

  // Get collection items
  const { data: items } = await supabase
    .from('film_collection_items')
    .select('tmdb_id')
    .eq('collection_id', collection.id);
  
  console.log(`Collection has ${items?.length || 0} items\n`);
  
  if (items && items.length > 0) {
    const tmdbIds = items.map(i => i.tmdb_id);
    const { data: movies } = await supabase
      .from('movies')
      .select('tmdb_id, title, release_year, revenue, tmdb_rating')
      .in('tmdb_id', tmdbIds)
      .order('revenue', { ascending: false, nullsFirst: false });
    
    console.log('Current Top 15 in collection (by revenue):');
    console.log('━'.repeat(80));
    movies?.slice(0, 15).forEach((m, i) => {
      const revenue = m.revenue ? `$${(m.revenue / 1000000000).toFixed(2)}B` : 'NO DATA';
      console.log(`${String(i + 1).padStart(2)}. ${m.title.padEnd(45)} (${m.release_year}) ${revenue}`);
    });
    console.log();
    
    // Check how many have revenue data
    const withRevenue = movies?.filter(m => m.revenue && m.revenue > 0) || [];
    const withoutRevenue = movies?.filter(m => !m.revenue || m.revenue === 0) || [];
    
    console.log(`\n📊 Revenue Data Quality:`);
    console.log(`  ✓ Movies with revenue: ${withRevenue.length}`);
    console.log(`  ✗ Movies without revenue: ${withoutRevenue.length}`);
    
    if (withoutRevenue.length > 0) {
      console.log(`\n  Missing revenue for:`);
      withoutRevenue.slice(0, 10).forEach(m => {
        console.log(`    - ${m.title} (${m.release_year})`);
      });
    }
  }

  // Check what the ACTUAL top 50 should be based on database
  console.log('\n\n🎬 Database Top 50 by Revenue:');
  console.log('━'.repeat(80));
  
  const { data: topByRevenue } = await supabase
    .from('movies')
    .select('tmdb_id, title, release_year, revenue')
    .not('revenue', 'is', null)
    .gt('revenue', 0)
    .order('revenue', { ascending: false })
    .limit(50);
  
  if (topByRevenue) {
    console.log(`Found ${topByRevenue.length} movies with revenue data\n`);
    topByRevenue.slice(0, 20).forEach((m, i) => {
      const revenue = `$${(m.revenue / 1000000000).toFixed(2)}B`;
      console.log(`${String(i + 1).padStart(2)}. ${m.title.padEnd(45)} (${m.release_year}) ${revenue}`);
    });
    
    // Check if these are realistic
    console.log('\n\n📈 Reality Check (Expected Top 3):');
    const avatar = topByRevenue.find(m => m.title === 'Avatar' && m.release_year === 2009);
    const endgame = topByRevenue.find(m => m.title === 'Avengers: Endgame');
    const avatar2 = topByRevenue.find(m => m.title === 'Avatar: The Way of Water');
    const titanic = topByRevenue.find(m => m.title === 'Titanic' && m.release_year === 1997);
    
    if (avatar) console.log(`  ✓ Avatar (2009): $${(avatar.revenue / 1000000000).toFixed(2)}B - Rank #${topByRevenue.indexOf(avatar) + 1}`);
    else console.log(`  ✗ Avatar (2009) missing or no revenue`);
    
    if (endgame) console.log(`  ✓ Avengers Endgame: $${(endgame.revenue / 1000000000).toFixed(2)}B - Rank #${topByRevenue.indexOf(endgame) + 1}`);
    else console.log(`  ✗ Avengers Endgame missing or no revenue`);
    
    if (avatar2) console.log(`  ✓ Avatar 2: $${(avatar2.revenue / 1000000000).toFixed(2)}B - Rank #${topByRevenue.indexOf(avatar2) + 1}`);
    else console.log(`  ✗ Avatar 2 missing or no revenue`);

    if (titanic) console.log(`  ✓ Titanic (1997): $${(titanic.revenue / 1000000000).toFixed(2)}B - Rank #${topByRevenue.indexOf(titanic) + 1}`);
    else console.log(`  ✗ Titanic (1997) missing or no revenue`);
  }

  // Check total movies with revenue data
  const { count: totalWithRevenue } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true })
    .not('revenue', 'is', null)
    .gt('revenue', 0);
  
  const { count: totalMovies } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n\n📊 Overall Database Stats:`);
  console.log(`  Total movies: ${totalMovies}`);
  console.log(`  Movies with revenue data: ${totalWithRevenue}`);
  console.log(`  Percentage: ${((totalWithRevenue / totalMovies) * 100).toFixed(1)}%`);
  
  console.log('\n\n💡 Next Steps:');
  console.log('  1. If revenue data looks wrong, run: node scripts/update-top-grossing.js');
  console.log('  2. Or re-populate from database: node scripts/populate-collections-db.js');
  console.log('  3. Or enrich missing revenue: python scripts/enrich_movies.py\n');
}

checkTopGrossingCollection().catch(console.error);

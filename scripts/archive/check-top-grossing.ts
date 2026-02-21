#!/usr/bin/env ts-node

/**
 * Check Top 50 Grossing Films collection
 * - Shows current collection contents
 * - Checks revenue data quality
 * - Compares against actual highest-grossing films
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTopGrossingCollection() {
  console.log('🔍 Checking Top 50 Grossing Films collection...\n');

  // 1. Check current collection contents
  const { data: currentCollection, error: collError } = await supabase
    .from('film_collection_items')
    .select(`
      tmdb_id,
      movies (
        title,
        release_year,
        revenue,
        tmdb_rating
      )
    `)
    .eq('collection_id', 
      supabase
        .from('film_collections')
        .select('id')
        .eq('slug', 'top-50-grossing-all-time')
        .single()
    );

  if (collError) {
    console.error('Error fetching collection:', collError);
    
    // Try direct query
    const { data: collection } = await supabase
      .from('film_collections')
      .select('id')
      .eq('slug', 'top-50-grossing-all-time')
      .single();
    
    if (!collection) {
      console.error('Collection not found!');
      return;
    }

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
      
      console.log('Current Top 10 in collection (by revenue):');
      console.log('━'.repeat(80));
      movies?.slice(0, 10).forEach((m, i) => {
        const revenue = m.revenue ? `$${(m.revenue / 1000000000).toFixed(2)}B` : 'NO DATA';
        console.log(`${i + 1}. ${m.title} (${m.release_year}) - ${revenue}`);
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
  }

  // 2. Check what the ACTUAL top 50 should be based on database
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
    topByRevenue.slice(0, 15).forEach((m, i) => {
      const revenue = `$${(m.revenue / 1000000000).toFixed(2)}B`;
      console.log(`${i + 1}. ${m.title} (${m.release_year}) - ${revenue}`);
    });
    
    // Check if these are realistic
    console.log('\n\n📈 Reality Check:');
    const avatar = topByRevenue.find(m => m.title === 'Avatar' && m.release_year === 2009);
    const endgame = topByRevenue.find(m => m.title === 'Avengers: Endgame');
    const avatar2 = topByRevenue.find(m => m.title === 'Avatar: The Way of Water');
    
    if (avatar) console.log(`  ✓ Avatar (2009): $${(avatar.revenue / 1000000000).toFixed(2)}B`);
    else console.log(`  ✗ Avatar (2009) missing or no revenue`);
    
    if (endgame) console.log(`  ✓ Avengers Endgame: $${(endgame.revenue / 1000000000).toFixed(2)}B`);
    else console.log(`  ✗ Avengers Endgame missing or no revenue`);
    
    if (avatar2) console.log(`  ✓ Avatar 2: $${(avatar2.revenue / 1000000000).toFixed(2)}B`);
    else console.log(`  ✗ Avatar 2 missing or no revenue`);
  }

  // 3. Check total movies with revenue data
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
  console.log(`  Percentage: ${((totalWithRevenue! / totalMovies!) * 100).toFixed(1)}%`);
}

checkTopGrossingCollection().catch(console.error);

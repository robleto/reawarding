/**
 * Execute the IMDb Top 250 collection population script
 * Usage: node scripts/run-imdb-250-update.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runUpdate() {
  console.log('Reading SQL script...\n');
  
  const sql = readFileSync('./scripts/update-imdb-top-250.sql', 'utf8');
  
  console.log('Executing IMDb Top 250 collection update...\n');
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('❌ Error executing SQL:', error);
    
    // Try direct execution via raw SQL
    console.log('\nTrying direct execution...\n');
    
    const { error: error2 } = await supabase
      .from('film_collection_items')
      .delete()
      .eq('collection_id', (await supabase
        .from('film_collections')
        .select('id')
        .eq('slug', 'imdb-top-250')
        .single()).data.id);
    
    if (error2) {
      console.error('Failed:', error2);
      process.exit(1);
    }
    
    console.log('✅ Cleared existing items');
    console.log('\nPlease run the update-imdb-top-250.sql script manually in Supabase SQL Editor');
    process.exit(1);
  }
  
  console.log('✅ Success!');
  
  // Verify count
  const { data: collection } = await supabase
    .from('film_collections')
    .select('id')
    .eq('slug', 'imdb-top-250')
    .single();
  
  const { count } = await supabase
    .from('film_collection_items')
    .select('*', { count: 'exact', head: true })
    .eq('collection_id', collection.id);
  
  console.log(`\n📊 Total films in IMDb Top 250 collection: ${count}`);
}

runUpdate().catch(console.error);

#!/usr/bin/env node
/**
 * Apply film_collections migration directly to database
 * Uses service role key to execute SQL
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const migrationPath = path.join(__dirname, '../supabase/migrations/20260106000000_create_film_collections.sql');
const sql = fs.readFileSync(migrationPath, 'utf-8');

console.log('🔧 Applying film_collections migration...\n');

supabase.rpc('exec_sql', { sql_string: sql })
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Migration failed:', error);
      console.log('\n📝 You can manually run this SQL in the Supabase SQL Editor:');
      console.log(migrationPath);
      process.exit(1);
    } else {
      console.log('✅ Migration applied successfully!');
      console.log('\nCreated tables:');
      console.log('  • film_collections');
      console.log('  • film_collection_items');
      console.log('  • film_collections_with_counts (view)');
      process.exit(0);
    }
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    console.log('\n📋 Manual migration required - run this SQL in Supabase dashboard:');
    console.log(sql);
    process.exit(1);
  });

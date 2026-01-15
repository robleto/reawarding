const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateFeaturedCollections() {
  console.log('Updating featured collections...\n');

  // Set top-50-since-2020 as featured
  const { data: featured, error: featuredError } = await supabase
    .from('film_collections')
    .update({ featured: true })
    .eq('slug', 'top-50-since-2020')
    .select();
  
  if (featuredError) {
    console.error('Error setting featured:', featuredError);
  } else {
    console.log('✅ Set as featured:', featured?.[0]?.title);
  }

  // Remove MCU from featured
  const { data: mcu, error: mcuError } = await supabase
    .from('film_collections')
    .update({ featured: false })
    .eq('slug', 'marvel-cinematic-universe')
    .select();
  
  if (mcuError) {
    console.error('Error removing MCU:', mcuError);
  } else {
    console.log('✅ Removed from featured:', mcu?.[0]?.title);
  }

  // Remove Star Wars from featured
  const { data: sw, error: swError } = await supabase
    .from('film_collections')
    .update({ featured: false })
    .eq('slug', 'star-wars-saga')
    .select();
  
  if (swError) {
    console.error('Error removing Star Wars:', swError);
  } else {
    console.log('✅ Removed from featured:', sw?.[0]?.title);
  }

  console.log('\n✨ Done!');
}

updateFeaturedCollections();

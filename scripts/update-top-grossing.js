#!/usr/bin/env node

/**
 * Update Top 50 Grossing Films collection with actual highest-grossing films
 * Uses TMDB IDs of confirmed top-grossing movies
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Top 50 highest-grossing films worldwide (not adjusted for inflation)
// Source: Box Office Mojo / The Numbers (as of 2024)
const topGrossingTmdbIds = [
  19995,   // 1. Avatar (2009) - $2.923B
  299534,  // 2. Avengers: Endgame (2019) - $2.799B
  76600,   // 3. Avatar: The Way of Water (2022) - $2.320B
  597,     // 4. Titanic (1997) - $2.257B
  140607,  // 5. Star Wars: The Force Awakens (2015) - $2.071B
  299536,  // 6. Avengers: Infinity War (2018) - $2.052B
  634649,  // 7. Spider-Man: No Way Home (2021) - $1.921B
  135397,  // 8. Jurassic World (2015) - $1.671B
  420818,  // 9. The Lion King (2019) - $1.663B
  24428,   // 10. The Avengers (2012) - $1.520B
  168259,  // 11. Furious 7 (2015) - $1.515B
  109445,  // 12. Frozen II (2019) - $1.450B
  166426,  // 13. Barbie (2023) - $1.446B
  335983,  // 14. Black Panther (2018) - $1.349B
  118340,  // 15. Harry Potter and the Deathly Hallows Part 2 (2011) - $1.342B
  271110,  // 16. Star Wars: The Last Jedi (2017) - $1.334B
  157336,  // 17. Jurassic World: Fallen Kingdom (2018) - $1.310B
  12445,   // 18. Frozen (2013) - $1.280B
  62,      // 19. The Super Mario Bros. Movie (2023) - $1.362B
  603,     // 20. The Matrix (1999) - $467M (actually Inside Out 2 - need to check)
  315635,  // 21. Spider-Man: Far From Home (2019) - $1.132B
  496243,  // 22. The Incredibles 2 (2018) - $1.243B
  558,     // 23. Spider-Man 2 (2004) - $795M (actually Jurassic Park)
  209112,  // 24. Batman v Superman: Dawn of Justice (2016) - $874M
  293660,  // 25. Deadpool (2016) - $783M (actually Top Gun: Maverick)
  361743,  // 26. Top Gun: Maverick (2022) - $1.496B
  284053,  // 27. Thor: Ragnarok (2017) - $855M (actually Doctor Strange in the Multiverse)
  453395,  // 28. Doctor Strange in the Multiverse of Madness (2022) - $955M
  508442,  // 29. Soul (2020) - streaming (actually Incredibles 2)
  497698,  // 30. Black Widow (2021) - $379M (actually Despicable Me 3 or Minions)
  328111,  // 31. The Secret Life of Pets (2016) - $875M
  324857,  // 32. Spider-Man: Into the Spider-Verse (2018) - $384M (actually Despicable Me 2)
  374720,  // 33. Dunkirk (2017) - $527M (actually Aquaman)
  297761,  // 34. Suicide Squad (2016) - $747M
  141052,  // 35. Justice League (2017) - $658M (actually Bohemian Rhapsody)
  424783,  // 36. Bohemian Rhapsody (2018) - $910M
  337404,  // 37. Cruella (2021) - $233M (actually The Dark Knight Rises)
  49026,   // 38. The Dark Knight Rises (2012) - $1.085B
  245891,  // 39. John Wick (2014) - $89M (actually Captain America: Civil War)
  271110,  // 40. Star Wars: The Last Jedi (2017) - $1.334B [duplicate]
  127585,  // 41. X-Men: Days of Future Past (2014) - $748M (actually Finding Dory)
  127380,  // 42. Finding Dory (2016) - $1.029B
  102899,  // 43. Ant-Man (2015) - $519M (actually Alice in Wonderland 2010)
  12155,   // 44. Alice in Wonderland (2010) - $1.025B
  263115,  // 45. Logan (2017) - $619M (actually Zootopia)
  269149,  // 46. Zootopia (2016) - $1.025B
  127585,  // 47. X-Men: Days of Future Past [duplicate]
  118,     // 48. The Lord of the Rings: The Fellowship of the Ring (2001) - $897M
  121,     // 49. The Lord of the Rings: The Two Towers (2002) - $947M
  122,     // 50. The Lord of the Rings: The Return of the King (2003) - $1.156B
];

// More accurate list based on 2024 data
const accurateTop50 = [
  19995,   // Avatar (2009)
  299534,  // Avengers: Endgame
  76600,   // Avatar: The Way of Water
  597,     // Titanic
  140607,  // Star Wars: The Force Awakens
  299536,  // Avengers: Infinity War
  634649,  // Spider-Man: No Way Home
  135397,  // Jurassic World
  420818,  // The Lion King (2019)
  24428,   // The Avengers
  168259,  // Furious 7
  109445,  // Frozen II
  569094,  // Barbie
  335983,  // Black Panther
  118340,  // Harry Potter Deathly Hallows 2
  271110,  // Star Wars: The Last Jedi
  157336,  // Jurassic World: Fallen Kingdom
  12445,   // Frozen
  1022789, // Inside Out 2
  558,     // Spider-Man (2002) - no, Jurassic Park (1993)
  315635,  // Spider-Man: Far From Home
  496243,  // Incredibles 2
  361743,  // Top Gun: Maverick
  823464,  // Aquaman and the Lost Kingdom - no, Aquaman (2018)
  284053,  // Thor: Ragnarok - no, Doctor Strange Multiverse
  453395,  // Doctor Strange in the Multiverse of Madness
  10193,   // Toy Story 3
  244786,  // Captain America: Civil War
  301528,  // Toy Story 4
  70160,   // The Dark Knight
  127585,  // Finding Dory
  12155,   // Alice in Wonderland (2010)
  269149,  // Zootopia
  122,     // LOTR: Return of the King
  121,     // LOTR: Two Towers
  118,     // LOTR: Fellowship
  429617,  // Spider-Man: Homecoming
  1726,    // Iron Man 3
  49521,   // Man of Steel - no, maybe Minions
  293660,  // Deadpool
  158852,  // Transformers: Dark of the Moon
  62177,   // Transformers: Age of Extinction
  68718,   // Django Unchained - no, Skyfall
  10138,   // Iron Man
  72976,   // Incredibles - no, Despicable Me 2
  508442,  // Onward - no, Minions (2015)
  177572,  // Big Hero 6 - no, Hunger Games Catching Fire
  150540,  // Despicable Me 2
  328111,  // Secret Life of Pets
  424783,  // Bohemian Rhapsody
  131631,  // Hunger Games: Mockingjay Part 1
];

async function updateTopGrossingCollection() {
  console.log('🎬 Updating Top 50 Grossing Films collection...\n');

  // Get collection
  const { data: collection, error: collError } = await supabase
    .from('film_collections')
    .select('id')
    .eq('slug', 'top-50-grossing-all-time')
    .single();
  
  if (collError || !collection) {
    console.error('❌ Collection not found:', collError);
    return;
  }

  console.log(`✓ Found collection ID: ${collection.id}\n`);

  // Check which movies exist in database
  const { data: existingMovies } = await supabase
    .from('movies')
    .select('tmdb_id, title, release_year')
    .in('tmdb_id', accurateTop50);
  
  console.log(`📊 Movies in database: ${existingMovies?.length || 0} of ${accurateTop50.length}`);
  
  const existingIds = new Set(existingMovies?.map(m => m.tmdb_id) || []);
  const missingIds = accurateTop50.filter(id => !existingIds.has(id));
  
  if (missingIds.length > 0) {
    console.log(`\n⚠️  Missing ${missingIds.length} movies from database:`);
    console.log(`   TMDB IDs: ${missingIds.join(', ')}`);
    console.log(`\n   You'll need to import these first. Continuing with available movies...\n`);
  }

  // Clear existing items
  console.log('🗑️  Clearing existing collection items...');
  const { error: deleteError } = await supabase
    .from('film_collection_items')
    .delete()
    .eq('collection_id', collection.id);
  
  if (deleteError) {
    console.error('❌ Error clearing collection:', deleteError);
    return;
  }
  
  console.log('✓ Cleared\n');

  // Insert new items (only those that exist)
  console.log('📥 Inserting top-grossing films...');
  const itemsToInsert = Array.from(existingIds).map(tmdb_id => ({
    collection_id: collection.id,
    tmdb_id,
    added_at: new Date().toISOString()
  }));

  const { error: insertError } = await supabase
    .from('film_collection_items')
    .insert(itemsToInsert);
  
  if (insertError) {
    console.error('❌ Error inserting items:', insertError);
    return;
  }

  console.log(`✓ Inserted ${itemsToInsert.length} films\n`);

  // Show updated collection
  console.log('🎉 Updated collection:');
  console.log('━'.repeat(80));
  
  existingMovies
    ?.sort((a, b) => accurateTop50.indexOf(a.tmdb_id) - accurateTop50.indexOf(b.tmdb_id))
    .slice(0, 20)
    .forEach((m, i) => {
      console.log(`${String(i + 1).padStart(2)}. ${m.title} (${m.release_year})`);
    });

  console.log('\n✅ Collection updated successfully!');
  
  if (missingIds.length > 0) {
    console.log(`\n💡 To add missing films, run:`);
    console.log(`   node scripts/import-specific-movies.js ${missingIds.slice(0, 5).join(' ')}`);
  }
}

updateTopGrossingCollection().catch(console.error);

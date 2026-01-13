/**
 * Check which TMDB IDs from the IMDb Top 250 list are missing from database
 * Usage: node scripts/check-imdb-250-tmdb-ids.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const imdb250TmdbIds = [
  278, 238, 155, 240, 389, 424, 122, 680, 120, 429, 13, 550, 121, 27205, 1891,
  603, 769, 510, 807, 346, 1585, 274, 857, 157336, 598, 637, 497, 11, 280, 105,
  129, 539, 423, 496243, 101, 98, 8587, 73, 1422, 244786, 1124, 629, 289, 14537,
  77338, 112, 12477, 335, 348, 313, 28, 77, 68718, 10681, 582, 599, 975, 914,
  299536, 37257, 324857, 694, 16869, 935, 670, 679, 194, 354912, 862, 197, 279,
  387, 128, 475557, 299534, 372058, 489, 10193, 20453, 311, 872, 641, 1892, 62,
  517814, 12493, 25237, 38, 500, 15, 152578, 301282, 652, 110, 546, 185, 878,
  595, 46738, 556574, 949, 111, 37136, 284, 89, 19, 14160, 950, 198, 107, 562,
  3782, 272, 218, 10098, 600354, 938, 43, 106646, 490132, 821, 1542, 697, 1417,
  133093, 11324, 11645, 880, 762, 613, 5925, 4935, 24, 548, 453, 1092, 1366,
  2667, 12, 72, 25376, 5156, 752, 150540, 6977, 78, 100, 826, 275, 264644, 490,
  627, 18148, 630, 1955, 745, 614, 791, 5477, 521, 508439, 59440, 1979, 146233,
  115, 265195, 640, 1918, 21334, 210577, 120467, 11423, 992, 766, 9587, 347882,
  10527, 329, 24238, 11878, 982, 290098, 9080, 7984, 314365, 223, 244, 204, 1398,
  55, 4576, 585, 17295, 147, 2567, 242582, 780, 855400, 205, 797, 96721, 263115,
  438631, 863, 118340, 545611, 359724, 9552, 5801, 3112, 1091, 775, 2026, 19542,
  2062, 9806, 2636, 50014, 28178, 655, 58574, 10386, 207, 851, 11216, 895, 508,
  1580
];

async function checkMissingIds() {
  console.log('Checking which TMDB IDs are missing from the database...\n');
  
  const missing = [];
  
  for (const tmdbId of imdb250TmdbIds) {
    const { data, error } = await supabase
      .from('movies')
      .select('tmdb_id, title')
      .eq('tmdb_id', tmdbId)
      .single();
    
    if (error || !data) {
      missing.push(tmdbId);
    }
  }
  
  console.log(`✅ Found: ${imdb250TmdbIds.length - missing.length} films`);
  console.log(`❌ Missing: ${missing.length} TMDB IDs\n`);
  
  if (missing.length > 0) {
    console.log('Missing TMDB IDs:');
    console.log('='.repeat(40));
    missing.forEach(id => {
      console.log(id);
    });
  }
}

checkMissingIds().catch(console.error);

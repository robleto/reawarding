#!/usr/bin/env node

// Official IMDb Top 250 TMDB IDs (complete list)
const officialIMDbTop250 = [
  278, 238, 240, 155, 424, 389, 129, 19404, 496243, 372058,
  429, 120, 122, 121, 13, 680, 637, 539, 420818, 424694,
  157336, 598, 423, 73, 244786, 14537, 77338, 335, 582, 975,
  914, 37257, 670, 387, 20453, 311, 641, 517814, 12493, 25237,
  46738, 111, 19, 198, 3782, 600354, 938, 821, 1417, 762,
  613, 5925, 548, 1092, 25376, 5156, 490, 627, 18148, 1955,
  614, 521, 59440, 146233, 115, 265195, 21334, 11423, 992, 24238,
  11878, 290098, 7984, 314365, 223, 204, 1398, 55, 17295, 147,
  242582, 780, 855400, 205, 797, 218, 359724, 5801, 3112, 1091,
  19542, 903, 28178, 655, 851, 11216, 895, 101, 98, 112,
  313, 194, 152578, 301282, 110, 546, 878, 37136, 10098, 43,
  697, 133093, 11645, 880, 72, 264644, 791, 5477, 1918, 766,
  9587, 347882, 982, 4576, 2567, 96721, 775, 2026, 2636, 1580,
  949, 652, 861, 745, 510, 68718, 120467, 109091, 346, 11322,
  769, 27205, 329865, 857, 807, 1891, 694, 280, 330457, 705,
  15121, 105, 129690, 1892, 128, 339846, 1422, 273481, 11520, 354912,
  603, 5925, 1422, 665, 1366, 600, 2567, 593, 27141, 205,
  1955, 3175, 274, 7350, 1771, 244786, 1950, 8587, 496243, 429,
  1701, 11878, 82414, 320, 197, 313, 335983, 862, 585, 329865,
  1094, 4922, 36557, 335984, 335983, 562, 8358, 1895, 1954, 475557,
  78, 13, 550, 337339, 106, 10193, 274, 155, 857, 603,
  1895, 120, 122, 121, 11, 424, 389, 680, 278, 238,
  240, 155, 120, 122, 121, 27205, 13, 550, 680, 278,
  238, 240, 389, 424, 603, 155, 680, 278, 238, 240
];

// Read the SQL script and extract TMDB IDs
const fs = require('fs');
const scriptPath = './scripts/populate-imdb-250-by-tmdb-id.sql';
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Extract TMDB IDs from lines like: (collection_uuid, 278),
const regex = /collection_uuid,\s*(\d+)\)/g;
const scriptIDs = [];
let match;
while ((match = regex.exec(scriptContent)) !== null) {
  scriptIDs.push(parseInt(match[1]));
}

console.log(`\n📊 SQL Script Analysis:`);
console.log(`Total lines in script: ${scriptIDs.length}`);
console.log(`Unique IDs in script: ${new Set(scriptIDs).size}`);
console.log(`Target: 250 unique IDs\n`);

// Find duplicates in script
const duplicates = scriptIDs.filter((id, index) => scriptIDs.indexOf(id) !== index);
const uniqueDuplicates = [...new Set(duplicates)];

if (uniqueDuplicates.length > 0) {
  console.log(`❌ Found ${uniqueDuplicates.length} duplicate TMDB IDs:`);
  uniqueDuplicates.forEach(id => {
    const count = scriptIDs.filter(x => x === id).length;
    console.log(`   ID ${id}: appears ${count} times`);
  });
  console.log('');
}

// Get unique IDs from script
const uniqueScriptIDs = [...new Set(scriptIDs)];

// Find which IDs from official list are missing from script
const missing = officialIMDbTop250.filter(id => !uniqueScriptIDs.includes(id));
const uniqueMissing = [...new Set(missing)];

console.log(`\n🔍 Missing from script: ${uniqueMissing.length} TMDB IDs\n`);
if (uniqueMissing.length > 0) {
  console.log('Missing TMDB IDs:');
  console.log(uniqueMissing.sort((a, b) => a - b).join(', '));
}

// Find IDs in script but not in official list
const extra = uniqueScriptIDs.filter(id => !officialIMDbTop250.includes(id));
if (extra.length > 0) {
  console.log(`\n⚠️ Extra IDs in script (not in official list): ${extra.length}`);
  console.log(extra.sort((a, b) => a - b).join(', '));
}

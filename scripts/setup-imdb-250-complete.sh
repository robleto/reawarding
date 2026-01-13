#!/bin/bash
# Complete IMDb Top 250 Setup
# 1. Add 16 missing films to database
# 2. Populate collection with all 250 films
# 3. Enrich metadata for new films
# 4. Mirror poster images

set -e

source .env.local

echo "🎬 IMDb Top 250 Complete Setup"
echo "======================================"
echo ""

# Step 1: Add missing films
echo "📥 Step 1/4: Adding 16 missing films to database..."
echo ""

psql "${DATABASE_URL}" << 'EOF'
-- Add 16 missing films from IMDb Top 250
INSERT INTO movies (tmdb_id, title, release_year) VALUES
  (1163258, '12th Fail', null),
  (103663, 'Jagten', null),
  (7508, 'Taare Zameen Par', null),
  (832, 'M - Eine Stadt sucht einen Mörder', null),
  (60243, 'Jodaeiye Nader az Simin', null),
  (360814, 'Dangal', null),
  (31534, 'Hababam Sinifi: Sinifta Kaldi', null),
  (11659, 'La meglio gioventù', null),
  (1118224, 'Maharaja', null),
  (406, 'La haine', null),
  (378064, 'Koe no katachi', null),
  (13393, 'Babam ve Oglum', null),
  (117691, 'Gangs of Wasseypur', null),
  (352173, 'Drishyam', null),
  (635302, 'Gekijô-ban Kimetsu no Yaiba Mugen Ressha-hen', null),
  (534780, 'Andhadhun', null)
ON CONFLICT (tmdb_id) DO NOTHING;
EOF

echo "✅ Films added"
echo ""

# Step 2: Populate collection
echo "📚 Step 2/4: Populating IMDb Top 250 collection..."
echo ""

psql "${DATABASE_URL}" -f scripts/populate-imdb-250-scraped.sql

echo "✅ Collection populated"
echo ""

# Step 3: Enrich metadata
echo "📝 Step 3/4: Enriching metadata for new films..."
echo ""

./scripts/enrich-new-imdb-films.sh

echo ""

# Step 4: Mirror images
echo "🖼️  Step 4/4: Mirroring poster images..."
echo ""

./scripts/mirror-new-imdb-images.sh

echo ""
echo "======================================"
echo "✅ IMDb Top 250 setup complete!"
echo ""
echo "📊 Final verification:"
psql "${DATABASE_URL}" << 'EOF'
SELECT 
  fc.name,
  fc.slug,
  COUNT(fci.tmdb_id) as film_count
FROM film_collections fc
LEFT JOIN film_collection_items fci ON fci.collection_id = fc.id
WHERE fc.slug = 'imdb-top-250'
GROUP BY fc.id, fc.name, fc.slug;
EOF

echo ""
echo "✅ Done! Your IMDb Top 250 collection is ready."

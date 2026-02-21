#!/bin/bash

# Import IMDb Top 250 via Supabase REST API + Edge Functions
# No psql required - everything via HTTP calls

set -e

source .env.local

echo "🎬 IMDb Top 250 Import via API"
echo "======================================"

# The 16 TMDB IDs we need to add
TMDB_IDS=(1163258 103663 7508 832 60243 360814 31534 11659 1118224 406 378064 13393 117691 352173 635302 534780)

echo ""
echo "📥 Step 1/3: Adding 16 missing films via REST API..."
echo ""

ADDED=0
SKIPPED=0

for TMDB_ID in "${TMDB_IDS[@]}"; do
  echo -n "  Adding TMDB ID $TMDB_ID..."
  
  # Check if already exists
  EXISTING=$(curl -sS "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/movies?select=id&tmdb_id=eq.${TMDB_ID}" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")
  
  if [ "$EXISTING" != "[]" ]; then
    echo " already exists, skipping"
    ((SKIPPED++))
    continue
  fi
  
  # Insert minimal record (will be enriched next)
  RESULT=$(curl -sS -X POST "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/movies" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "{\"tmdb_id\": ${TMDB_ID}, \"title\": \"Movie ${TMDB_ID}\"}")
  
  if echo "$RESULT" | jq -e '.[0].id' > /dev/null 2>&1; then
    echo " ✅ added"
    ((ADDED++))
  else
    echo " ❌ failed: $RESULT"
  fi
  
  sleep 0.2
done

echo ""
echo "✅ Added: $ADDED, Skipped: $SKIPPED"

echo ""
echo "🔄 Step 2/3: Enriching all 16 films via Edge Function..."
echo ""

./scripts/enrich-new-imdb-films.sh

echo ""
echo "🖼️  Step 3/3: Mirroring images for all films..."
echo ""

./scripts/mirror-new-imdb-images.sh

echo ""
echo "✅ Import complete! Now populate the collection manually:"
echo "   Go to Supabase SQL Editor and run: scripts/populate-imdb-250-scraped.sql"
echo ""

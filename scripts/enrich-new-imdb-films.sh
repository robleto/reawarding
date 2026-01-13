#!/bin/bash
# Manually trigger metadata enrichment for new IMDb Top 250 films
# This calls the enrich-movie-details Edge Function for each new film

set -e

source .env.local

# Get the 16 new TMDB IDs we just added
NEW_TMDB_IDS=(1163258 103663 7508 832 60243 360814 31534 11659 1118224 406 378064 13393 117691 352173 635302 534780)

echo "🎬 Enriching ${#NEW_TMDB_IDS[@]} new IMDb Top 250 films"
echo "==============================================="
echo ""

ENRICHED=0
FAILED=0

for TMDB_ID in "${NEW_TMDB_IDS[@]}"; do
  echo "🔍 Finding movie with TMDB ID: $TMDB_ID"
  
  # Get the movie ID from database
  MOVIE_ID=$(curl -sS "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/movies?select=id&tmdb_id=eq.${TMDB_ID}" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    | jq -r '.[0].id // empty')
  
  if [ -z "$MOVIE_ID" ]; then
    echo "❌ Movie not found in database (TMDB: $TMDB_ID)"
    FAILED=$((FAILED + 1))
    continue
  fi
  
  echo "   Movie ID: $MOVIE_ID"
  echo "   Enriching..."
  
  # Call enrich-movie-details Edge Function
  HTTP_CODE=$(curl -sS -w '%{http_code}' -o /tmp/enrich-resp.json -X POST \
    "${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/enrich-movie-details" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    --data "{\"movieId\":\"$MOVIE_ID\"}")
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Enriched successfully"
    ENRICHED=$((ENRICHED + 1))
  else
    echo "   ❌ Failed (HTTP $HTTP_CODE)"
    cat /tmp/enrich-resp.json || true
    FAILED=$((FAILED + 1))
  fi
  
  echo ""
  
  # Rate limit: TMDB allows ~40 requests per 10 seconds
  sleep 1
done

echo "==============================================="
echo "📊 Summary:"
echo "   ✅ Enriched: $ENRICHED"
echo "   ❌ Failed: $FAILED"
echo ""

if [ $ENRICHED -gt 0 ]; then
  echo "✅ Metadata enrichment complete!"
else
  echo "⚠️ No films were enriched. Check errors above."
fi

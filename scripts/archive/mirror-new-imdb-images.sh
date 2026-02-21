#!/bin/bash
# Manually trigger image mirroring for new IMDb Top 250 films
# This calls the mirror-movie-images Edge Function

set -e

source .env.local

echo "🖼️  Mirroring images for new IMDb Top 250 films"
echo "==============================================="
echo ""
echo "Calling mirror-movie-images Edge Function..."
echo ""

HTTP_CODE=$(curl -sS -w '%{http_code}' -o /tmp/mirror-resp.json -X POST \
  "${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/mirror-movie-images" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
  -H "X-CRON-SECRET: ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  --data "{\"limit\":600}")

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "📊 Response:"
  cat /tmp/mirror-resp.json | jq '.' || cat /tmp/mirror-resp.json
  echo ""
  echo "✅ Image mirroring complete!"
else
  echo "❌ Failed (HTTP $HTTP_CODE)"
  cat /tmp/mirror-resp.json || true
  echo ""
  exit 1
fi

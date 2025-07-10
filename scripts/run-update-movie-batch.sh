#!/bin/bash

# Load .env variables if present
set -a
[ -f .env ] && . .env
set +a

# CONFIGURATION
SUPABASE_FUNCTION_URL="https://cjrpnzwrldlxajkvznca.supabase.co/functions/v1/update-movie-batch"
AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqcnBuendybGRseGFqa3Z6bmNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY5MzEzNCwiZXhwIjoyMDY1MjY5MTM0fQ.sMbJ9M8E74Xs-L5dO9JMnP8OBz1pC4SPQ0GYsCUFEUY"
BATCH_SIZE=15  # Slightly larger batch for efficiency, but not too large
REQUEST_DELAY=500  # ms between each movie in the batch (matches your function's delay)

while true; do
  echo "Processing next batch of unenriched movies..."
  RESPONSE=$(curl -s -X POST "$SUPABASE_FUNCTION_URL" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{\"startIndex\": 0, \"batchSize\": $BATCH_SIZE, \"requestDelay\": $REQUEST_DELAY}")

  echo "$RESPONSE"

  # Check if response is valid JSON
  echo "$RESPONSE" | jq . > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    echo "Received invalid JSON or error from API. Stopping."
    break
  fi

  HAS_MORE=$(echo "$RESPONSE" | jq -r '.batchInfo.hasMore // false')
  BATCH_COUNT=$(echo "$RESPONSE" | jq '.results | length')
  # If BATCH_COUNT is empty or not a number, set to 0
  if ! [[ "$BATCH_COUNT" =~ ^[0-9]+$ ]]; then
    BATCH_COUNT=0
  fi
  echo "Batch count: $BATCH_COUNT"

  if [ "$BATCH_COUNT" -eq 0 ]; then
    echo "No more unenriched movies to process."
    break
  fi

  if [ "$HAS_MORE" != "true" ]; then
    echo "All batches processed."
    break
  fi

  sleep 2  # Slightly longer pause between batches for safety
done
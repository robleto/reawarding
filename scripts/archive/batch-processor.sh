#!/bin/bash

# Load .env file and set SUPABASE_TOKEN from NEXT_PUBLIC_SUPABASE_ANON_KEY if not already set
if [ -z "$SUPABASE_TOKEN" ]; then
  # Try to find .env in parent or current directory
  if [ -f ../.env ]; then
    export $(grep NEXT_PUBLIC_SUPABASE_ANON_KEY ../.env | xargs)
    export SUPABASE_TOKEN=$NEXT_PUBLIC_SUPABASE_ANON_KEY
  elif [ -f .env ]; then
    export $(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env | xargs)
    export SUPABASE_TOKEN=$NEXT_PUBLIC_SUPABASE_ANON_KEY
  fi
fi

# Configuration
SUPABASE_URL="https://cjrpnzwrldlxajkvznca.supabase.co"
FUNCTION_URL="$SUPABASE_URL/functions/v1/update-all-movies"
LIMIT=1900  # Number of movies to process in one call (adjust as needed)
REQUEST_DELAY=300  # Delay between API calls in ms (handled by function)

echo "Calling update-all-movies function..."

response=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -d "{\"limit\": $LIMIT, \"requestDelay\": $REQUEST_DELAY}")

if [ $? -ne 0 ]; then
  echo "Error: Failed to call Edge Function"
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo "Error: jq is not installed. Please install it to parse JSON responses."
  echo "Visit: https://stedolan.github.io/jq/download/"
  exit 1
fi

success=$(echo "$response" | jq -r '.success')
message=$(echo "$response" | jq -r '.message')

if [ "$success" != "true" ]; then
  echo "Error in processing: $message"
  exit 1
fi

echo "Processing complete: $message"
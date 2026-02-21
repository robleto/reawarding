#!/bin/bash
# Batch enrichment script - safely enrich movies in chunks

set -e

# Load environment variables
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local not found"
    exit 1
fi

export $(cat .env.local | grep -v '^#' | xargs)

# Configuration
BATCH_SIZE=${1:-50}  # Default to 50 movies per batch
MAX_BATCHES=${2:-10} # Default to max 10 batches (500 movies total)

echo "🚀 Starting batch enrichment"
echo "   Batch size: $BATCH_SIZE movies"
echo "   Max batches: $MAX_BATCHES"
echo ""

# Check current status
echo "📊 Checking database status..."
python3 << EOF
from supabase import create_client
import os

supabase = create_client(os.environ['NEXT_PUBLIC_SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])

total = supabase.table('movies').select('id', count='exact').execute()
enriched = supabase.table('movies').select('id', count='exact').not_.is_('media_enriched_at', 'null').execute()
with_tmdb = supabase.table('movies').select('id', count='exact').not_.is_('tmdb_id', 'null').execute()

print(f"Total movies: {total.count}")
print(f"Already enriched: {enriched.count}")
print(f"Movies with TMDB IDs: {with_tmdb.count}")
print(f"Remaining to enrich: {total.count - enriched.count}")
print("")

if total.count - enriched.count == 0:
    print("✅ All movies already enriched!")
    exit(0)
EOF

if [ $? -eq 0 ]; then
    echo "✅ All movies already enriched!"
    exit 0
fi

echo ""
echo "⏸️  Press Ctrl+C now if you want to stop, or any key to continue..."
read -n 1 -s

# Run enrichment in batches
for i in $(seq 1 $MAX_BATCHES); do
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Batch $i of $MAX_BATCHES"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    export LIMIT=$BATCH_SIZE
    export ENRICH_MEDIA=true
    
    python3 scripts/enrich_movies_enhanced.py
    
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -ne 0 ]; then
        echo "❌ Batch $i failed with exit code $EXIT_CODE"
        echo "   Check logs above for errors"
        exit $EXIT_CODE
    fi
    
    # Check if there are more movies to enrich
    MORE_MOVIES=$(python3 << EOF
from supabase import create_client
import os

supabase = create_client(os.environ['NEXT_PUBLIC_SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])
result = supabase.table('movies').select('id', count='exact').is_('media_enriched_at', 'null').not_.is_('tmdb_id', 'null').execute()
print(result.count)
EOF
)
    
    echo ""
    echo "📊 Status: $MORE_MOVIES movies remaining"
    
    if [ "$MORE_MOVIES" = "0" ]; then
        echo ""
        echo "🎉 All movies enriched!"
        break
    fi
    
    # Rate limiting pause between batches
    if [ $i -lt $MAX_BATCHES ]; then
        echo ""
        echo "⏳ Pausing 5 seconds before next batch..."
        sleep 5
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Batch enrichment complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Final status
python3 << EOF
from supabase import create_client
import os

supabase = create_client(os.environ['NEXT_PUBLIC_SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])

total = supabase.table('movies').select('id', count='exact').execute()
enriched = supabase.table('movies').select('id', count='exact').not_.is_('media_enriched_at', 'null').execute()

print(f"")
print(f"📊 Final Status:")
print(f"   Total movies: {total.count}")
print(f"   Enriched: {enriched.count}")
print(f"   Remaining: {total.count - enriched.count}")
EOF

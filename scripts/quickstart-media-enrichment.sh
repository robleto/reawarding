#!/bin/bash
# Quick start script for TMDB media enrichment

echo "🎬 TMDB Media Enrichment - Quick Start"
echo "======================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local not found"
    echo "Please create .env.local with your API keys"
    exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

echo "Step 1: Apply database migration"
echo "---------------------------------"
echo "Choose migration method:"
echo "1) Run migration via Supabase CLI (requires Docker)"
echo "2) Apply migration manually via Supabase Dashboard SQL Editor"
echo "3) Skip migration (already applied)"
read -p "Enter choice (1-3): " migration_choice

if [ "$migration_choice" = "1" ]; then
    echo "Running: supabase db reset"
    supabase db reset
elif [ "$migration_choice" = "2" ]; then
    echo ""
    echo "📋 Manual Migration Steps:"
    echo "1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new"
    echo "2. Copy content from: supabase/migrations/20251113000000_add_tmdb_media_enrichment.sql"
    echo "3. Paste and run in SQL Editor"
    echo ""
    read -p "Press Enter when migration is complete..."
fi

echo ""
echo "Step 2: Enrich movies with media data"
echo "--------------------------------------"
read -p "How many movies to enrich? (default: 50): " limit
limit=${limit:-50}

export LIMIT=$limit
export ENRICH_MEDIA=true
export REQUEST_DELAY=0.3

echo ""
echo "🚀 Starting enrichment of $limit movies..."
echo ""

python3 scripts/enrich_movies_enhanced.py

echo ""
echo "✅ Done! Check your film pages to see the new media data."
echo ""
echo "Next steps:"
echo "- View enriched movies at /films/[movie-slug]/[movie-id]"
echo "- Videos, images, and streaming data will appear when available"
echo "- Run again with higher LIMIT to enrich more movies"

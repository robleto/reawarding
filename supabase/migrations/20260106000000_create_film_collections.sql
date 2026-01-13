-- Film Collections: Database-backed collections similar to user lists
-- This allows collections to be updated without code deployments

-- Main collections table (metadata)
CREATE TABLE IF NOT EXISTS film_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  icon text, -- Lucide icon name
  color text, -- Tailwind color class
  category text NOT NULL, -- 'awards', 'lists', 'franchises', 'actors', 'directors', 'studios'
  featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Collection items (which movies are in each collection)
CREATE TABLE IF NOT EXISTS film_collection_items (
  collection_id uuid REFERENCES film_collections(id) ON DELETE CASCADE,
  tmdb_id integer NOT NULL,
  added_at timestamptz DEFAULT now(),
  PRIMARY KEY (collection_id, tmdb_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_film_collections_category ON film_collections(category);
CREATE INDEX IF NOT EXISTS idx_film_collections_featured ON film_collections(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_film_collection_items_collection ON film_collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_film_collection_items_tmdb_id ON film_collection_items(tmdb_id);

-- RLS Policies (collections are public, read-only for users)
ALTER TABLE film_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE film_collection_items ENABLE ROW LEVEL SECURITY;

-- Everyone can read collections
CREATE POLICY "Collections are publicly readable"
  ON film_collections FOR SELECT
  USING (true);

CREATE POLICY "Collection items are publicly readable"
  ON film_collection_items FOR SELECT
  USING (true);

-- Only service role can modify (via scripts/admin tools)
-- No INSERT/UPDATE/DELETE policies for regular users

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_film_collection_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_film_collections_updated_at
  BEFORE UPDATE ON film_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_film_collection_updated_at();

-- Helper view to get collection counts
CREATE OR REPLACE VIEW film_collections_with_counts AS
SELECT 
  fc.*,
  COUNT(fci.tmdb_id) as movie_count
FROM film_collections fc
LEFT JOIN film_collection_items fci ON fc.id = fci.collection_id
GROUP BY fc.id;

COMMENT ON TABLE film_collections IS 'Curated film collections (preset lists like MCU, Spielberg films, etc.)';
COMMENT ON TABLE film_collection_items IS 'Movies that belong to each collection';
COMMENT ON VIEW film_collections_with_counts IS 'Collections with movie counts for UI display';

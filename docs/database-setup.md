# Database Setup for Movie Lists Feature

## Required Tables

Run these SQL commands in your Supabase SQL editor to create the necessary tables:

### 1. Movie Lists Table

```sql
-- Create movie_lists table
CREATE TABLE IF NOT EXISTS movie_lists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS movie_lists_user_id_idx ON movie_lists(user_id);
CREATE INDEX IF NOT EXISTS movie_lists_is_public_idx ON movie_lists(is_public);

-- Enable RLS (Row Level Security)
ALTER TABLE movie_lists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for movie_lists
CREATE POLICY "Users can view their own lists and public lists" ON movie_lists
    FOR SELECT USING (
        user_id = auth.uid() OR is_public = TRUE
    );

CREATE POLICY "Users can create their own lists" ON movie_lists
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own lists" ON movie_lists
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own lists" ON movie_lists
    FOR DELETE USING (user_id = auth.uid());
```

### 2. Movie List Items Table

```sql
-- Create movie_list_items table
CREATE TABLE IF NOT EXISTS movie_list_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    list_id UUID NOT NULL REFERENCES movie_lists(id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    ranking INTEGER DEFAULT 0,
    seen_it BOOLEAN DEFAULT FALSE,
    score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS movie_list_items_list_id_idx ON movie_list_items(list_id);
CREATE INDEX IF NOT EXISTS movie_list_items_movie_id_idx ON movie_list_items(movie_id);

-- Ensure unique movie per list
CREATE UNIQUE INDEX IF NOT EXISTS movie_list_items_list_movie_unique 
    ON movie_list_items(list_id, movie_id);

-- Enable RLS (Row Level Security)
ALTER TABLE movie_list_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for movie_list_items
CREATE POLICY "Users can view items from their own lists and public lists" ON movie_list_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM movie_lists 
            WHERE movie_lists.id = movie_list_items.list_id 
            AND (movie_lists.user_id = auth.uid() OR movie_lists.is_public = TRUE)
        )
    );

CREATE POLICY "Users can create items in their own lists" ON movie_list_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM movie_lists 
            WHERE movie_lists.id = movie_list_items.list_id 
            AND movie_lists.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update items in their own lists" ON movie_list_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM movie_lists 
            WHERE movie_lists.id = movie_list_items.list_id 
            AND movie_lists.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete items from their own lists" ON movie_list_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM movie_lists 
            WHERE movie_lists.id = movie_list_items.list_id 
            AND movie_lists.user_id = auth.uid()
        )
    );
```

### 3. Update Triggers (Optional but Recommended)

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic updated_at updates
CREATE TRIGGER update_movie_lists_updated_at 
    BEFORE UPDATE ON movie_lists 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_movie_list_items_updated_at 
    BEFORE UPDATE ON movie_list_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4. Sample Data (Optional)

```sql
-- Insert some sample lists for testing (replace with actual user_id)
INSERT INTO movie_lists (user_id, name, description, is_public) VALUES
('your-user-id-here', 'My Watchlist', 'Movies I want to watch', false),
('your-user-id-here', 'Top 10 of 2023', 'My favorite movies from 2023', true),
('your-user-id-here', 'Best Picture Winners', 'Collection of Best Picture Oscar winners', true);
```

## Notes

1. **Authentication**: Make sure your Supabase project has authentication enabled and users can sign in.

2. **Movies Table**: The code assumes you already have a `movies` table with the fields specified in the types.

3. **Rankings Table**: If you don't have a `rankings` table yet, you can create it using similar patterns as above.

4. **RLS Policies**: The Row Level Security policies ensure that:
   - Users can only see their own private lists
   - Anyone can see public lists
   - Users can only modify their own lists and list items

5. **Indexes**: The indexes are created to optimize query performance for common operations.

## Testing

After running these SQL commands, you should be able to:
1. Navigate to `/lists` to see the lists page
2. Create lists (you'll need to add the create functionality)
3. View individual lists at `/lists/[listId]`
4. Add movies to lists (you'll need to add this functionality)

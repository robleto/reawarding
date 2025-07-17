-- Base schema for the Reawarding application

-- Create movies table
CREATE TABLE IF NOT EXISTS movies (
    id SERIAL PRIMARY KEY,
    tmdb_id INTEGER UNIQUE,
    imdb_id VARCHAR(20),
    title TEXT NOT NULL,
    overview TEXT,
    release_year INTEGER,
    runtime INTEGER,
    poster_url TEXT,
    thumb_url TEXT,
    mpaa_rating VARCHAR(10),
    imdb_rating DECIMAL(3,1),
    metacritic_score INTEGER,
    tmdb_rating DECIMAL(3,1),
    genres TEXT[],
    director TEXT,
    cast_list TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes on movies table
CREATE INDEX IF NOT EXISTS movies_tmdb_id_idx ON movies(tmdb_id);
CREATE INDEX IF NOT EXISTS movies_title_idx ON movies(title);
CREATE INDEX IF NOT EXISTS movies_release_year_idx ON movies(release_year);

-- Create rankings table
CREATE TABLE IF NOT EXISTS rankings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    seen_it BOOLEAN DEFAULT FALSE,
    ranking INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes on rankings table
CREATE INDEX IF NOT EXISTS rankings_user_id_idx ON rankings(user_id);
CREATE INDEX IF NOT EXISTS rankings_movie_id_idx ON rankings(movie_id);
CREATE UNIQUE INDEX IF NOT EXISTS rankings_user_movie_unique ON rankings(user_id, movie_id);

-- Enable RLS for rankings
ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;

-- RLS policies for rankings
CREATE POLICY "Users can view their own rankings" ON rankings
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own rankings" ON rankings
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own rankings" ON rankings
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own rankings" ON rankings
    FOR DELETE USING (user_id = auth.uid());

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

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
CREATE POLICY "Users can view items in their own lists and public lists" ON movie_list_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM movie_lists ml 
            WHERE ml.id = list_id 
            AND (ml.user_id = auth.uid() OR ml.is_public = TRUE)
        )
    );

CREATE POLICY "Users can create items in their own lists" ON movie_list_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM movie_lists ml 
            WHERE ml.id = list_id 
            AND ml.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update items in their own lists" ON movie_list_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM movie_lists ml 
            WHERE ml.id = list_id 
            AND ml.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete items in their own lists" ON movie_list_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM movie_lists ml 
            WHERE ml.id = list_id 
            AND ml.user_id = auth.uid()
        )
    );

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic updated_at updates
CREATE TRIGGER update_movies_updated_at 
    BEFORE UPDATE ON movies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rankings_updated_at 
    BEFORE UPDATE ON rankings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_movie_lists_updated_at 
    BEFORE UPDATE ON movie_lists 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_movie_list_items_updated_at 
    BEFORE UPDATE ON movie_list_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample movies for testing
INSERT INTO movies (id, tmdb_id, title, release_year, poster_url, thumb_url, runtime)
VALUES 
    (1, 550, 'Fight Club', 1999, 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', 'https://image.tmdb.org/t/p/w200/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', 139),
    (2, 13, 'Forrest Gump', 1994, 'https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg', 'https://image.tmdb.org/t/p/w200/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg', 142),
    (3, 157336, 'Interstellar', 2014, 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', 'https://image.tmdb.org/t/p/w200/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', 169)
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for movies table
SELECT setval('movies_id_seq', (SELECT MAX(id) FROM movies));

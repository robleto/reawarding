-- Create award_nominations table
CREATE TABLE IF NOT EXISTS award_nominations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    year TEXT NOT NULL,
    nominee_ids INTEGER[] NOT NULL DEFAULT '{}',
    winner_id INTEGER NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, year)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_award_nominations_user_id ON award_nominations(user_id);
CREATE INDEX IF NOT EXISTS idx_award_nominations_year ON award_nominations(year);
CREATE INDEX IF NOT EXISTS idx_award_nominations_user_year ON award_nominations(user_id, year);

-- Enable RLS (Row Level Security)
ALTER TABLE award_nominations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own award nominations" ON award_nominations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own award nominations" ON award_nominations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own award nominations" ON award_nominations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own award nominations" ON award_nominations
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_award_nominations_updated_at
    BEFORE UPDATE ON award_nominations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

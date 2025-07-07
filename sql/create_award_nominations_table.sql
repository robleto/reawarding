-- Create award_nominations table
CREATE TABLE IF NOT EXISTS public.award_nominations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    year TEXT NOT NULL,
    nominee_ids INTEGER[] NOT NULL,
    winner_id INTEGER NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Create unique constraint on user_id and year combination
    CONSTRAINT award_nominations_user_year_unique UNIQUE (user_id, year),
    
    -- Add foreign key constraint to auth.users table
    CONSTRAINT award_nominations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS award_nominations_user_id_idx ON public.award_nominations(user_id);
CREATE INDEX IF NOT EXISTS award_nominations_year_idx ON public.award_nominations(year);

-- Enable Row Level Security (RLS)
ALTER TABLE public.award_nominations ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access their own nominations
CREATE POLICY "Users can view their own nominations" ON public.award_nominations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own nominations" ON public.award_nominations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nominations" ON public.award_nominations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nominations" ON public.award_nominations
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER award_nominations_updated_at
    BEFORE UPDATE ON public.award_nominations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

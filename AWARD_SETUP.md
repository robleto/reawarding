# Database Setup for Award Nominations

## Quick Setup Instructions

1. **Run the Database Migration**:
   
   Connect to your Supabase project and run the migration script:
   
   ```sql
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
   ```

2. **Verify the Setup**:
   
   Check that the table was created successfully:
   ```sql
   SELECT * FROM award_nominations LIMIT 1;
   ```

3. **Test the Feature**:
   
   - Navigate to `/awards` in your app
   - Log in with a user account
   - Click "Edit" on any year section
   - Try adding/removing nominees and setting winners

## Database Schema Details

### award_nominations Table Structure

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| year | TEXT | Year (e.g., "2023") |
| nominee_ids | INTEGER[] | Array of movie IDs |
| winner_id | INTEGER | Movie ID of winner (nullable) |
| created_at | TIMESTAMP | Auto-generated |
| updated_at | TIMESTAMP | Auto-updated |

### Security Features

- **Row Level Security**: Users can only access their own nominations
- **Unique Constraint**: One nomination record per user per year
- **Cascade Delete**: Nominations deleted when user is deleted
- **Proper Indexing**: Optimized for common queries

## API Endpoints

### GET /api/awards?year=2023
Returns existing nominations for the specified year.

### POST /api/awards
Saves nominations. Request body:
```json
{
  "year": "2023",
  "nominee_ids": [1, 2, 3, 4, 5],
  "winner_id": 1
}
```

## Troubleshooting

### Common Issues

1. **"relation does not exist" error**:
   - Make sure you ran the migration script
   - Check you're connected to the right database

2. **"permission denied" error**:
   - Verify RLS policies are created
   - Check user authentication

3. **"nominee_ids must be an array" error**:
   - Ensure PostgreSQL supports array types
   - Check data types in API calls

### Verification Steps

1. Check table exists:
   ```sql
   \d award_nominations
   ```

2. Check RLS policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'award_nominations';
   ```

3. Test basic operations:
   ```sql
   INSERT INTO award_nominations (user_id, year, nominee_ids) 
   VALUES ('00000000-0000-0000-0000-000000000000', '2023', ARRAY[1,2,3]);
   ```

## Next Steps

Once the database is set up, the award editing feature will be fully functional. Users can:

- Edit their Best Picture selections for each year
- Drag and drop to reorder nominees
- Set winners from their nominees
- Save changes that persist across sessions

The feature is designed to be intuitive and provides immediate visual feedback for all operations.

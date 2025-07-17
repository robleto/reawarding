-- Create a function to update list item rankings in a single transaction
-- This avoids constraint violations when reordering items by using a temporary approach

CREATE OR REPLACE FUNCTION update_list_item_rankings(updates JSONB)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    update_record JSONB;
    temp_offset CONSTANT INTEGER := 1000000;
BEGIN
    -- First pass: Add a large offset to all rankings to avoid conflicts
    FOR update_record IN SELECT * FROM jsonb_array_elements(updates)
    LOOP
        UPDATE movie_list_items 
        SET ranking = (update_record->>'ranking')::integer + temp_offset
        WHERE id = (update_record->>'id')::uuid;
    END LOOP;
    
    -- Second pass: Set the final rankings
    FOR update_record IN SELECT * FROM jsonb_array_elements(updates)
    LOOP
        UPDATE movie_list_items 
        SET ranking = (update_record->>'ranking')::integer
        WHERE id = (update_record->>'id')::uuid;
    END LOOP;
END;
$$;

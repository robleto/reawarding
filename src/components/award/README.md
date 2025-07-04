# Award Editing Feature Documentation

## Overview

The award editing feature allows users to select and manage their Best Picture nominees and winners for each year. This provides an inline editing experience directly within the awards page.

## Components

### 1. EditableYearSection
**Location**: `src/components/award/EditableYearSection.tsx`

Main component that handles the year-by-year award management.

**Features**:
- Read-only and edit modes
- Edit/Save/Cancel controls
- Error handling and validation
- Integration with Supabase API

**Props**:
```typescript
interface EditableYearSectionProps {
  year: string;
  movies: Movie[];
  winner?: Movie | null;
  allMoviesForYear: Movie[]; // All movies for this year that user has ranked
}
```

### 2. DraggableNomineeCard
**Location**: `src/components/award/DraggableNomineeCard.tsx`

Represents a nominee in edit mode with drag-and-drop functionality.

**Features**:
- Drag-and-drop reordering using @dnd-kit
- Set/unset winner functionality
- Remove nominee functionality
- Visual indicators for winner status
- Image fallback support

### 3. SelectableMovieItem
**Location**: `src/components/award/SelectableMovieItem.tsx`

Represents available movies that can be added as nominees.

**Features**:
- Add to nominees functionality
- Disabled state when max nominees reached
- Rating display
- Image fallback support

## API Routes

### GET /api/awards
Retrieves existing award nominations for a user and year.

**Query Parameters**:
- `year`: The year to fetch nominations for

**Response**:
```json
{
  "nominations": {
    "nominee_ids": [1, 2, 3],
    "winner_id": 1
  } | null
}
```

### POST /api/awards
Saves award nominations for a user and year.

**Request Body**:
```json
{
  "year": "2023",
  "nominee_ids": [1, 2, 3, 4, 5],
  "winner_id": 1
}
```

**Validation**:
- Maximum 10 nominees allowed
- Winner must be among nominees
- User must be authenticated

## Database Schema

### award_nominations Table
```sql
CREATE TABLE award_nominations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    year TEXT NOT NULL,
    nominee_ids INTEGER[] NOT NULL DEFAULT '{}',
    winner_id INTEGER NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, year)
);
```

**Key Features**:
- Row Level Security (RLS) enabled
- Unique constraint on user_id + year
- Array field for nominee IDs
- Separate winner_id field
- Automatic timestamps

## User Experience Flow

### Read Mode
1. User views awards page
2. Each year shows current winner and nominees
3. "Edit" button available for authenticated users

### Edit Mode
1. User clicks "Edit" button
2. System loads existing nominations or uses current display as default
3. User can:
   - Drag and drop nominees to reorder
   - Remove nominees
   - Add new nominees from available movies
   - Set/unset winner
4. Save button commits changes
5. Cancel button discards changes

### Validation & Error Handling
- Maximum 10 nominees enforced
- Winner must be among nominees
- Network error handling
- Loading states during operations

## Technical Implementation

### State Management
- Local React state for edit mode
- Optimistic updates for better UX
- Error state management

### Drag and Drop
- Uses @dnd-kit/core for drag functionality
- Vertical list sorting strategy
- Visual feedback during drag operations

### Data Persistence
- Upsert operations for nominations
- Atomic updates to prevent data loss
- Proper error handling and rollback

### Image Fallbacks
- Consistent fallback UI for missing images
- Graceful handling of broken image URLs
- Maintains layout integrity

## Installation Requirements

1. **Database Migration**:
   ```bash
   # Run the migration script
   psql -h your-supabase-url -d postgres -f migrations/001_create_award_nominations.sql
   ```

2. **Dependencies**:
   The following packages are required:
   - `@dnd-kit/core`
   - `@dnd-kit/sortable`
   - `@dnd-kit/utilities`
   - `@supabase/auth-helpers-nextjs`
   - `@supabase/auth-helpers-react`
   - `lucide-react`

3. **Environment Variables**:
   Ensure your Supabase credentials are configured in `.env.local`

## Usage Example

```tsx
// In awards page
import EditableYearSection from '@/components/award/EditableYearSection';

// Render for each year
<EditableYearSection
  year="2023"
  winner={yearData.winner}
  movies={yearData.nominees}
  allMoviesForYear={yearData.allMovies}
/>
```

## Security Considerations

- RLS policies ensure users can only access their own nominations
- Input validation on both client and server
- Proper authentication checks
- CSRF protection via Next.js API routes

## Performance Optimizations

- Lazy loading of nomination data
- Efficient drag operations
- Optimistic updates
- Proper indexing on database

## Future Enhancements

- Bulk operations for multiple years
- Import/export functionality
- Social sharing of nominations
- Historical nomination tracking
- Analytics and insights

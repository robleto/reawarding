# Best Picture Nominees Component

A comprehensive React component for selecting and managing Best Picture nominees from user-rated movies.

## Features

### 🎯 **Smart Selection**
- Automatically selects top 10 movies if ≤10 movies are rated 7+
- Shows manual selection interface if >10 movies are rated 7+
- Highlights highly rated movies (7+) for easy identification

### 📊 **Movie Management**
- **Maximum Limit**: Prevents selecting more than 10 nominees
- **Visual Counter**: Shows current selection count (X/10)
- **Rating Display**: Shows individual movie ratings with star icons
- **Movie Details**: Displays title, year, poster, and rating

### 🎨 **Drag & Drop Reordering**
- Full drag-and-drop functionality using @dnd-kit
- Visual feedback during dragging
- Numbered ranking badges (1-10)
- Smooth animations and transitions

### 📱 **Responsive Design**
- Mobile-friendly interface
- Grid layout for available movies
- Scrollable lists for large movie collections
- Touch-friendly drag handles

### 🎭 **User Experience**
- **Empty State**: Helpful message when no rated movies exist
- **Loading States**: Smooth loading experience
- **Visual Feedback**: Hover effects and state indicators
- **Accessibility**: Keyboard navigation support

## Usage

```tsx
import BestPictureNominees from '@/components/nominees/BestPictureNominees';

function MyPage() {
  const handleNomineesChange = (nominees: Movie[]) => {
    console.log('Selected nominees:', nominees);
  };

  return (
    <BestPictureNominees
      movies={userRatedMovies}
      onNomineesChange={handleNomineesChange}
      className="my-custom-class"
    />
  );
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `movies` | `Movie[]` | Array of movies with user rankings |
| `onNomineesChange?` | `(nominees: Movie[]) => void` | Callback when nominees selection changes |
| `className?` | `string` | Additional CSS classes |

## Component Structure

### Main Component (`BestPictureNominees`)
- Manages state for selected and available movies
- Handles drag-and-drop logic
- Provides selection interface

### Sortable Item (`SortableMovieItem`)
- Individual draggable movie item
- Shows movie details and ranking
- Provides remove functionality

## Dependencies

- `@dnd-kit/core` - Drag and drop functionality
- `@dnd-kit/sortable` - Sortable list implementation
- `@dnd-kit/utilities` - Utility functions
- `lucide-react` - Icons
- `next/image` - Optimized images

## Key Features Breakdown

### 1. Intelligent Auto-Selection
```typescript
// Auto-selects top movies if ≤10 highly rated
const highlyRated = rankedMovies.filter(movie => 
  (movie.rankings?.[0]?.ranking || 0) >= 7
);

if (highlyRated.length <= 10) {
  setSelectedMovies(highlyRated);
} else {
  setShowSelection(true); // Show manual selection
}
```

### 2. Drag & Drop Implementation
```typescript
const handleDragEnd = (event) => {
  const { active, over } = event;
  if (active.id !== over.id) {
    setSelectedMovies((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }
};
```

### 3. Selection Management
```typescript
const handleAddMovie = (movie: Movie) => {
  if (selectedMovies.length < 10) {
    setSelectedMovies(prev => [...prev, movie]);
    setAvailableMovies(prev => prev.filter(m => m.id !== movie.id));
  }
};
```

## Integration

The component integrates seamlessly with:
- **Guest Mode**: Works with localStorage-based rankings
- **User Mode**: Works with Supabase-stored rankings
- **Navigation**: Added to main navigation as "Nominees"
- **Responsive Design**: Mobile-friendly interface

## Future Enhancements

- Save nominees to database
- Share nominees lists
- Compare with friends' nominees
- Historical nominees tracking
- Export/import functionality

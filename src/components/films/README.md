# Films Components

Components for displaying enriched movie media content from TMDB.

## Components

### VideoPlayer
**File**: `VideoPlayer.tsx`  
**Type**: Client Component  

Displays TMDB video content (trailers, clips, teasers) with YouTube embed functionality.

**Props**:
```typescript
{
  videos: TMDBVideo[];      // Array of video objects from TMDB
  className?: string;       // Optional wrapper class
}
```

**Features**:
- Filters for YouTube videos only
- Prioritizes trailers over clips/teasers
- Displays up to 5 videos in responsive grid
- YouTube thumbnail preview with play button overlay
- Modal with embedded YouTube player (autoplay enabled)
- Click-to-close or ESC key to dismiss modal

**Usage**:
```tsx
import VideoPlayer from "@/components/films/VideoPlayer";

<VideoPlayer videos={movie.videos} />
```

---

### BackdropGallery
**File**: `BackdropGallery.tsx`  
**Type**: Client Component  

Displays movie backdrop images from TMDB with lightbox functionality.

**Props**:
```typescript
{
  images: TMDBImage[];      // Array of image objects (backdrops)
  className?: string;       // Optional wrapper class
}
```

**Features**:
- Displays up to 6 images in responsive grid
- Shows count of remaining images if more than 6
- Lightbox modal with full-size image viewing
- Previous/Next navigation with keyboard support
- Image counter (X / Total)
- Smooth transitions and hover effects
- Uses TMDB CDN: w780 for thumbnails, original for lightbox

**Usage**:
```tsx
import BackdropGallery from "@/components/films/BackdropGallery";

<BackdropGallery images={movie.images?.backdrops || []} />
```

---

### KeywordTags
**File**: `KeywordTags.tsx`  
**Type**: Client Component  

Displays thematic keyword tags from TMDB.

**Props**:
```typescript
{
  keywords: string[];       // Array of keyword strings
  className?: string;       // Optional wrapper class
  maxDisplay?: number;      // Max keywords to show (default: 15)
}
```

**Features**:
- Displays keywords as pill-style tags
- Shows up to `maxDisplay` keywords (default: 15)
- Displays count of remaining keywords if exceeds max
- Responsive flex layout with wrapping
- Hover effects on tags

**Usage**:
```tsx
import KeywordTags from "@/components/films/KeywordTags";

<KeywordTags keywords={movie.keywords || []} maxDisplay={20} />
```

---

### FilmActions
**File**: `FilmActions.tsx`  
**Type**: Client Component  

User interaction controls for marking movies as seen and setting rankings.

**Props**:
```typescript
{
  movieId: number;          // Movie ID for ranking operations
}
```

**Features**:
- Guest mode support via localStorage
- Authenticated mode via Supabase direct queries
- "Seen It" toggle button
- Ranking dropdown (1-10 or null)
- Real-time state updates
- Loading states during operations

**Usage**:
```tsx
import FilmActions from "@/components/films/FilmActions";

<FilmActions movieId={movie.id} />
```

---

## Data Types

### TMDBVideo
```typescript
{
  key: string;              // YouTube video ID
  name: string;             // Video title
  type: string;             // 'Trailer' | 'Teaser' | 'Clip' | 'Featurette' | etc.
  site: string;             // 'YouTube'
  official: boolean;        // Official content flag
  size?: number;            // Video resolution (1080, 720, 480, 360)
}
```

### TMDBImage
```typescript
{
  file_path: string;        // TMDB image path (e.g., "/abc123.jpg")
  aspect_ratio?: number;    // Image aspect ratio
  height?: number;          // Image height in pixels
  width?: number;           // Image width in pixels
  vote_average?: number;    // User rating of image
}
```

---

## Integration Example

Full example from film detail page:

```tsx
import VideoPlayer from "@/components/films/VideoPlayer";
import BackdropGallery from "@/components/films/BackdropGallery";
import KeywordTags from "@/components/films/KeywordTags";
import FilmActions from "@/components/films/FilmActions";

export default async function MovieDetailPage({ params }) {
  const { data: movie } = await supabaseAdmin
    .from("movies")
    .select("*")
    .eq("id", params.id)
    .single();

  return (
    <div>
      {/* Action Controls */}
      <FilmActions movieId={movie.id} />
      
      {/* Videos Section - Only shows if data exists */}
      {movie.videos && movie.videos.length > 0 && (
        <section>
          <h3>Trailers & Videos ({movie.videos.length})</h3>
          <VideoPlayer videos={movie.videos} />
        </section>
      )}

      {/* Backdrops Gallery - Only shows if data exists */}
      {movie.images?.backdrops && movie.images.backdrops.length > 0 && (
        <section>
          <h3>Backdrops & Images ({movie.images.backdrops.length})</h3>
          <BackdropGallery images={movie.images.backdrops} />
        </section>
      )}

      {/* Keywords - Only shows if data exists */}
      {movie.keywords && movie.keywords.length > 0 && (
        <section>
          <KeywordTags keywords={movie.keywords} maxDisplay={15} />
        </section>
      )}
    </div>
  );
}
```

---

## Conditional Rendering Best Practices

Always check for data existence before rendering media components:

✅ **Good**:
```tsx
{movie.videos && movie.videos.length > 0 && (
  <VideoPlayer videos={movie.videos} />
)}
```

❌ **Bad**:
```tsx
<VideoPlayer videos={movie.videos} />  // Could be undefined/null
```

Components handle empty arrays gracefully, but checking prevents unnecessary DOM rendering.

---

## Performance Considerations

### VideoPlayer
- Loads YouTube thumbnails on-demand (CDN optimized)
- Modal only renders when video selected
- Autoplay only on user interaction

### BackdropGallery
- Uses Next.js Image component with optimization
- Lightbox images load on-demand (not preloaded)
- Limits initial grid to 6 images for performance

### KeywordTags
- Pure CSS styling (no images)
- Minimal DOM impact
- Responsive without media queries (flex wrap)

---

## Accessibility

All components include:
- Keyboard navigation (ESC to close modals)
- Semantic HTML elements
- ARIA labels where appropriate
- Focus management in modals
- High contrast hover states

---

## Future Enhancements

Potential improvements:
- [ ] VideoPlayer: Add playlist mode (auto-advance through videos)
- [ ] BackdropGallery: Lazy load images beyond initial 6
- [ ] BackdropGallery: Swipe gestures for mobile navigation
- [ ] KeywordTags: Make clickable to filter movies by keyword
- [ ] All: Add loading skeletons for better perceived performance

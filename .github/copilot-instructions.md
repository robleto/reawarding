# ReAwarding - AI Coding Agent Instructions

## Project Overview
Next.js 15 (App Router) movie ranking app with Supabase backend. Users rank movies, create custom lists, and track Oscar-worthy films. Supports **guest mode** with localStorage-based state management before authentication.

## Critical Architecture Patterns

### Supabase Client Patterns
**Three distinct client instances** - never mix them:
- **Server Components**: `createServerClient` with cookies from `next/headers` (see `src/app/layout.tsx`)
- **Client Components**: Import `supabase` from `src/lib/supabaseBrowser.ts` 
- **Admin/Privileged**: Import `supabaseAdmin` from `src/lib/supabaseAdmin.ts` (service role key)

### Guest Mode System
**Critical**: All movie features must work for unauthenticated users.
- Guest rankings stored in Zustand with localStorage persistence (`src/hooks/useGuestRankingStore.ts`)
- `useMovieDataWithGuest()` hook in `src/utils/sharedMovieUtils.ts` handles both auth states
- On signup/login, guest data auto-migrates to user's database records
- Check `isGuest` flag before calling database mutation operations

### Server vs Client Components
- **Default to Server Components** for static content and data fetching
- Mark **Client only when**: user interaction, hooks, state, browser APIs, or Supabase auth context needed
- Common client needs: `useUser()`, `useSupabaseClient()`, `useState`, `useEffect`
- File structure convention: Server components have NO `"use client"` directive at top

### Type Safety
- Database types auto-generated in `src/types/supabase.ts` (don't manually edit)
- Application types in `src/types/types.ts` (e.g., `Movie` type includes `rankings` array)
- Generic typing: `useSupabaseClient<Database>()` for type inference

## Database Schema Essentials

**Core tables** (see `supabase/migrations/20250715000000_create_base_schema.sql`):
- `movies`: Core movie data (TMDB enriched: genres, ratings, cast, runtime)
- `rankings`: User movie ratings (unique constraint: `user_id, movie_id`)
- `profiles`: User profiles (auto-created via trigger on auth.users)
- `movie_lists`, `movie_list_items`: Custom user lists with drag-drop ordering

**RLS enabled** on all user tables. Policies enforce `user_id = auth.uid()` for mutations.

## Key Development Workflows

### Running the App
```bash
npm run dev          # Standard dev server
npm run dev:turbo    # Faster with Turbo (experimental)
npm run build        # Production build
```

### Working with Supabase Edge Functions
- Functions in `supabase/functions/*` use Deno runtime
- Deploy: `supabase functions deploy <function-name>`
- Scheduled via pg_cron (see `docs/ops-cron-and-edge-functions.md`)
- Auth via `CRON_SECRET` from Vault for automated jobs
- Fresh content ingestion pipeline (movies only):
  - `tmdb-now-playing`: Theatrical now playing pages (paginate with `?pages=`)
  - `tmdb-popular-movies`: Popular movies list (captures broad catalog; logs to `imports`)
  - `tmdb-trending-scraper`: Scrapes trending panel HTML; skips already imported today
  - `tmdb-fresh-movies`: NEW – discovers last 30 days theatrical & digital plus next 7 day digital releases (discover API release types 2|3|4) and enriches core fields
  - Recommended cron cadence (UTC): now-playing (every 6h), popular (daily), trending (hourly), fresh-movies (every 4h)
  - All functions require valid Supabase auth + `X-CRON-SECRET` in production; local dev bypasses with direct calls

### Movie Data Enrichment
Python scripts in `scripts/`:
- `enrich_movies.py`: Batch TMDB enrichment
- `download_movie_images.py`: Mirror images to Supabase Storage
- Run via `batch-processor.sh` for rate-limited operations
- Edge enrichment coverage: `tmdb-fresh-movies` already pulls runtime, overview, genres, director, top 8 cast, and tmdb rating; other ingestion functions only set minimal poster/title/year and rely on later enrichment passes.

### Migrations
- SQL files in `supabase/migrations/` run in lexical order
- Naming: `YYYYMMDD_description.sql` (no seconds - causes duplicate issues)
- Local dev: `supabase db reset` replays all migrations

## UI/Component Conventions

### Styling
- **Tailwind** with dark mode default (`dark:` classes everywhere)
- Color palette: `gold-*` and `charcoal-*` for Oscar theming (see `tailwind.config.js`)
- Typography: Inter (body), Unbounded (headings via `font-unbounded`)
- Glass morphism pattern: `bg-gray-900/60 border border-yellow-500/20`

### State Management
- **Zustand** for client state (guest rankings, UI preferences)
- **localStorage** for view preferences (grid/list, sort, filters) via `useMovieFilters()` hook
- **Supabase realtime subscriptions**: Currently not used, prefer manual refetch
- **Home page "For Your Consideration"**: Uses `sortForYourConsideration()` which prioritizes:
  - Movies added in last 30 days (new releases)
  - 2024 releases (2025 Oscar eligibility)
  - 2025 releases (streaming debuts)
  - Critical acclaim (IMDb/Metacritic)
  - Recently added (90 day window)

### Drag and Drop
- `@dnd-kit` for list reordering (see `src/components/list/DraggableMovieCard.tsx`)
- Pattern: `DndContext` → `SortableContext` → `useSortable()` hook

### Image Handling
- TMDB/Fanart.tv external URLs cached in Supabase Storage (`cached_poster_url`, `cached_thumb_url`)
- Helper: `normalizeImageUrl()` from `src/utils/imageUrl.ts` prefers cached, falls back to external
- Next.js `<Image>` with remotePatterns configured in `next.config.js`

## Common Gotchas

1. **Hydration mismatches**: Always check `hasMounted` state before rendering localStorage-dependent UI
2. **Auth context timing**: Wrap auth-dependent logic in `useEffect` checking `user` state
3. **Slug-based routing**: Film pages at `/films/[slug]/[id]` - slug MUST match `slugifyTitle(movie.title)` or canonical redirect fires
4. **Guest mode edge cases**: Check `isGuest` before async operations - don't attempt DB writes for guests
5. **RLS policy errors**: If queries return empty, verify user is authenticated AND policies allow `SELECT`
6. **Missing new releases**: If a film (e.g., limited theatrical or streaming drop) is absent, trigger manual import by TMDB ID using existing admin tooling or extend `tmdb-fresh-movies` pages; ensure release type 4 (digital) covered.

## File Organization Shortcuts

- **Shared hooks**: `src/hooks/*` - prefer custom hooks for cross-component logic
- **Shared utilities**: `src/utils/*` - pure functions (no React hooks)
- **Component READMEs**: Several component dirs have README.md with usage patterns (e.g., `src/components/auth/README.md`)
- **Docs**: Operational guides in `docs/` (database setup, OAuth, cron jobs, recovery)

## Testing & Validation

- ESLint configured (`npm run lint`) - warnings don't fail builds
- No test suite currently - manual testing workflow
- Check auth flow: `/auth/check` page for debugging session state

## When Adding Features

1. **Check guest mode**: Does this need to work for unauthenticated users?
2. **Server or client?**: Prefer server components unless interactivity required
3. **Types**: Update `src/types/types.ts` if adding new domain models
4. **RLS**: New tables need `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and policies
5. **Migrations**: Create new numbered SQL file, test with `supabase db reset`

---

**Priority**: Guest mode support and proper client/server component separation are non-negotiable architectural decisions. Always validate these when modifying user-facing features.

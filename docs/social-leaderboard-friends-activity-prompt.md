# Social: Participation Leaderboard + Friends + Friend Activity Feed

## Context
This repo is a Next.js 15 (App Router) app with Supabase.
- Guest mode exists and must not break (rankings work in localStorage via Zustand).
- Follow the three Supabase client patterns:
  - Server Components/routes: `createServerClient` with cookies from `next/headers`
  - Client Components: `supabase` from `src/lib/supabaseBrowser.ts`
  - Admin: `supabaseAdmin` from `src/lib/supabaseAdmin.ts`
- RLS is enabled on user tables.
- Keep UX minimal and consistent with existing Tailwind tokens and components.

## Goal
Add social features:
1) Rank users (“individuals”) by participation and display a leaderboard.
2) Allow users to friend / be friended (friend requests, accept/decline, remove).
3) Show an activity feed scoped to the user’s friend group.

## Non-goals
- No realtime subscriptions.
- No notifications system beyond what’s needed to show pending requests.
- No new design system, no new pages beyond what’s required.

## Definitions
**Participation score**: a computed score that reflects how active a user is.
- Start simple and deterministic using existing data.
- Primary components:
  - Count of ranked movies (rows in `rankings`)
  - Count of lists created (rows in `movie_lists`)
  - Count of list items (rows in `movie_list_items`)
- Score formula (v1 suggestion; adjust if schema constraints require):
  - `score = ranked_movies * 2 + lists_created * 5 + list_items * 1`

**Friends**: mutual relationship created after a request is accepted.

**Activity feed**: recent events created by friends and shown to the current user.

## Data model / migrations (Supabase)
Create new migrations under `supabase/migrations/`.

### 1) Friendships
Create a table for friend requests and accepted friendships.

Table: `friendships`
- `id` uuid primary key default gen_random_uuid()
- `requester_id` uuid not null references auth.users(id)
- `addressee_id` uuid not null references auth.users(id)
- `status` text not null check in ('pending','accepted','declined','blocked')
- `created_at` timestamptz not null default now()
- `updated_at` timestamptz not null default now()

Constraints:
- Prevent self-friending.
- Unique constraint to prevent duplicate active relationships per pair. Implementation options:
  - Store a canonical pair key (e.g. `least_id`, `greatest_id`) with unique index, OR
  - Use a unique index on `(requester_id, addressee_id)` + additional logic to prevent mirrored duplicates.
  Prefer canonical pair to keep it clean.

RLS policies:
- SELECT: requester or addressee can see.
- INSERT: authenticated users can create pending request where requester_id = auth.uid().
- UPDATE:
  - requester can cancel (set to declined) while pending
  - addressee can accept/decline while pending
  - either party can remove friendship (set declined) when accepted
- Consider “block” later; for now implement status but keep UI minimal.

### 2) Activity events
Create a lightweight append-only log.

Table: `activity_events`
- `id` uuid primary key default gen_random_uuid()
- `actor_id` uuid not null references auth.users(id)
- `event_type` text not null (e.g. 'ranking_set','ranking_cleared','list_created','list_updated','list_item_added','list_item_removed')
- `movie_id` bigint null references movies(id)
- `list_id` uuid null references movie_lists(id)
- `metadata` jsonb not null default '{}'::jsonb
- `created_at` timestamptz not null default now()

Indexes:
- `actor_id, created_at desc`

RLS policies:
- INSERT: actor_id = auth.uid()
- SELECT: viewer can see events where actor_id is:
  - the viewer themselves, OR
  - any accepted friend of viewer
  Implement as a SQL policy using `EXISTS` against `friendships` with status='accepted'.

### 3) Participation leaderboard view (server-side)
Prefer a SQL view for leaderboard computation (fast, consistent).

View: `leaderboard_participation`
- `user_id`
- `score`
- breakdown columns (rankings_count, lists_count, list_items_count)

Build by joining:
- `profiles` (for display name/username)
- aggregates from `rankings`, `movie_lists`, `movie_list_items`

RLS:
- If leaderboard is public, expose via an API route that returns only safe public profile fields.
- If you create a view, you still need policies on underlying tables; easiest is to compute in an RPC or server route using service role *only if you’re okay making it public*. Prefer using a SECURITY DEFINER function that returns safe data.

## API layer (Next.js App Router)
Use route handlers under `src/app/api/`.

### Endpoints
1) `GET /api/leaderboard/participation`
- Returns top N users with score + public profile fields.
- Support `?limit=50` (cap at 100).
- Should work for guests.

2) `POST /api/friends/request`
- Body: `{ addresseeId: string }`
- Auth required.

3) `POST /api/friends/respond`
- Body: `{ friendshipId: string, action: 'accept'|'decline' }`
- Auth required.

4) `POST /api/friends/remove`
- Body: `{ userId: string }` (remove an accepted friend)
- Auth required.

5) `GET /api/friends`
- Returns: accepted friends + pending incoming/outgoing requests.
- Auth required.

6) `GET /api/activity`
- Returns: recent events from friends + self.
- Auth required.
- Support `?limit=50` cap 100.

### Activity writes
On existing mutations (rankings + lists), append an activity event.
- Rankings:
  - when setting ranking (including seen_it toggle), create event with movie_id and rating in metadata
  - when clearing ranking, create event
- Lists:
  - on create list, add item, remove item

Keep it minimal: do not backfill historical activity.

## UI
Minimal pages/components.

### New pages
1) `src/app/leaderboard/page.tsx`
- Public leaderboard (guest-safe)
- Simple table/list with rank, username/display name, score.

2) `src/app/friends/page.tsx`
- Auth-only
- Sections:
  - Search/add friend (by username)
  - Incoming requests (accept/decline)
  - Outgoing requests (pending)
  - Friends list (remove)

3) `src/app/activity/page.tsx`
- Auth-only
- Feed list of friend events

Navigation: add links in existing nav/menu (where appropriate) but keep minimal.

### UI constraints
- Reuse existing components and Tailwind tokens.
- No new colors or elaborate UI.
- Guests:
  - Can view leaderboard
  - Friends/activity pages show sign-in CTA

## Acceptance criteria
- Leaderboard shows deterministic participation ranking and is reachable.
- Friend requests: send, accept, decline, remove works with RLS enforcing access.
- Activity feed shows only self + accepted friends (no leaking).
- Guest mode remains functional; no guest writes to social tables.
- `npm run build` passes.

## Implementation order
1) Add migrations for `friendships` + RLS.
2) Add migrations for `activity_events` + RLS.
3) Add API routes.
4) Wire activity logging into existing mutations.
5) Add pages and minimal UI.
6) Manual sanity test flows.

## Questions to resolve early
- What is the public user identifier for friending (username in `profiles`)? If missing, add/confirm unique username.
- Should leaderboard be global public or only for signed-in users?

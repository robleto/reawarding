-- Create the feedback and error_logs tables the app has been writing to.
-- FeedbackForm.tsx and errorLogger.ts insert directly from the client (guests
-- included), and the admin telemetry route reads both via the service role.
-- Until now neither table existed, so submissions failed silently.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  feedback_type text not null check (feedback_type in ('bug', 'idea', 'other')),
  title text not null,
  description text not null,
  url text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  error_message text not null,
  error_stack text,
  error_type text not null default 'client_error',
  component_name text,
  url text,
  user_agent text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_at_idx on public.feedback (created_at desc);
create index if not exists error_logs_created_at_idx on public.error_logs (created_at desc);

alter table public.feedback enable row level security;
alter table public.error_logs enable row level security;

-- Guests and signed-in users may submit. No select policies: reads happen only
-- through the admin telemetry route, which uses the service role (bypasses RLS).
create policy "anyone can submit feedback" on public.feedback
  for insert to anon, authenticated with check (true);

create policy "anyone can log errors" on public.error_logs
  for insert to anon, authenticated with check (true);

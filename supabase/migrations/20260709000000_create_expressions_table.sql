-- Expression layer: per-user, per-film taste expression beyond the 1-10 rating.
-- Deliberately separate from rankings, which stays pure loop data (seen_it,
-- ranking). Expression is optional and additive — it never gates the loop.
--
-- Fields map to the editable mega-card ("Your Take" on the film page):
--   notes            private free-text, never shown to other users (P6 visibility
--                    rules will govern the other fields; notes stays private)
--   favorite_quote   a line or scene worth keeping — feeds P7 share cards
--   quality_tags     one-tap craft vocabulary ("gorgeous cinematography") —
--                    future signal source for craft-category emergence
--   would_recommend  binary social signal, distinct from the rating (P6 feed)

create table if not exists public.expressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  notes text,
  favorite_quote text,
  quality_tags text[] not null default '{}',
  would_recommend boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, movie_id)
);

create index if not exists expressions_user_id_idx on public.expressions (user_id);
create index if not exists expressions_movie_id_idx on public.expressions (movie_id);

alter table public.expressions enable row level security;

-- Owner-only for all operations. When Friends (P6) ships, non-notes fields may
-- gain a broader select policy governed by explicit visibility rules.
create policy "users read own expressions" on public.expressions
  for select to authenticated using (auth.uid() = user_id);

create policy "users insert own expressions" on public.expressions
  for insert to authenticated with check (auth.uid() = user_id);

create policy "users update own expressions" on public.expressions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users delete own expressions" on public.expressions
  for delete to authenticated using (auth.uid() = user_id);

-- Reuse the shared updated_at trigger function (created in telemetry migration)
drop trigger if exists update_expressions_updated_at on public.expressions;
create trigger update_expressions_updated_at
  before update on public.expressions
  for each row
  execute function update_updated_at_column();

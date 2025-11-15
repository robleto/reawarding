-- Create awards table with category dimension per user/year
create table if not exists public.awards (
  user_id uuid not null references public.profiles(id) on delete cascade,
  year integer not null,
  category text not null check (category in ('best-picture','best-animated','best-comedy','best-drama')),
  nominee_ids integer[] not null default '{}',
  winner_id integer null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint awards_pkey primary key (user_id, year, category)
);

-- Enable RLS
alter table public.awards enable row level security;

-- RLS policies: users can only access their own rows
create policy awards_select_own on public.awards
  for select using (auth.uid() = user_id);

create policy awards_insert_own on public.awards
  for insert with check (auth.uid() = user_id);

create policy awards_update_own on public.awards
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy awards_delete_own on public.awards
  for delete using (auth.uid() = user_id);

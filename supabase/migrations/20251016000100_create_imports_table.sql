-- Create the imports log table if missing (used by tmdb-trending-scraper)
create table if not exists public.imports (
  id bigserial primary key,
  tmdb_id integer not null,
  status text not null check (status in ('success','error')),
  notes text,
  imported_at timestamptz not null default now()
);
create index if not exists idx_imports_tmdb_time on public.imports (tmdb_id, imported_at desc);

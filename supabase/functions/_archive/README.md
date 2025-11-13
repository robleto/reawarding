# Archived Edge Functions

These functions were retired and replaced by `tmdb-fresh-movies` for freshness:

- `tmdb-now-playing`
- `tmdb-popular-movies`
- `tmdb-trending-scraper`

Why archive?
- Reduce surface area and maintenance.
- The new pipeline uses TMDB Discover windows to deterministically ingest fresh theatrical + digital releases.

Handlers in their original locations now return HTTP 410 Gone to prevent accidental invocation.

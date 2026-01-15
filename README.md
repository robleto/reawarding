# ReAwarding

Next.js 15 (App Router) movie ranking app with Supabase. Users rank movies, create lists, and track Oscar-worthy films. Guest mode is supported via localStorage/Zustand and migrates data on login.

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+ (for enrichment scripts)
- Supabase project + service role key

### Environment

Create `.env.local` (or `.env`) with:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TMDB_API_KEY`
- `OMDB_API_KEY` (optional)

### Run the app

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Ingestion & Enrichment

Scheduled jobs are documented in [docs/job-schedule.md](docs/job-schedule.md).

One-shot end-to-end run:

```bash
npm run ingest:all
```

Individual steps:

```bash
npm run ingest:collections
npm run ingest:discover
npm run ingest:enrich
npm run ingest:images
```

Discover options:

```bash
npm run ingest:discover -- --pages=10 --revenue-pages=5 --year-from=2018 --min-votes=200
```

## Architecture Notes

- Guest mode uses Zustand/localStorage and is merged into the user account on login.
- Server Components are default; Client Components are used only for interactions and auth hooks.
- Supabase client usage:
	- Server Components: `createServerClient`
	- Client Components: `src/lib/supabaseBrowser.ts`
	- Admin: `src/lib/supabaseAdmin.ts`

## Docs Index

- Job schedule: [docs/job-schedule.md](docs/job-schedule.md)
- Backup/restore: [docs/backup-and-restore.md](docs/backup-and-restore.md)
- Recovery playbook: [docs/recovery-playbook.md](docs/recovery-playbook.md)
- Enrichment guide: [docs/BATCH-ENRICHMENT-GUIDE.md](docs/BATCH-ENRICHMENT-GUIDE.md)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

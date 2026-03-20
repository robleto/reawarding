import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertCircle, ArrowLeft, Database, FileWarning } from 'lucide-react';
import { isUserAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

type SampleMovie = {
  id: number;
  tmdb_id: number | null;
  title: string;
  release_year: number | null;
  media_enriched_at: string | null;
};

type BacklogBucket = {
  label: string;
  count: number;
  rows: SampleMovie[];
};

const SAMPLE_LIMIT = 12;

async function countRows(filter: (query: any) => any) {
  const { count, error } = await filter(
    supabaseAdmin.from('movies').select('id', { count: 'exact', head: true })
  );

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function sampleRows(filter: (query: any) => any) {
  const { data, error } = await filter(
    supabaseAdmin
      .from('movies')
      .select('id, tmdb_id, title, release_year, media_enriched_at')
      .order('release_year', { ascending: false, nullsFirst: false })
      .order('id', { ascending: true })
      .limit(SAMPLE_LIMIT)
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SampleMovie[];
}

async function buildBucket(
  label: string,
  filter: (query: any) => any
): Promise<BacklogBucket> {
  const [count, rows] = await Promise.all([countRows(filter), sampleRows(filter)]);
  return { label, count, rows };
}

function SampleTable({ rows }: { rows: SampleMovie[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-500">No sample rows.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left text-gray-400">
            <th className="py-2 pr-4 font-medium">ID</th>
            <th className="py-2 pr-4 font-medium">TMDB</th>
            <th className="py-2 pr-4 font-medium">Title</th>
            <th className="py-2 pr-4 font-medium">Year</th>
            <th className="py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-gray-900/80 text-gray-200">
              <td className="py-2 pr-4">{row.id}</td>
              <td className="py-2 pr-4">{row.tmdb_id ?? 'null'}</td>
              <td className="py-2 pr-4">{row.title}</td>
              <td className="py-2 pr-4">{row.release_year ?? 'n/a'}</td>
              <td className="py-2">{row.media_enriched_at ? 'Enriched' : 'Not enriched'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminMetadataPage() {
  const admin = await isUserAdmin();
  if (!admin) {
    redirect('/admin/unauthorized');
  }

  const totalMovies = await countRows((query) => query);

  const buckets = await Promise.all([
    buildBucket('Missing TMDB ID', (query) => query.or('tmdb_id.is.null,tmdb_id.eq.0')),
    buildBucket('Missing overview', (query) => query.or('overview.is.null,overview.eq.')),
    buildBucket('Missing runtime', (query) => query.is('runtime', null)),
    buildBucket('Missing director', (query) => query.or('director.is.null,director.eq.')),
    buildBucket('Missing cast list', (query) => query.is('cast_list', null)),
    buildBucket('Not media enriched', (query) => query.is('media_enriched_at', null)),
    buildBucket('Any core gap', (query) =>
      query.or(
        'tmdb_id.is.null,tmdb_id.eq.0,overview.is.null,overview.eq.,runtime.is.null,director.is.null,director.eq.,cast_list.is.null'
      )
    ),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-charcoal-900">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10 flex items-center justify-between gap-4">
          <div>
            <p className="mb-3 text-sm uppercase tracking-[0.28em] text-gold-300/80">
              Admin
            </p>
            <h1 className="font-unbounded text-4xl text-white">Metadata Backlog</h1>
            <p className="mt-3 max-w-3xl text-gray-400">
              Diagnose which movies are still missing core film details so the TMDB
              enrichment backlog is visible.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-charcoal-800/60 px-4 py-2 text-sm text-gray-200 transition hover:border-gold-500/40 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Link>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-gold-500/20 bg-gold-500/8 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500/15">
              <Database className="h-6 w-6 text-gold-300" />
            </div>
            <p className="text-sm text-gray-400">Total movies</p>
            <p className="mt-2 text-4xl font-semibold text-white">{totalMovies}</p>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15">
              <FileWarning className="h-6 w-6 text-amber-300" />
            </div>
            <p className="text-sm text-gray-400">Movies with any core gap</p>
            <p className="mt-2 text-4xl font-semibold text-white">
              {buckets.find((bucket) => bucket.label === 'Any core gap')?.count ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/8 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15">
              <AlertCircle className="h-6 w-6 text-blue-300" />
            </div>
            <p className="text-sm text-gray-400">Not media enriched</p>
            <p className="mt-2 text-4xl font-semibold text-white">
              {buckets.find((bucket) => bucket.label === 'Not media enriched')?.count ?? 0}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {buckets.map((bucket) => (
            <section
              key={bucket.label}
              className="rounded-2xl border border-gray-800 bg-charcoal-900/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
            >
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">{bucket.label}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Current backlog count for this field.
                  </p>
                </div>
                <div className="rounded-full border border-gold-500/25 bg-gold-500/10 px-3 py-1 text-sm font-medium text-gold-200">
                  {bucket.count}
                </div>
              </div>
              <SampleTable rows={bucket.rows} />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

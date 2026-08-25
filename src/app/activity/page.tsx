'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@supabase/auth-helpers-react';

type ActivityEvent = {
  id: string;
  actor_id: string;
  movie_id: string | null;
  seen_it: boolean;
  ranking: number | null;
  updated_at: string;
  actorProfile: {
    id: string;
    username: string;
    preferred_name?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
  movie: { id: string; title: string; release_year: number; thumb_url?: string | null } | null;
};

function formatRelativeTime(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function describe(e: ActivityEvent) {
  const actor = e.actorProfile?.preferred_name || e.actorProfile?.full_name || e.actorProfile?.username || 'Someone';
  const title = e.movie?.title;
  if (e.ranking !== null) {
    return title ? `${actor} rated "${title}" ${e.ranking}/10` : `${actor} rated a film`;
  }
  return title ? `${actor} watched "${title}"` : `${actor} logged a film`;
}

export default function ActivityPage() {
  const user = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/activity?limit=50');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load activity');
      setEvents(data.events || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const display = useMemo(() => events.map((e) => ({ ...e, _text: describe(e) })), [events]);

  if (!user) {
    return (
      <main className="max-w-screen-xl px-6 py-10 mx-auto">
        <h1 className="text-3xl font-unbounded text-gray-100">Activity</h1>
        <p className="mt-3 text-gray-400">Sign in to view activity from people you follow.</p>
        <Link href="/login" className="inline-flex mt-4 px-4 py-2 rounded-lg bg-gold-500/20 border border-gold-500/30 text-gold-200 hover:bg-gold-500/30">
          Go to login
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-screen-xl px-6 py-10 mx-auto">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-unbounded text-gray-100">Activity</h1>
        <Link href="/members" className="text-sm text-gold-300 hover:underline">Find people to follow</Link>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-900/20 border border-red-800 text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {loading && <div className="text-sm text-gray-400">Loading…</div>}

        {!loading && display.length === 0 && (
          <div className="p-5 rounded-xl bg-gray-900/60 border border-gold-500/20 text-gray-300">
            No activity yet — follow someone from{' '}
            <Link href="/members" className="underline hover:text-gold-300">Members</Link> to see their ratings here.
          </div>
        )}

        {display.map((e) => (
          <div key={e.id} className="p-4 rounded-xl bg-gray-900/60 border border-gold-500/20">
            <div className="flex items-center justify-between gap-3">
              <div className="text-gray-200 text-sm">{e._text}</div>
              <div className="text-xs text-gray-500">{formatRelativeTime(e.updated_at)}</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

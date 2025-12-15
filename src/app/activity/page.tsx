'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@supabase/auth-helpers-react';

type ActivityEvent = {
  id: string;
  actor_id: string;
  event_type: string;
  movie_id: number | null;
  list_id: string | null;
  metadata: any;
  created_at: string;
  actorProfile: {
    id: string;
    username: string;
    preferred_name?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
  movie: { id: number; title: string; release_year: number } | null;
  list: { id: string; name: string } | null;
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
  if (e.event_type === 'ranking_set') {
    const rating = e.metadata?.ranking;
    const title = e.movie?.title;
    return title ? `${actor} rated “${title}” (${rating ?? '?'})` : `${actor} updated a rating`;
  }
  if (e.event_type === 'ranking_cleared') {
    const title = e.movie?.title;
    return title ? `${actor} cleared their rating for “${title}”` : `${actor} cleared a rating`;
  }
  if (e.event_type === 'list_created') {
    return e.list?.name ? `${actor} created list “${e.list.name}”` : `${actor} created a list`;
  }
  if (e.event_type === 'list_item_added') {
    const title = e.movie?.title;
    const list = e.list?.name;
    if (title && list) return `${actor} added “${title}” to “${list}”`;
    return `${actor} added a list item`;
  }
  if (e.event_type === 'list_item_removed') {
    const title = e.movie?.title;
    const list = e.list?.name;
    if (title && list) return `${actor} removed “${title}” from “${list}”`;
    return `${actor} removed a list item`;
  }
  return `${actor} did something`;
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
        <h1 className="text-3xl font-unbounded text-gray-900 dark:text-gray-100">Activity</h1>
        <p className="mt-3 text-gray-400">Sign in to view friend activity.</p>
        <Link href="/login" className="inline-flex mt-4 px-4 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 hover:bg-yellow-500/30">
          Go to login
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-screen-xl px-6 py-10 mx-auto">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-unbounded text-gray-900 dark:text-gray-100">Activity</h1>
        <Link href="/friends" className="text-sm text-yellow-300 hover:underline">Manage friends</Link>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-900/20 border border-red-800 text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {loading && <div className="text-sm text-gray-400">Loading…</div>}

        {!loading && display.length === 0 && (
          <div className="p-5 rounded-xl bg-gray-900/60 border border-yellow-500/20 text-gray-300">
            No activity yet.
          </div>
        )}

        {display.map((e: any) => (
          <div key={e.id} className="p-4 rounded-xl bg-gray-900/60 border border-yellow-500/20">
            <div className="flex items-center justify-between gap-3">
              <div className="text-gray-200 text-sm">{e._text}</div>
              <div className="text-xs text-gray-500">{formatRelativeTime(e.created_at)}</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

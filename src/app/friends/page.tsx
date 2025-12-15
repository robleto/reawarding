'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@supabase/auth-helpers-react';
import { supabase } from '@/lib/supabaseBrowser';

type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  created_at: string;
  updated_at: string;
  otherProfile: {
    id: string;
    username: string;
    preferred_name?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
  direction: 'incoming' | 'outgoing';
};

export default function FriendsPage() {
  const user = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [friendships, setFriendships] = useState<FriendshipRow[]>([]);

  const [searchUsername, setSearchUsername] = useState('');
  const [searchResult, setSearchResult] = useState<{ id: string; username: string; preferred_name?: string | null; full_name?: string | null } | null>(null);
  const [searching, setSearching] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/friends');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load friends');
      setFriendships(data.friendships || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const incoming = useMemo(() => friendships.filter((f) => f.status === 'pending' && f.direction === 'incoming'), [friendships]);
  const outgoing = useMemo(() => friendships.filter((f) => f.status === 'pending' && f.direction === 'outgoing'), [friendships]);
  const accepted = useMemo(() => friendships.filter((f) => f.status === 'accepted'), [friendships]);

  const handleSearch = async () => {
    if (!user) return;
    setSearching(true);
    setError(null);
    setSearchResult(null);

    const username = searchUsername.trim();
    if (username.length < 3) {
      setSearching(false);
      setError('Enter at least 3 characters');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, preferred_name, full_name')
        .eq('username', username)
        .single();

      if (error) {
        setSearchResult(null);
        setError('User not found');
      } else if (data.id === user.id) {
        setError('That’s you');
      } else {
        setSearchResult(data as any);
      }
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (addresseeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresseeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to send request');
      setSearchResult(null);
      setSearchUsername('');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const respond = async (friendshipId: string, action: 'accept' | 'decline') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const removeFriend = async (otherUserId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/friends/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: otherUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <main className="max-w-screen-xl px-6 py-10 mx-auto">
        <h1 className="text-3xl font-unbounded text-gray-900 dark:text-gray-100">Friends</h1>
        <p className="mt-3 text-gray-400">Sign in to add friends and view activity.</p>
        <Link href="/login" className="inline-flex mt-4 px-4 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 hover:bg-yellow-500/30">
          Go to login
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-screen-xl px-6 py-10 mx-auto">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-unbounded text-gray-900 dark:text-gray-100">Friends</h1>
        <Link href="/activity" className="text-sm text-yellow-300 hover:underline">View activity</Link>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-900/20 border border-red-800 text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="mt-6 p-5 rounded-xl bg-gray-900/60 border border-yellow-500/20">
        <h2 className="text-lg font-semibold text-gray-100">Add friend</h2>
        <div className="mt-3 flex flex-col sm:flex-row gap-3">
          <input
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
            placeholder="username"
            className="flex-1 px-3 py-2 rounded-lg bg-gray-950/40 border border-yellow-500/20 text-gray-100 placeholder:text-gray-500"
          />
          <button
            onClick={handleSearch}
            disabled={searching || loading}
            className="px-4 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 hover:bg-yellow-500/30 disabled:opacity-50"
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>

        {searchResult && (
          <div className="mt-4 flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-950/30 border border-yellow-500/10">
            <div className="min-w-0">
              <div className="text-gray-100 font-medium truncate">
                {searchResult.preferred_name || searchResult.full_name || searchResult.username}
              </div>
              <div className="text-xs text-gray-400 truncate">@{searchResult.username}</div>
            </div>
            <button
              onClick={() => sendRequest(searchResult.id)}
              disabled={loading}
              className="px-3 py-1.5 rounded-md bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 hover:bg-yellow-500/30 disabled:opacity-50"
            >
              Send request
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="p-5 rounded-xl bg-gray-900/60 border border-yellow-500/20">
          <h2 className="text-lg font-semibold text-gray-100">Incoming</h2>
          <div className="mt-3 space-y-3">
            {incoming.length === 0 ? (
              <div className="text-sm text-gray-400">No requests.</div>
            ) : (
              incoming.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-950/30 border border-yellow-500/10">
                  <div className="min-w-0">
                    <div className="text-gray-100 font-medium truncate">
                      {f.otherProfile?.preferred_name || f.otherProfile?.full_name || f.otherProfile?.username}
                    </div>
                    <div className="text-xs text-gray-400 truncate">@{f.otherProfile?.username}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => respond(f.id, 'accept')}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-md bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 hover:bg-yellow-500/30 disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => respond(f.id, 'decline')}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-md bg-gray-800 border border-gray-700 text-gray-200 hover:bg-gray-700 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="p-5 rounded-xl bg-gray-900/60 border border-yellow-500/20">
          <h2 className="text-lg font-semibold text-gray-100">Outgoing</h2>
          <div className="mt-3 space-y-3">
            {outgoing.length === 0 ? (
              <div className="text-sm text-gray-400">No pending requests.</div>
            ) : (
              outgoing.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-950/30 border border-yellow-500/10">
                  <div className="min-w-0">
                    <div className="text-gray-100 font-medium truncate">
                      {f.otherProfile?.preferred_name || f.otherProfile?.full_name || f.otherProfile?.username}
                    </div>
                    <div className="text-xs text-gray-400 truncate">@{f.otherProfile?.username}</div>
                  </div>
                  <div className="text-xs text-gray-400">Pending</div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="p-5 rounded-xl bg-gray-900/60 border border-yellow-500/20">
          <h2 className="text-lg font-semibold text-gray-100">Friends</h2>
          <div className="mt-3 space-y-3">
            {accepted.length === 0 ? (
              <div className="text-sm text-gray-400">No friends yet.</div>
            ) : (
              accepted.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-950/30 border border-yellow-500/10">
                  <div className="min-w-0">
                    <div className="text-gray-100 font-medium truncate">
                      {f.otherProfile?.preferred_name || f.otherProfile?.full_name || f.otherProfile?.username}
                    </div>
                    <div className="text-xs text-gray-400 truncate">@{f.otherProfile?.username}</div>
                  </div>
                  <button
                    onClick={() => removeFriend(f.otherProfile?.id || '')}
                    disabled={loading || !f.otherProfile?.id}
                    className="px-3 py-1.5 rounded-md bg-gray-800 border border-gray-700 text-gray-200 hover:bg-gray-700 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {loading && (
        <div className="mt-6 text-sm text-gray-400">Working…</div>
      )}
    </main>
  );
}

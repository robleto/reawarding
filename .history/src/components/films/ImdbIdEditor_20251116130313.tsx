"use client";

import { useState } from "react";
import { useUser } from "@/hooks/useUser";
import { useGlobalToast } from "@/hooks/useGlobalToast";

export default function ImdbIdEditor({ movieId, initialImdbId }: { movieId: number; initialImdbId?: string | null }) {
  const { user } = useUser();
  const { showToast } = useGlobalToast();
  const [value, setValue] = useState<string>(initialImdbId || "");
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/set-imdb-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId, imdb_id: value.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || res.statusText || 'Failed to update IMDb ID';
        showToast(msg, 'error');
        return;
      }
      showToast('IMDb ID updated', 'success');
      // Soft refresh to show Awards section
      window.location.reload();
    } catch (e: any) {
      showToast(e?.message || 'Failed to update IMDb ID', 'error');
    } finally {
      setSaving(false);
    }
  };

  const disabled = !user || saving;

  return (
    <div className="mt-3 p-3 rounded-lg bg-gray-900/40 border border-yellow-500/10">
      <div className="text-sm text-gray-400 mb-2">Admin: Set IMDb ID</div>
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="tt1234567"
          className="px-3 py-2 rounded-md bg-gray-800 text-gray-100 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-500/40 font-mono text-sm"
          pattern="tt[0-9]+"
        />
        <button
          onClick={onSave}
          disabled={disabled}
          className="px-3 py-2 rounded-md bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white text-sm"
          title={!user ? 'Sign in required' : undefined}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      <div className="text-[11px] text-gray-500 mt-1">
        Paste an IMDb title ID (e.g., tt1375666). Leave blank to clear.
      </div>
    </div>
  );
}

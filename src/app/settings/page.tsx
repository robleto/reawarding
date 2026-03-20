"use client";

import { useState, useEffect } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import { LogOut, Mail, Upload } from "lucide-react";
import Link from "next/link";
import type { Database } from "@/types/supabase";
import { signOutEverywhere } from "@/utils/signOut";
import { useAuthState } from "@/hooks/useAuthState";

export default function SettingsPage() {
  const { user, status: authStatus } = useAuthState();
  const supabase = useSupabaseClient<Database>();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace("/");
    }
  }, [user, router]);

  const handleSignOut = async () => {
    setLoading(true);
    setError(null);

    try {
      await signOutEverywhere(supabase);
      router.replace("/");
      router.refresh();
      return;
    } catch {
      setError("Failed to sign out. Please try again.");
      setLoading(false);
      return;
    }
  };

  if (authStatus === "loading" || !user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Bare-bones account controls for the current build.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Import */}
      <div className="dark-glass rounded-xl border border-gray-700/40 p-5 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Upload className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-sm font-semibold text-white">Import library</p>
              <p className="text-xs text-gray-500">Letterboxd or IMDb CSV</p>
            </div>
          </div>
          <Link
            href="/settings/import"
            className="text-sm font-medium text-yellow-300 hover:text-yellow-200 transition-colors"
          >
            Import →
          </Link>
        </div>
      </div>

      <div className="light-glass dark:dark-glass rounded-xl shadow-lg p-6 border border-gray-300/40 dark:border-gray-600/50">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Account</h2>
        </div>

        <div className="space-y-4">
          <div className="py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Email</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {loading ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

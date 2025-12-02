"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { buildSiteUrl, getSiteUrl } from "@/utils/siteUrl";

export default function AuthCheckPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const origin = getSiteUrl();

  const uniqueEmail = () => `test-${Date.now()}@example.com`;

  const run = async (label: string, fn: () => Promise<void>) => {
    setLoading(label);
    setResult(null);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Auth Self-Check</h1>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            Use a real email you can access for password reset and confirmation. For new signups, you can use a unique alias or the generator below. Password reset only works for confirmed users.
          </p>
        </div>

        <div className="bg-white p-4 rounded border space-y-3">
          <label className="block text-sm font-medium">Test Email</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              className="px-3 py-2 border rounded"
              onClick={() => setEmail(uniqueEmail())}
              type="button"
            >
              Generate unique
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
            <button
              className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              disabled={!email || !!loading}
              onClick={() =>
                run("resend", async () => {
                  const { data, error } = await supabase.auth.resend({
                    type: "signup",
                    email,
                    options: {
                      emailRedirectTo: buildSiteUrl("/auth/callback?next=/rankings") || undefined,
                    },
                  });
                  if (error) throw error;
                  setResult(`Resent confirmation: ${JSON.stringify(data)}`);
                })
              }
            >
              Resend confirmation
            </button>

            <button
              className="px-3 py-2 rounded bg-green-600 text-white disabled:opacity-50"
              disabled={!email || !!loading}
              onClick={() =>
                run("reset", async () => {
                  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: buildSiteUrl("/auth/reset-password") || undefined,
                  });
                  if (error) throw error;
                  setResult(`Password reset sent: ${JSON.stringify(data)}`);
                })
              }
            >
              Send password reset
            </button>

            <button
              className="px-3 py-2 rounded bg-purple-600 text-white disabled:opacity-50"
              disabled={!!loading}
              onClick={() =>
                run("signup", async () => {
                  const signupEmail = email || uniqueEmail();
                  const { data, error } = await supabase.auth.signUp({
                    email: signupEmail,
                    password: "testpassword123",
                    options: {
                      emailRedirectTo: buildSiteUrl("/auth/callback?next=/rankings") || undefined,
                    },
                  });
                  if (error) throw error;
                  setResult(`Signup created for ${signupEmail}: ${JSON.stringify(data)}`);
                })
              }
            >
              Create test signup
            </button>
          </div>
        </div>

        {loading && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
            Running: {loading}…
          </div>
        )}
        {result && (
          <pre className="p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm whitespace-pre-wrap">
            {result}
          </pre>
        )}
        {error && (
          <pre className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm whitespace-pre-wrap">
            {error}
          </pre>
        )}
      </div>
    </main>
  );
}

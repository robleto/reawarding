"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      const next = searchParams.get("next") || "/rankings";

      // Newer flow: ?code=... from email confirmation / OAuth
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError(error.message);
          return;
        }
        router.replace(next);
        return;
      }

      // Fallback: older links with access_token/refresh_token
      const access_token = searchParams.get("access_token");
      const refresh_token = searchParams.get("refresh_token");
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) {
          setError(error.message);
          return;
        }
        router.replace(next);
        return;
      }

      // Nothing to exchange; just go to next
      router.replace(next);
    };

    handleAuthCallback();
  }, [router, searchParams]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {error ? (
            <>
              <h1 className="text-xl font-semibold text-red-600 mb-2">Authentication error</h1>
              <p className="text-gray-700">{error}</p>
            </>
          ) : (
            <>
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <h1 className="text-xl font-semibold text-gray-900">Finishing sign in…</h1>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

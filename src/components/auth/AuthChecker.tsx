"use client";

import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useEffect, useState } from "react";

export function AuthChecker() {
  const user = useUser();
  const supabase = useSupabaseClient();
  const [sessionData, setSessionData] = useState<any>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSessionData(session);
    };
    checkSession();
  }, [supabase]);

  return (
    <div className="p-4 border rounded bg-gray-50 my-4">
      <h3 className="font-bold mb-2">Authentication Status</h3>
      
      <div className="space-y-2">
        <div>
          <strong>useUser() hook:</strong>
          {user ? (
            <div className="ml-4 text-green-600">
              ✅ Authenticated
              <div>ID: {user.id}</div>
              <div>Email: {user.email}</div>
            </div>
          ) : (
            <div className="ml-4 text-red-600">❌ Not authenticated</div>
          )}
        </div>

        <div>
          <strong>Direct session check:</strong>
          {sessionData ? (
            <div className="ml-4 text-green-600">
              ✅ Session exists
              <div>User ID: {sessionData.user?.id}</div>
              <div>Email: {sessionData.user?.email}</div>
              <div>Provider: {sessionData.user?.app_metadata?.provider}</div>
            </div>
          ) : (
            <div className="ml-4 text-red-600">❌ No session</div>
          )}
        </div>

        <div>
          <strong>Auth state match:</strong>
          {user?.id === sessionData?.user?.id ? (
            <span className="ml-4 text-green-600">✅ Consistent</span>
          ) : (
            <span className="ml-4 text-red-600">❌ Inconsistent</span>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseBrowser';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import type { Database } from '@/types/supabase';
import { User, Session } from '@supabase/supabase-js';

interface ProvidersProps {
  children: React.ReactNode;
  initialUser: User | null;
}

export function Providers({ children, initialUser }: ProvidersProps) {
  const [initialSession, setInitialSession] = useState<Session | null>(null);
  
  // console.log("Providers - initialUser:", initialUser);

  useEffect(() => {
    // Get the current session from the client
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log("🔑 SESSION DEBUG:", {
        session: session ? "SESSION EXISTS" : "NO SESSION",
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          provider: session.user.app_metadata?.provider
        } : "NO USER",
        error: error
      });
      setInitialSession(session);
    };
    
    getSession();
  }, []);
  
  return (
    <SessionContextProvider 
      supabaseClient={supabase} 
      initialSession={initialSession}
    >
      <ThemeProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </ThemeProvider>
    </SessionContextProvider>
  );
}
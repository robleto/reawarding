'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseBrowser';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { setupGlobalErrorHandlers } from '@/utils/errorLogger';
import { useAuthMigration } from '@/utils/authMigration';
import type { Database } from '@/types/supabase';
import { User, Session } from '@supabase/supabase-js';

interface ProvidersProps {
  children: React.ReactNode;
  initialUser: User | null;
}

export function Providers({ children, initialUser }: ProvidersProps) {
  const [initialSession, setInitialSession] = useState<Session | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setInitialSession(session);
    };

    getSession();

    // Set up global error handlers (only on client)
    setupGlobalErrorHandlers();
  }, []);
  
  return (
    <ErrorBoundary componentName="AppRoot">
      <SessionContextProvider 
        supabaseClient={supabase} 
        initialSession={initialSession}
      >
        <AuthMigrationBridge />
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </SessionContextProvider>
    </ErrorBoundary>
  );
}

function AuthMigrationBridge() {
  useAuthMigration();
  return null;
}

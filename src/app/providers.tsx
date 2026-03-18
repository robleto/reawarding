'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseBrowser';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { setupGlobalErrorHandlers } from '@/utils/errorLogger';
import { useAuthMigration } from '@/utils/authMigration';
import { useAuthState } from '@/hooks/useAuthState';
import useOnboardingState from '@/hooks/useOnboardingState';
import useGuestRankingStore from '@/hooks/useGuestRankingStore';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    // Set up global error handlers (only on client)
    setupGlobalErrorHandlers();
  }, []);
  
  return (
    <ErrorBoundary componentName="AppRoot">
      <SessionContextProvider supabaseClient={supabase}>
        <AuthMigrationBridge />
        <PersistenceBoundaryBridge />
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

function PersistenceBoundaryBridge() {
  const { status, user } = useAuthState();
  const bindActor = useOnboardingState((state) => state.bindActor);
  const clearGuestData = useGuestRankingStore((state) => state.clearAllData);

  useEffect(() => {
    bindActor(user?.id ?? 'guest');
  }, [bindActor, user?.id]);

  useEffect(() => {
    if (status === 'authenticated') {
      clearGuestData();
    }
  }, [clearGuestData, status]);

  return null;
}

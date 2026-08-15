'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseBrowser';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { NativeStatusBarBridge } from '@/components/providers/NativeStatusBarBridge';
import { NativeOfflineGate } from '@/components/providers/NativeOfflineGate';
import { NativeUpdateBridge } from '@/components/providers/NativeUpdateBridge';
import { NativeOAuthBridge } from '@/components/providers/NativeOAuthBridge';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { setupGlobalErrorHandlers } from '@/utils/errorLogger';
import { useAuthMigration } from '@/utils/authMigration';
import { useAuthState } from '@/hooks/useAuthState';
import useOnboardingState from '@/hooks/useOnboardingState';
import { WatchlistProvider } from '@/contexts/WatchlistContext';

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
        <NativeStatusBarBridge />
        <NativeOfflineGate />
        <NativeUpdateBridge />
        <NativeOAuthBridge />
        <ThemeProvider>
          <ToastProvider>
            <WatchlistProvider>
              {children}
            </WatchlistProvider>
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
  const { user } = useAuthState();
  const bindActor = useOnboardingState((state) => state.bindActor);

  useEffect(() => {
    bindActor(user?.id ?? 'guest');
  }, [bindActor, user?.id]);

  // Guest-data clearing intentionally lives in useAuthMigration's success path
  // (useGuestRankingStore.ts → migrateToSupabase). A second clear here would
  // race the async migration and wipe rankings before they're persisted.

  return null;
}

'use client';

import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createBrowserClient } from '@supabase/ssr';
import { useState, createContext, useContext } from 'react';
import type { Database } from '@/types/supabase';
import type { Session } from '@supabase/auth-helpers-nextjs';
import { useAuthMigration } from '@/utils/authMigration';
import { useToast } from '@/components/ui/Toast';

interface ToastContextType {
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useGlobalToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useGlobalToast must be used within a ToastProvider');
  }
  return context;
}

function AuthMigrationProvider({ children }: { children: React.ReactNode }) {
  const { showToast, ToastComponent } = useToast();
  
  useAuthMigration((count) => {
    // Check if this is an OAuth callback
    const isOAuthCallback = window.location.pathname.includes('callback') || 
                           window.location.pathname === '/rankings';
    
    if (isOAuthCallback) {
      showToast("Welcome! Your picks are saved.", "success");
    } else {
      showToast(`Successfully migrated ${count} movie ratings to your account!`, "success");
    }
  });
  
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {ToastComponent}
    </ToastContext.Provider>
  );
}

export function Providers({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession?: Session | null;
}) {
  const [supabaseClient] = useState(() => createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={initialSession}>
      <AuthMigrationProvider>
        {children}
      </AuthMigrationProvider>
    </SessionContextProvider>
  );
}

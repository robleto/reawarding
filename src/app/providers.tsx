'use client';

import { supabase } from '@/lib/supabaseBrowser';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import type { Database } from '@/types/supabase';
import { User } from '@supabase/supabase-js';

interface ProvidersProps {
  children: React.ReactNode;
  initialUser: User | null;
}

export function Providers({ children, initialUser }: ProvidersProps) {
  return (
    <SessionContextProvider supabaseClient={supabase} initialSession={null}>
      <ThemeProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </ThemeProvider>
    </SessionContextProvider>
  );
}
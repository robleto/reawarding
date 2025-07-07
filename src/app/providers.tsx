'use client';

import { createClient } from '@supabase/supabase-js';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import type { Database } from '@/types/supabase';
import { Session } from '@supabase/supabase-js';

interface ProvidersProps {
  children: React.ReactNode;
  initialSession: Session | null;
}

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function Providers({ children, initialSession }: ProvidersProps) {
  return (
    <SessionContextProvider supabaseClient={supabase} initialSession={initialSession}>
      <ThemeProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </ThemeProvider>
    </SessionContextProvider>
  );
}
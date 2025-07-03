'use client';

import { createContext, useContext } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const SupabaseContext = createContext<SupabaseClient<Database> | null>(null);

export function SupabaseProvider({
  supabase,
  children,
}: {
  supabase: SupabaseClient<Database>;
  children: React.ReactNode;
}) {
  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
}

// Optional helper for consuming the client
export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within SupabaseProvider');
  }
  return context;
}

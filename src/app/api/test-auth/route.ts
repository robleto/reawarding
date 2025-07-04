import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              // Ignore cookie setting errors in route handlers
            }
          },
        },
      }
    );

    // Test database connection
    const { data: movies, error } = await supabase
      .from('movies')
      .select('id, title')
      .limit(5);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database connection failed', details: error.message }, { status: 500 });
    }

    // Test auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    return NextResponse.json({ 
      database: 'connected',
      movies: movies?.length || 0,
      user: user ? { id: user.id, email: user.email } : null,
      authError: authError?.message || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

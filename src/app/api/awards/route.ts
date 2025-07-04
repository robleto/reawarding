import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    
    if (!year) {
      return NextResponse.json({ error: 'Year parameter is required' }, { status: 400 });
    }

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
            } catch {
              // Ignore cookie setting errors in route handlers
            }
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's award nominations for the specified year
    const { data: nominations, error } = await supabase
      .from('award_nominations')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', year)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Database error:', error);
      throw error;
    }

    return NextResponse.json({
      nominations: nominations || null
    });
  } catch (error) {
    console.error('Error fetching award nominations:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch nominations' 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
            } catch {
              // Ignore cookie setting errors in route handlers
            }
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { year, nominee_ids, winner_id } = await request.json();

    if (!year || !Array.isArray(nominee_ids)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    if (nominee_ids.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 nominees allowed' }, { status: 400 });
    }

    if (winner_id && !nominee_ids.includes(winner_id)) {
      return NextResponse.json({ error: 'Winner must be among nominees' }, { status: 400 });
    }

    console.log('Saving nominations for user:', user.id, 'year:', year, 'nominees:', nominee_ids, 'winner:', winner_id);

    // Upsert the award nominations
    const { data, error } = await supabase
      .from('award_nominations')
      .upsert({
        user_id: user.id,
        year: year,
        nominee_ids: nominee_ids,
        winner_id: winner_id || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,year'
      })
      .select();

    if (error) {
      console.error('Supabase upsert error:', error);
      throw error;
    }

    console.log('Saved successfully:', data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error saving award nominations:', error);
    
    // Return JSON error response instead of letting Next.js handle it
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ error: 'Failed to save nominations' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function isAuthorizedAdmin(userId?: string | null, email?: string | null): boolean {
  const allowAll = process.env.ENABLE_IMDB_ADMIN === 'true' || process.env.NEXT_PUBLIC_ENABLE_IMDB_ADMIN === 'true';
  const ids = (process.env.ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  const emails = (process.env.ADMIN_USER_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!userId && !email) return false;
  if (allowAll && userId) return true; // enable in dev/staging via flag
  if (userId && ids.includes(userId)) return true;
  if (email && emails.includes(email.toLowerCase())) return true;
  return false;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const movieId = body?.movieId ? String(body.movieId) : null;
    const imdb_id: string | null = body?.imdb_id ? String(body.imdb_id) : null;
    if (!movieId) {
      return NextResponse.json({ error: 'Invalid movieId' }, { status: 400 });
    }
    if (imdb_id && !/^tt\d{3,}$/.test(imdb_id)) {
      return NextResponse.json({ error: 'Invalid IMDb ID format (expected tt1234567)' }, { status: 400 });
    }

    // Auth check
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email || null;
    const uid = user?.id || null;

    if (!isAuthorizedAdmin(uid, email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabaseAdmin
      .from('movies')
      .update({ imdb_id })
      .eq('id', movieId);

    if (error) {
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update IMDb ID' }, { status: 500 });
  }
}

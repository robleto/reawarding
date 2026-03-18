import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isUserAdmin } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  const isAdmin = await isUserAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { slug, title, description, icon, color, category, featured } = await request.json();

  if (!slug || !title || !category) {
    return NextResponse.json({ error: 'Missing required collection fields' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('film_collections')
    .insert({
      slug,
      title,
      description,
      icon,
      color,
      category,
      featured,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

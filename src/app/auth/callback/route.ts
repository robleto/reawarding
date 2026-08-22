import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';
import { sanitizeNextPath } from '@/utils/sanitizeNextPath';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const token = requestUrl.searchParams.get('token');
  const type = requestUrl.searchParams.get('type');
  const code = requestUrl.searchParams.get('code');
  const codeVerifier = requestUrl.searchParams.get('code_verifier');
  // Only allow same-origin relative paths — `next` comes from the URL and must not redirect off-site.
  const next = sanitizeNextPath(requestUrl.searchParams.get('next'));
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description);
    return NextResponse.redirect(
      new URL(`/auth-code-error?error=${error}&description=${error_description || 'Authentication failed'}`, requestUrl.origin)
    );
  }

  if (type === 'recovery') {
    const redirectUrl = new URL('/auth/reset-password', requestUrl.origin);
    if (code) redirectUrl.searchParams.set('code', code);
    if (codeVerifier) redirectUrl.searchParams.set('code_verifier', codeVerifier);
    if (token_hash) redirectUrl.searchParams.set('token_hash', token_hash);
    if (token) redirectUrl.searchParams.set('token', token);
    return NextResponse.redirect(redirectUrl);
  }

  // Handle token-based verification (magic links, email confirmation, password reset)
  const verificationToken = token_hash ?? token;
  if (verificationToken && type) {
    const cookieStore = await cookies();
    const response = NextResponse.redirect(new URL(next, requestUrl.origin));
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const verifyPayload = token_hash
      ? { token_hash: verificationToken, type: type as any }
      : { token: verificationToken, type: type as any };
    const { error: verifyError } = await (supabase.auth.verifyOtp as unknown as (payload: { token_hash: string; type: any } | { token: string; type: any }) => Promise<{ error: Error | null }>)(verifyPayload);

    if (verifyError) {
      console.error('Error verifying token:', verifyError);
      return NextResponse.redirect(
        new URL(`/auth-code-error?error=${verifyError.name}&description=${verifyError.message}`, requestUrl.origin)
      );
    }

    // Successful verification - redirect to intended destination
    return response;
  }

  // Handle OAuth code exchange
  if (code) {
    const cookieStore = await cookies();
    const response = NextResponse.redirect(new URL(next, requestUrl.origin));
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    let exchangeError;
    if (codeVerifier) {
      ({ error: exchangeError } = await (supabase.auth.exchangeCodeForSession as unknown as (params: { authCode: string; codeVerifier: string }) => Promise<{ error: Error | null }>)({
        authCode: code,
        codeVerifier,
      }));
    } else {
      ({ error: exchangeError } = await supabase.auth.exchangeCodeForSession(code));
    }

    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError);
      return NextResponse.redirect(
        new URL(`/auth-code-error?error=${exchangeError.name}&description=${exchangeError.message}`, requestUrl.origin)
      );
    }

    // AUTH-1 (docs/audits/2026-08-22-launch-readiness-round4.md): an OAuth
    // signup (Apple/Google/Facebook) never gets a chance to pick their own
    // username — signInWithOAuth has no user-metadata option, so the DB
    // trigger falls back to the email local-part, and that becomes their
    // permanent public /[username] URL with no claim step anywhere in the
    // flow. Detect that still-default username here (the one place every
    // OAuth sign-in passes through) and route to /profile/setup — which
    // already has a full username-claim UI (availability check, validation)
    // but had zero call sites — before continuing to `next`.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      const { data: profileRow } = await supabase
        .from('profiles_self')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();
      const emailLocalPart = user.email.split('@')[0];
      if (profileRow?.username && profileRow.username === emailLocalPart) {
        const claimUrl = new URL('/profile/setup', requestUrl.origin);
        claimUrl.searchParams.set('next', next);
        const claimResponse = NextResponse.redirect(claimUrl);
        // Carry the session cookies exchangeCodeForSession just set on
        // `response` over to this redirect instead, preserving every
        // attribute (domain/path/secure/httpOnly/sameSite) so the browser
        // arrives at /profile/setup already signed in.
        response.cookies.getAll().forEach((cookie) => {
          claimResponse.cookies.set(cookie);
        });
        return claimResponse;
      }
    }

    // Successful authentication - redirect to intended destination
    return response;
  }

  // No code, token, or error - redirect to home
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}

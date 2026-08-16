/**
 * /auth/confirm — server-side email OTP verification (token_hash flow).
 *
 * Recovery (and other) emails link here with ?token_hash=...&type=recovery&next=/auth/reset-password.
 * We verify the token_hash server-side via verifyOtp, which works in ANY browser or
 * device (no PKCE code_verifier required), then set the session cookies and redirect
 * to `next`. This is the Supabase-recommended pattern for password recovery links,
 * which are frequently opened in a different browser than the one that requested them.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { sanitizeNextPath } from '@/utils/sanitizeNextPath';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null;
  const rawNext = requestUrl.searchParams.get('next') ?? (type === 'recovery' ? '/auth/reset-password' : '/');
  // Only allow same-origin relative paths — `next` comes from the URL and must not redirect off-site.
  const next = sanitizeNextPath(rawNext);

  if (!token_hash || !type) {
    return NextResponse.redirect(
      new URL('/auth-code-error?error=missing_params&description=The confirmation link is incomplete. Please use the link from your email.', requestUrl.origin)
    );
  }

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

  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (!error) {
    // Session cookies are set on the response — the user lands on `next` signed in.
    return response;
  }

  console.error('Error verifying recovery token:', error);

  // AuthApiError carries a machine-readable code (e.g. "otp_expired").
  const errorCode = (error as { code?: string }).code ?? error.name;

  if (type === 'recovery') {
    // Send recovery failures to the reset page, which renders a friendly
    // "link expired — request a new one" state.
    const redirectUrl = new URL('/auth/reset-password', requestUrl.origin);
    redirectUrl.searchParams.set('error', 'access_denied');
    redirectUrl.searchParams.set('error_code', errorCode);
    redirectUrl.searchParams.set('error_description', error.message);
    return NextResponse.redirect(redirectUrl);
  }

  // Everything else (most importantly `signup` — the standard email-confirmation
  // link) lands on the generic error page. Thread `type` through so that page can
  // offer a targeted recovery action (e.g. resending a signup confirmation email)
  // instead of a dead end.
  const errorRedirectUrl = new URL('/auth-code-error', requestUrl.origin);
  errorRedirectUrl.searchParams.set('error', errorCode);
  errorRedirectUrl.searchParams.set('description', error.message);
  errorRedirectUrl.searchParams.set('type', type);
  return NextResponse.redirect(errorRedirectUrl);
}

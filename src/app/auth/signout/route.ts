import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Database } from "@/types/supabase";

function expireCookie(response: NextResponse, name: string) {
  response.cookies.set(name, "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function POST() {
  const cookieStore = await cookies();
  const response = NextResponse.json({ ok: true });

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

  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.warn("server signOut failed; expiring auth cookies anyway", error);
  }

  for (const cookie of cookieStore.getAll()) {
    const name = cookie.name.toLowerCase();
    if (
      name.startsWith("sb-") &&
      (name.includes("auth-token") ||
        name.includes("access-token") ||
        name.includes("refresh-token") ||
        name.includes("code-verifier"))
    ) {
      expireCookie(response, cookie.name);
    }
  }

  return response;
}

import './globals.css';
import { Inter, Unbounded } from 'next/font/google';
import { Providers } from './providers';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import HeaderNav from '@/components/layout/HeaderNav';
import Footer from '@/components/layout/Footer';
import { NetflixGlow } from '@/components/ui/NetflixGlow';
import MobileTabBar from '@/components/layout/MobileTabBar';
import type { User } from '@supabase/supabase-js';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const unbounded = Unbounded({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-unbounded',
  display: 'swap',
});

export const metadata = {
  title: 'ReAwarding',
  description: 'The ultimate community for ranking, noting and awarding the best movies... according to you.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
            // Ignore cookie setting errors in server components
          }
        },
      },
    }
  );
  let user: User | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error) {
      user = data.user ?? null;
    }
  } catch (error) {
    // Invalid or stale refresh tokens should fail closed to "signed out"
    // instead of crashing the root layout render.
    console.warn("RootLayout auth.getUser failed; continuing as signed out", error);
    user = null;
  }

  return (
    <html lang="en" className={`${inter.variable} ${unbounded.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Set initial theme immediately - default to dark
              const theme = localStorage.getItem('theme');
              if (theme === 'light') {
                document.documentElement.classList.remove('dark');
              } else {
                // Default to dark mode
                document.documentElement.classList.add('dark');
                if (!theme) {
                  localStorage.setItem('theme', 'dark');
                }
              }
            `
          }}
        />
        <link rel="preconnect" href="https://image.tmdb.org" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://assets.fanart.tv" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300 font-sans">
        <NetflixGlow />
        <Providers initialUser={user}>
          <div className="relative z-10 min-h-screen flex flex-col">
            <HeaderNav />
            <main className="flex-1 pt-20 pb-24 md:pb-8 px-10 sm:px-6 max-w-screen-xl mx-auto w-full">
              {children}
            </main>
            {/* Mobile bottom navigation */}
            <MobileTabBar />
            {/* Hide footer on small screens to avoid overlap with tab bar */}
            <div className="hidden md:block">
              <Footer />
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}

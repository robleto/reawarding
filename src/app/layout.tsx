import './globals.css';
import { Providers } from './providers';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import HeaderNav from '@/components/layout/HeaderNav';
import Footer from '@/components/layout/Footer';
import { ScrollGlow } from '@/components/ui/ScrollGlow';
import { NetflixGlow } from '@/components/ui/NetflixGlow';

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
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en">
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
      </head>
      <body className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <NetflixGlow />
        <ScrollGlow />
        <Providers initialSession={session}>
          <div className="relative z-10">
            <HeaderNav />
            <main className="flex-1 pt-20">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}

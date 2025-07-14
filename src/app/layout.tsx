import './globals.css';
import { Providers } from './providers';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import HeaderNav from '@/components/layout/HeaderNav';
import Footer from '@/components/layout/Footer';
import { NetflixGlow } from '@/components/ui/NetflixGlow';
import { Inter, Unbounded } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
const unbounded = Unbounded({ 
  subsets: ['latin'],
  variable: '--font-unbounded',
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
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  return (
    <html lang="en" suppressHydrationWarning>
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
      <body className={`min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300 ${inter.className} ${unbounded.variable}`}>
        <NetflixGlow />
        <Providers initialUser={user}>
          <div className="relative z-10">
            <HeaderNav />
            <main className="flex-1 pt-8 pb-8 px-0 sm:px-6 lg:px-0 max-w-screen-xl mx-auto">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
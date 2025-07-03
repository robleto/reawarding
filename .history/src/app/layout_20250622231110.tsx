import './globals.css';
@import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@600&display=swap');
import { Providers } from './providers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import HeaderNav from '@/components/layout/HeaderNav';
import Footer from '@/components/layout/Footer';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en">
      <body>
        <Providers initialSession={session}>
        <HeaderNav />
          {children}
        <Footer />
        </Providers>
      </body>
    </html>
  );
}

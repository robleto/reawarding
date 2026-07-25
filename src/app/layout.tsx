import './globals.css';
import { Providers } from './providers';
import { NetflixGlow } from '@/components/ui/NetflixGlow';
import AppShell from '@/components/layout/AppShell';
import type { Viewport } from 'next';

export const metadata = {
  title: 'Reawarding',
  description: 'Reawarding lets you rewrite film award history based on what you actually watched and how films aged over time.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Reawarding',
  },
};

// viewportFit: 'cover' is required for env(safe-area-inset-*) to be non-zero
// on notched devices (AppShell, MobileTabBar, and fixed bars depend on it).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0C0A08',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Unbounded:wght@400;600;700;800&family=Spline+Sans+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
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
      {/* Dark-only canvas (per .impeccable.md). TODO: token — add charcoal-950 to tailwind.config.js so bg-gray-950 here can become bg-charcoal-950 and complete the token system. */}
      <body className="min-h-screen flex flex-col bg-gray-950 text-gray-100 font-sans">
        <NetflixGlow />
        <Providers>
          <AppShell>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}

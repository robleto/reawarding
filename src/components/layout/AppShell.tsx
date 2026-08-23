'use client';

import { usePathname } from 'next/navigation';
import HeaderNav from '@/components/layout/HeaderNav';
import Footer from '@/components/layout/Footer';
import MobileTabBar from '@/components/layout/MobileTabBar';
import BackToTopButton from '@/components/ui/BackToTopButton';
import { useAuthState } from '@/hooks/useAuthState';

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Marketing routes that render bare — no nav, no tab bar, no footer.
 *
 * These are the landing-test pages (docs/validation/landing-page-test.md).
 * They're measuring whether a promise converts, so any app chrome around them
 * turns the test into a test of the app. A route group can't help here: nested
 * layouts always wrap in the root layout, which mounts this shell, so the
 * bypass has to live in the shell itself.
 */
const BARE_ROUTES = ['/oscar-tracker', '/your-awards'];

export default function AppShell({ children }: AppShellProps) {
  const { isAuthenticated } = useAuthState();
  const pathname = usePathname();

  if (pathname && BARE_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    // overflow-x-hidden as a permanent safety net: nothing on any page should
    // legitimately need the whole document to scroll horizontally — anything
    // wide (video rows, backdrop galleries, etc.) is already meant to be
    // self-contained via its own overflow-x-auto. This clips any component's
    // stray bleed (e.g. a full-bleed row's negative-margin trick not exactly
    // canceling its container's padding) before it can widen the page itself.
    <div className="relative z-10 min-h-screen flex flex-col overflow-x-hidden">
      <HeaderNav />
      {/* HeaderNav is `sticky`, not `fixed` — it reserves its own height in
          the document flow, so main no longer needs to guess that height for
          clearance (that guess drifted out of sync three separate times).
          This padding is pure breathing room, nothing more. */}
      <main className={`flex-1 flex flex-col pt-4 px-4 sm:px-6 w-full max-w-screen-xl mx-auto ${isAuthenticated ? 'pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8' : 'pb-8'}`}>
        {children}
      </main>
      {isAuthenticated && <MobileTabBar />}
      <BackToTopButton
        className={
          isAuthenticated
            ? 'bottom-[calc(6rem+env(safe-area-inset-bottom)+12px)] right-4 md:bottom-6 md:right-6'
            : 'bottom-6 right-4 md:right-6'
        }
      />
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}

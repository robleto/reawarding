'use client';

import HeaderNav from '@/components/layout/HeaderNav';
import Footer from '@/components/layout/Footer';
import MobileTabBar from '@/components/layout/MobileTabBar';
import { useAuthState } from '@/hooks/useAuthState';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { isAuthenticated } = useAuthState();

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <HeaderNav />
      <main className={`flex-1 flex flex-col pt-[calc(5rem+env(safe-area-inset-top))] px-4 sm:px-6 w-full max-w-screen-xl mx-auto ${isAuthenticated ? 'pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8' : 'pb-8'}`}>
        {children}
      </main>
      {isAuthenticated && <MobileTabBar />}
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}

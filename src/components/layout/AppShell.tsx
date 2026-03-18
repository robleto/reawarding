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
      <main className={`flex-1 pt-20 px-10 sm:px-6 max-w-screen-xl mx-auto w-full ${isAuthenticated ? 'pb-24 md:pb-8' : 'pb-8'}`}>
        {children}
      </main>
      {isAuthenticated && <MobileTabBar />}
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}

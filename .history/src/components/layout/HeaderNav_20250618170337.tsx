'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { UserMenu } from '@/components/layout/UserMenu';

export default function HeaderNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Best Picture', href: '/', match: '/' },
    { label: 'Rankings', href: '/rankings', match: '/rankings' },
    { label: 'Films', href: '/#films', match: '/films' },
    { label: 'Lists', href: '/#lists', match: '/lists' },
  ];

  return (
    <header className="w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-end justify-between relative z-10">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 bg-[url('https://codia-f2c.s3.us-west-1.amazonaws.com/image/2025-06-13/BRZJ6TA6f6.png')] bg-contain bg-no-repeat"
            aria-hidden="true"
          />
          <h1 className="text-2xl font-bold text-[#1c3728] font-inter tracking-tight">
            OscarWorthy
          </h1>
        </div>

        {/* Navigation */}
        <nav className="hidden md:block">
          <ul className="flex items-end gap-10 text-lg font-semibold font-inter">
            {navItems.map((item) => {
              const isActive =
                pathname === item.match ||
                (item.match === '/' && pathname === '');

              return (
                <li key={item.href} className="relative pb-2">
                  <a
                    href={item.href}
                    className={`relative ${
  isActive
    ? "text-[#ba7a00] after:content-[''] after:absolute after:top-[calc(100%+12px)] after:left-1/2 after:-translate-x-1/2 after:border-l-[12px] after:border-r-[12px] after:border-b-[12px] after:border-l-transparent after:border-r-transparent after:border-b-[#ba7a00] after:border-t-0"
    : "text-black"
} hover:underline`}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Right-side icon */}
        <div className="flex items-center gap-4">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

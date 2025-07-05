'use client';

import { useState, useEffect } from 'react';

export function DarkModeDebug() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateDarkMode = () => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    };

    updateDarkMode();
    
    // Listen for changes to the document classes
    const observer = new MutationObserver(() => {
      updateDarkMode();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-lg">
      <h3 className="font-bold text-sm mb-2">Dark Mode Debug</h3>
      <div className="text-xs space-y-1">
        <p>Current mode: <span className="font-mono">{isDark ? 'DARK' : 'LIGHT'}</span></p>
        <p>HTML class: <span className="font-mono">{isDark ? 'dark' : 'no-dark'}</span></p>
        <p>Theme in localStorage: <span className="font-mono">{typeof window !== 'undefined' ? localStorage.getItem('theme') || 'none' : 'SSR'}</span></p>
        <div className="mt-2 w-4 h-4 bg-blue-500 dark:bg-yellow-500 rounded"></div>
        <p className="text-xs">Color should be: {isDark ? 'yellow' : 'blue'}</p>
      </div>
    </div>
  );
}

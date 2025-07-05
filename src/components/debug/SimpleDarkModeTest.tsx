'use client';

import { useState, useEffect } from 'react';

export function SimpleDarkModeTest() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check if dark class is present
    const checkDarkMode = () => {
      const hasDarkClass = document.documentElement.classList.contains('dark');
      setIsDark(hasDarkClass);
    };

    checkDarkMode();
    
    // Set up observer to watch for changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="p-4 m-4 border-2 border-red-500">
      <h2 className="text-xl font-bold mb-4">Simple Dark Mode Test</h2>
      <p>Dark class detected: {isDark ? 'YES' : 'NO'}</p>
      
      {/* Basic color test */}
      <div className="mt-4 p-2 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
        This should be light blue in light mode, dark blue in dark mode
      </div>
      
      {/* Background test */}
      <div className="mt-4 p-2 bg-white dark:bg-gray-900 text-black dark:text-white border border-gray-300 dark:border-gray-700">
        This should be white/black in light mode, gray/white in dark mode
      </div>
      
      <button 
        onClick={toggleDark}
        className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Toggle Dark Mode Manually
      </button>
    </div>
  );
}

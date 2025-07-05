'use client';

import { useEffect, useState } from 'react';

export function DarkModeTest() {
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    // Test dark mode functionality
    const testDarkMode = () => {
      const html = document.documentElement;
      const currentClasses = html.classList.toString();
      setTestResult(`Current HTML classes: ${currentClasses}`);
      
      // Test adding/removing dark class
      html.classList.add('dark');
      setTimeout(() => {
        const darkAdded = html.classList.contains('dark');
        setTestResult(prev => `${prev}\nDark class added: ${darkAdded}`);
        
        html.classList.remove('dark');
        setTimeout(() => {
          const darkRemoved = !html.classList.contains('dark');
          setTestResult(prev => `${prev}\nDark class removed: ${darkRemoved}`);
        }, 100);
      }, 100);
    };

    testDarkMode();
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-lg max-w-xs">
      <h3 className="font-bold text-sm mb-2">Dark Mode Test</h3>
      <div className="text-xs whitespace-pre-wrap">
        {testResult}
      </div>
      <button
        onClick={() => {
          document.documentElement.classList.toggle('dark');
          console.log('Toggled dark mode manually');
        }}
        className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs"
      >
        Manual Toggle
      </button>
    </div>
  );
}

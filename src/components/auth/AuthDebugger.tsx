// Auth Debug Component
// Add this temporarily to your page to test auth functions

"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabaseBrowser';

export function AuthDebugger() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test: string, result: any) => {
    setResults(prev => [...prev, { test, result, timestamp: new Date().toISOString() }]);
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      // Test 1: Check Supabase connection
      const { data, error } = await supabase.auth.getSession();
      addResult('Get Session', { data, error });

      // Test 2: Check if environment variables are loaded
      addResult('Environment Check', {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      });

      // Test 3: Test sign up with a unique email
      const testEmail = `test-${Date.now()}@gmail.com`;
      const signUpResult = await supabase.auth.signUp({
        email: testEmail,
        password: 'testpassword123',
      });
      addResult('Sign Up Test', { 
        email: testEmail, 
        result: signUpResult,
        userExists: !!signUpResult.data?.user,
        confirmationRequired: !signUpResult.data?.user?.email_confirmed_at
      });

      // Test 4: If signup worked, try signing in
      if (signUpResult.data?.user && signUpResult.data.user.email_confirmed_at) {
        const signInResult = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: 'testpassword123',
        });
        addResult('Auto Sign In Test', signInResult);
      }

    } catch (err) {
      addResult('Error', err);
    } finally {
      setLoading(false);
    }
  };

  const testSignIn = async () => {
    setLoading(true);
    try {
      const signInResult = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'testpassword123',
      });
      addResult('Sign In Test', signInResult);
    } catch (err) {
      addResult('Sign In Error', err);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => setResults([]);

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 max-w-md max-h-96 overflow-y-auto shadow-lg z-50">
      <h3 className="font-bold mb-2">Auth Debugger</h3>
      <div className="space-y-2 mb-4">
        <button 
          onClick={testConnection}
          disabled={loading}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
        >
          Test Connection & Sign Up
        </button>
        <button 
          onClick={testSignIn}
          disabled={loading}
          className="bg-green-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50 ml-2"
        >
          Test Sign In
        </button>
        <button 
          onClick={clearResults}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm ml-2"
        >
          Clear
        </button>
      </div>
      
      <div className="space-y-2 text-xs">
        {results.map((result, i) => (
          <div key={i} className="border-b border-gray-200 dark:border-gray-600 pb-2">
            <div className="font-semibold">{result.test}</div>
            <pre className="text-xs overflow-x-auto bg-gray-100 dark:bg-gray-700 p-1 rounded">
              {JSON.stringify(result.result, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}

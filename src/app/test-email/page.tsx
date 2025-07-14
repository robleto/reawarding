"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

export default function EmailTestPage() {
  const [email, setEmail] = useState("greg@robleto.com");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counter, setCounter] = useState(1);

  // Add a note about testing requirements
  const [testNotes] = useState([
    "Confirmation Resend: Works for existing unconfirmed users",
    "Password Reset: Only works for confirmed users", 
    "New Signup: Requires a unique email address",
    "Rate Limiting: Use unique emails and wait between tests"
  ]);

  // Generate unique email for testing
  const generateUniqueEmail = () => {
    const timestamp = Date.now();
    return `test-${timestamp}@example.com`;
  };

  const testConfirmationResend = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/rankings`,
        },
      });

      if (error) {
        setError(`Error: ${error.message}`);
      } else {
        setResult(`Success! Resend response: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const testPasswordReset = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(`Error: ${error.message}\nCode: ${error.status || 'N/A'}\nDetails: ${JSON.stringify(error, null, 2)}`);
      } else {
        setResult(`Success! Reset response: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const testNewSignup = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    // Generate a unique email to avoid conflicts
    const testEmail = generateUniqueEmail();
    setResult(`Testing with: ${testEmail}`);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: 'testpassword123',
        options: {
          emailRedirectTo: `${window.location.origin}/rankings`,
        },
      });

      if (error) {
        setError(`Error: ${error.message}\nCode: ${error.status || 'N/A'}\nDetails: ${JSON.stringify(error, null, 2)}`);
      } else {
        setResult(`Success! New signup for ${testEmail}: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Email Testing Dashboard</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter email to test"
            />
          </div>

          <div className="space-y-4">
            <button
              onClick={testConfirmationResend}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Testing..." : "Test Confirmation Email Resend"}
            </button>

            <button
              onClick={testPasswordReset}
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Testing..." : "Test Password Reset Email"}
            </button>

            <button
              onClick={testNewSignup}
              disabled={loading}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Testing..." : "Test New Signup Email"}
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="text-green-800 font-medium mb-2">Success Result:</h3>
            <pre className="text-sm text-green-700 whitespace-pre-wrap">{result}</pre>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-medium mb-2">Error Result:</h3>
            <pre className="text-sm text-red-700 whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-blue-800 font-medium mb-2">📧 Check Email Capture:</h3>
          <p className="text-sm text-blue-700 mb-3">
            Emails are captured by Inbucket during local development. Check the link below to see all emails:
          </p>
          <a 
            href="http://127.0.0.1:54324" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Open Inbucket Email Viewer
          </a>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <h3 className="text-yellow-800 font-medium mb-2">📝 Test Requirements:</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            {testNotes.map((note, index) => (
              <li key={index}>• {note}</li>
            ))}
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-yellow-800 font-medium mb-2">🔍 Debugging Checklist:</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Check Inbucket at http://127.0.0.1:54324 for captured emails</li>
            <li>• Wait 5-10 seconds between email tests to avoid rate limiting</li>
            <li>• Use unique email addresses for signup tests</li>
            <li>• Check Supabase Auth Logs after testing</li>
            <li>• Try with a different email provider (Gmail, etc.)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Bug, MessageSquare, AlertTriangle, TrendingUp } from 'lucide-react';

interface ErrorLog {
  id: string;
  created_at: string;
  error_message: string;
  error_type: string;
  component_name: string;
  url: string;
  user_id: string | null;
}

interface Feedback {
  id: string;
  created_at: string;
  title: string;
  description: string;
  feedback_type: string;
  status: string;
  priority: string;
  user_id: string | null;
}

export default function TelemetryDashboard() {
  const [recentErrors, setRecentErrors] = useState<ErrorLog[]>([]);
  const [recentFeedback, setRecentFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'errors' | 'feedback'>('errors');

  useEffect(() => {
    loadTelemetryData();
  }, []);

  async function loadTelemetryData() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/telemetry', { cache: 'no-store' });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load telemetry data');
      }

      setRecentErrors(payload.recentErrors ?? []);
      setRecentFeedback(payload.recentFeedback ?? []);
    } catch (error) {
      console.error('Error loading telemetry data:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-400 bg-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'low': return 'text-gray-400 bg-gray-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading telemetry data...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-unbounded font-semibold text-yellow-400 mb-2">
          Telemetry Dashboard
        </h1>
        <p className="text-gray-400">
          Monitor error logs and user feedback from the friend beta
        </p>
        <p className="text-sm text-gray-500 mt-2">
          For detailed analysis, use SQL queries in the Supabase dashboard. See{' '}
          <a href="/docs/telemetry-triage-guide.md" className="text-yellow-400 hover:text-yellow-300">
            telemetry-triage-guide.md
          </a>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('errors')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'errors'
              ? 'text-yellow-400 border-b-2 border-yellow-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4" />
            <span>Recent Errors</span>
            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">{recentErrors.length}</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'feedback'
              ? 'text-yellow-400 border-b-2 border-yellow-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span>User Feedback</span>
            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">{recentFeedback.length}</span>
          </div>
        </button>
      </div>

      {/* Recent Errors Tab */}
      {activeTab === 'errors' && (
        <div className="space-y-4">
          {recentErrors.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No errors logged yet
            </div>
          ) : (
            recentErrors.map((error) => (
              <div
                key={error.id}
                className="bg-gray-900/60 border border-red-500/20 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-sm font-mono text-red-400">{error.error_type}</span>
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(error.created_at)}</span>
                </div>
                <p className="text-gray-200 mb-2">{error.error_message}</p>
                <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                  {error.component_name && (
                    <span className="bg-gray-800 px-2 py-1 rounded">
                      Component: {error.component_name}
                    </span>
                  )}
                  {error.user_id && (
                    <span className="bg-gray-800 px-2 py-1 rounded">
                      User: {error.user_id.substring(0, 8)}...
                    </span>
                  )}
                  {error.url && (
                    <span className="bg-gray-800 px-2 py-1 rounded truncate max-w-md">
                      URL: {error.url}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* User Feedback Tab */}
      {activeTab === 'feedback' && (
        <div className="space-y-4">
          {recentFeedback.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No feedback submitted yet
            </div>
          ) : (
            recentFeedback.map((feedback) => (
              <div
                key={feedback.id}
                className="bg-gray-900/60 border border-yellow-500/20 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-yellow-400 capitalize">
                      {feedback.feedback_type}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(feedback.priority)}`}>
                      {feedback.priority}
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                      {feedback.status}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(feedback.created_at)}</span>
                </div>
                <h3 className="text-gray-200 font-medium mb-1">{feedback.title}</h3>
                <p className="text-sm text-gray-400 mb-2">{feedback.description}</p>
                <div className="text-xs text-gray-400">
                  User: {feedback.user_id ? `${feedback.user_id.substring(0, 8)}...` : 'Guest'}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-8 text-center">
        <button
          onClick={loadTelemetryData}
          className="px-6 py-2 bg-yellow-500/20 border border-yellow-500/40 rounded-lg text-yellow-400 hover:bg-yellow-500/30 transition-colors"
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
}

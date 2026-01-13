'use client';

import Link from 'next/link';
import { Film, Settings, Users, BarChart3, MessageSquare } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-charcoal-900">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold font-unbounded text-white mb-3">
            Admin Dashboard
          </h1>
          <p className="text-gray-400 text-lg">
            Manage collections, users, and site settings
          </p>
        </div>

        {/* Admin Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Collections Management */}
          <Link
            href="/admin/collections"
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-gold-500/10 to-gold-600/5 border border-gold-500/20 p-8 hover:border-gold-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-gold-500/10"
          >
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-lg bg-gold-500/20 flex items-center justify-center mb-4 group-hover:bg-gold-500/30 transition-colors">
                <Film className="w-7 h-7 text-gold-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Film Collections
              </h3>
              <p className="text-gray-400 text-sm">
                Add, edit, and manage curated film collections
              </p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-gold-500/0 to-gold-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>

          {/* User Management - Coming Soon */}
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-500/10 to-gray-600/5 border border-gray-500/20 p-8 opacity-60 cursor-not-allowed">
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-lg bg-gray-500/20 flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                User Management
              </h3>
              <p className="text-gray-400 text-sm">
                Coming soon: Manage users and permissions
              </p>
            </div>
          </div>

          {/* Site Settings - Coming Soon */}
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-500/10 to-gray-600/5 border border-gray-500/20 p-8 opacity-60 cursor-not-allowed">
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-lg bg-gray-500/20 flex items-center justify-center mb-4">
                <Settings className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Site Settings
              </h3>
              <p className="text-gray-400 text-sm">
                Coming soon: Configure site-wide settings
              </p>
            </div>
          </div>

          {/* Analytics - Coming Soon */}
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-500/10 to-gray-600/5 border border-gray-500/20 p-8 opacity-60 cursor-not-allowed">
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-lg bg-gray-500/20 flex items-center justify-center mb-4">
                <BarChart3 className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Analytics
              </h3>
              <p className="text-gray-400 text-sm">
                Coming soon: View site usage and statistics
              </p>
            </div>
          </div>

          {/* Telemetry & Feedback */}
          <Link
            href="/admin/telemetry"
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 p-8 hover:border-blue-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
          >
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
                <MessageSquare className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Telemetry & Feedback
              </h3>
              <p className="text-gray-400 text-sm">
                View error logs and user feedback from beta testers
              </p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-charcoal-800/50 border border-gray-700/50 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-1">Active Collections</p>
            <p className="text-3xl font-bold text-white">27</p>
          </div>
          <div className="bg-charcoal-800/50 border border-gray-700/50 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-1">Total Films</p>
            <p className="text-3xl font-bold text-white">~600</p>
          </div>
          <div className="bg-charcoal-800/50 border border-gray-700/50 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-1">Total Users</p>
            <p className="text-3xl font-bold text-white">—</p>
          </div>
        </div>
      </div>
    </div>
  );
}

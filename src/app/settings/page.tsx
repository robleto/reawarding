"use client";

import { useState, useEffect } from "react";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import { 
  Moon, 
  Sun, 
  Monitor, 
  Bell, 
  Shield, 
  Trash2, 
  AlertTriangle,
  Save,
  Mail,
  Lock
} from "lucide-react";
import type { Database } from "@/types/supabase";

export default function SettingsPage() {
  const user = useUser();
  const supabase = useSupabaseClient<Database>();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Settings state
  const [settings, setSettings] = useState({
    theme: "system" as "light" | "dark" | "system",
    emailNotifications: true,
    marketingEmails: true,
    dataCollection: true
  });
  
  // Delete account confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }
    
    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | "system" || "system";
    // Load other saved preferences if present; otherwise keep defaults
    const savedEmail = localStorage.getItem("emailNotifications");
    const savedMkt = localStorage.getItem("marketingEmails");
    const savedData = localStorage.getItem("dataCollection");
    setSettings(prev => ({
      ...prev,
      theme: savedTheme,
      emailNotifications: savedEmail !== null ? savedEmail === "true" : prev.emailNotifications,
      marketingEmails: savedMkt !== null ? savedMkt === "true" : prev.marketingEmails,
      dataCollection: savedData !== null ? savedData === "true" : prev.dataCollection,
    }));
  }, [user, router]);

  const handleThemeChange = (theme: "light" | "dark" | "system") => {
    setSettings(prev => ({ ...prev, theme }));
    localStorage.setItem("theme", theme);
    
    // Apply theme immediately
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.remove("dark");
    } else if (theme === "dark") {
      root.classList.add("dark");
    } else {
      // System theme
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // In a real app, you'd save these settings to the database
      // For now, we'll just save to localStorage
      localStorage.setItem("emailNotifications", settings.emailNotifications.toString());
      localStorage.setItem("marketingEmails", settings.marketingEmails.toString());
      localStorage.setItem("dataCollection", settings.dataCollection.toString());
      
      setSuccess("Settings saved successfully!");
    } catch (err) {
      console.error("Error saving settings:", err);
      setError("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      setError("Please type 'DELETE' to confirm");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Delete user account
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user!.id);
      
      if (deleteError) {
        throw deleteError;
      }

      // Sign out and redirect
      await supabase.auth.signOut();
      router.push("/");
    } catch (err) {
      console.error("Error deleting account:", err);
      setError("Failed to delete account. Please contact support.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Customize your experience and manage your account preferences.
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-700 dark:text-green-400 text-sm">{success}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Appearance Settings */}
  <div className="light-glass dark:dark-glass rounded-xl shadow-lg p-6 border border-gray-300/40 dark:border-gray-600/50">
          <div className="flex items-center gap-3 mb-6">
            <Monitor className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Appearance</h2>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Theme Preference
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleThemeChange("light")}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                  settings.theme === "light"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                <Sun className="w-5 h-5" />
                Light
              </button>
              <button
                onClick={() => handleThemeChange("dark")}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                  settings.theme === "dark"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                <Moon className="w-5 h-5" />
                Dark
              </button>
              <button
                onClick={() => handleThemeChange("system")}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                  settings.theme === "system"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                <Monitor className="w-5 h-5" />
                System
              </button>
            </div>
          </div>
        </div>

        {/* Notifications Settings */}
  <div className="light-glass dark:dark-glass rounded-xl shadow-lg p-6 border border-gray-300/40 dark:border-gray-600/50">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notifications</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Email Notifications</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive notifications about your rankings and awards
                </p>
              </div>
              <button
                onClick={() => setSettings(prev => ({ ...prev, emailNotifications: !prev.emailNotifications }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.emailNotifications ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.emailNotifications ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Marketing Emails</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive updates about new features and promotions
                </p>
              </div>
              <button
                onClick={() => setSettings(prev => ({ ...prev, marketingEmails: !prev.marketingEmails }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.marketingEmails ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.marketingEmails ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
  <div className="light-glass dark:dark-glass rounded-xl shadow-lg p-6 border border-gray-300/40 dark:border-gray-600/50">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Privacy</h2>
          </div>
          
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Data Collection</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Allow anonymous usage analytics to help improve the service
                </p>
              </div>
              <button
                onClick={() => setSettings(prev => ({ ...prev, dataCollection: !prev.dataCollection }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.dataCollection ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.dataCollection ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Account Management */}
  <div className="light-glass dark:dark-glass rounded-xl shadow-lg p-6 border border-gray-300/40 dark:border-gray-600/50">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Account</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Email Address</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
              </div>
              {/* Email change not supported */}
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            <Save className="w-4 h-4" />
            {loading ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="light-glass dark:dark-glass border border-gray-300/40 dark:border-gray-600/50 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Account</h3>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This action cannot be undone. This will permanently delete your account and all associated data.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type <strong>DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                  setError(null);
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={loading || deleteConfirmText !== "DELETE"}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

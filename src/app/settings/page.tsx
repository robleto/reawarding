"use client";

import { useState, useEffect, useCallback } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import { LogOut, Mail, Upload, Lock, Eye, EyeOff, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Database } from "@/types/supabase";
import { signOutEverywhere } from "@/utils/signOut";
import { useAuthState } from "@/hooks/useAuthState";
import { isNativeApp } from "@/lib/platform";
import UserAvatar from "@/components/ui/UserAvatar";
import StatsSummary from "@/components/stats/StatsSummary";
import BuildInfo from "@/components/settings/BuildInfo";

interface Profile {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  preferred_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  stripe_customer_id: string | null;
}

const ENTITLED_STATUSES = new Set(["active", "trialing"]);

export default function SettingsPage() {
  const { user, status: authStatus } = useAuthState();
  const supabase = useSupabaseClient<Database>();
  const router = useRouter();

  const [signOutLoading, setSignOutLoading] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Profile section
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  const [editForm, setEditForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    preferred_name: "",
    bio: "",
    avatar_url: "",
  });

  const [nameBuilder, setNameBuilder] = useState({
    title: "",
    useFirstName: true,
    useLastName: false,
    useUsername: false,
    customNickname: "",
  });

  // Premium/billing section
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  // Password section
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setProfile(data as Profile);
        setEditForm({
          username: data.username || "",
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          preferred_name: data.preferred_name || "",
          bio: data.bio || "",
          avatar_url: data.avatar_url || "",
        });

        if (data.preferred_name) {
          setNameBuilder({
            title: "",
            useFirstName: data.preferred_name === data.first_name,
            useLastName: false,
            useUsername: data.preferred_name === data.username,
            customNickname:
              data.preferred_name !== data.first_name && data.preferred_name !== data.username
                ? data.preferred_name
                : "",
          });
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setProfileError("Failed to load profile");
    } finally {
      setProfileLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (!user) {
      router.replace("/");
      return;
    }

    fetchProfile();
  }, [user, router, fetchProfile]);

  const buildPreferredName = () => {
    const parts: string[] = [];

    if (nameBuilder.title) {
      parts.push(nameBuilder.title);
    }

    if (nameBuilder.customNickname) {
      return parts.concat(nameBuilder.customNickname).join(" ").trim();
    }

    if (nameBuilder.useFirstName && editForm.first_name) {
      parts.push(editForm.first_name);
    }

    if (nameBuilder.useLastName && editForm.last_name) {
      parts.push(editForm.last_name);
    }

    if (nameBuilder.useUsername && editForm.username) {
      return parts.concat(editForm.username).join(" ").trim();
    }

    return parts.join(" ").trim() || editForm.first_name || editForm.username;
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);

    try {
      const preferredName = buildPreferredName();

      const { data, error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          username: editForm.username.trim(),
          first_name: editForm.first_name.trim() || null,
          last_name: editForm.last_name.trim() || null,
          preferred_name: preferredName || null,
          bio: editForm.bio.trim() || null,
          avatar_url: editForm.avatar_url.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setProfile(data as Profile);
      setProfileSaved(true);
    } catch (err) {
      console.error("Error saving profile:", err);
      setProfileError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!newPassword || !confirmPassword) {
      setPasswordError("Please fill in both password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const isPremium = Boolean(
    profile?.subscription_status && ENTITLED_STATUSES.has(profile.subscription_status)
  );
  const isNative = isNativeApp();

  const handleManageBilling = async () => {
    setBillingLoading(true);
    setBillingError(null);
    try {
      // Route to the Billing Portal whenever a Stripe customer already
      // exists, regardless of current subscription_status — a past_due or
      // unpaid subscriber still has a live subscription (and stripe_customer_id)
      // even though isPremium is false, and sending them to Checkout instead
      // would create a duplicate concurrent subscription (audit PAY-2).
      const endpoint = Boolean(profile?.stripe_customer_id)
        ? "/api/stripe/portal"
        : "/api/stripe/checkout";
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setBillingError(data.error ?? "Something went wrong");
        setBillingLoading(false);
      }
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : "Something went wrong");
      setBillingLoading(false);
    }
  };

  const handleSignOut = async () => {
    setSignOutLoading(true);
    setSignOutError(null);

    try {
      await signOutEverywhere(supabase);
      router.replace("/");
      router.refresh();
      return;
    } catch {
      setSignOutError("Failed to sign out. Please try again.");
      setSignOutLoading(false);
      return;
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete account");
      }
      await signOutEverywhere(supabase);
      router.replace("/");
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account");
      setDeleteLoading(false);
    }
  };

  if (authStatus === "loading" || !user) return null;

  const avatarUrl = editForm.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-300">Manage your profile, account, and library.</p>
      </div>

      {/* Stats — moved here when /profile became a redirect to /settings */}
      <div className="mb-6">
        <StatsSummary />
      </div>

      {/* Profile */}
      <div className="dark-glass rounded-xl shadow-lg p-6 mb-6 border border-gray-600/50">
        <h2 className="text-xl font-semibold text-white mb-6">Profile</h2>

        {profileError && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-800 rounded-lg">
            <p className="text-red-400 text-sm">{profileError}</p>
          </div>
        )}

        {profileLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-400"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <UserAvatar
                imageUrl={avatarUrl}
                name={editForm.preferred_name || editForm.first_name || editForm.username}
                username={editForm.username || user.email?.split("@")[0]}
                size={72}
                alt="Profile picture"
                className="border-4 border-gray-600"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">Avatar URL</label>
                <input
                  type="url"
                  value={editForm.avatar_url}
                  onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-600 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
                  placeholder="https://example.com/your-avatar.jpg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
              <input
                type="text"
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
                placeholder="Enter your username"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
                <input
                  type="text"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
                  placeholder="Enter your first name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
                <input
                  type="text"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
              />
            </div>

            {/* Call Me / Preferred Name Builder */}
            <div className="border-t border-gray-700 pt-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Call Me (How you&apos;ll be greeted)
              </label>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Title (optional)</label>
                  <select
                    value={nameBuilder.title}
                    onChange={(e) => setNameBuilder({ ...nameBuilder, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white text-base sm:text-sm"
                  >
                    <option value="">None</option>
                    <option value="Mr.">Mr.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Miss">Miss</option>
                    <option value="Dr.">Dr.</option>
                    <option value="Prof.">Prof.</option>
                    <option value="Sir">Sir</option>
                    <option value="Madam">Madam</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nameBuilder.useFirstName}
                      onChange={(e) =>
                        setNameBuilder({
                          ...nameBuilder,
                          useFirstName: e.target.checked,
                          useUsername: false,
                          customNickname: "",
                        })
                      }
                      className="w-4 h-4 text-gold-500"
                    />
                    <span className="text-sm text-gray-300">
                      Use First Name {editForm.first_name && `(${editForm.first_name})`}
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nameBuilder.useLastName}
                      onChange={(e) => setNameBuilder({ ...nameBuilder, useLastName: e.target.checked })}
                      disabled={!nameBuilder.useFirstName}
                      className="w-4 h-4 text-gold-500 disabled:opacity-50"
                    />
                    <span className="text-sm text-gray-300">
                      Include Last Name {editForm.last_name && `(${editForm.last_name})`}
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nameBuilder.useUsername}
                      onChange={(e) =>
                        setNameBuilder({
                          ...nameBuilder,
                          useUsername: e.target.checked,
                          useFirstName: false,
                          useLastName: false,
                          customNickname: "",
                        })
                      }
                      className="w-4 h-4 text-gold-500"
                    />
                    <span className="text-sm text-gray-300">
                      Use Username {editForm.username && `(@${editForm.username})`}
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-2">Or use a custom nickname</label>
                  <input
                    type="text"
                    value={nameBuilder.customNickname}
                    onChange={(e) =>
                      setNameBuilder({
                        ...nameBuilder,
                        customNickname: e.target.value,
                        useFirstName: false,
                        useLastName: false,
                        useUsername: false,
                      })
                    }
                    placeholder="e.g., Greg, GregR, Coach, etc."
                    className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white text-sm placeholder-gray-400"
                  />
                </div>

                <div className="mt-4 p-3 bg-gold-500/10 rounded-lg border border-gold-500/30">
                  <p className="text-xs text-gray-400 mb-1">Preview:</p>
                  <p className="text-lg font-semibold text-white">
                    &quot;Good morning, {buildPreferredName() || "..."}!&quot;
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveProfile}
                disabled={profileSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-gold-500 rounded-lg hover:bg-gold-400 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {profileSaving ? "Saving..." : "Save Profile"}
              </button>
              {profileSaved && <span className="text-sm text-green-400">Saved.</span>}
            </div>
          </div>
        )}
      </div>

      {/* Account */}
      <div className="dark-glass rounded-xl shadow-lg p-6 mb-6 border border-gray-600/50">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="w-5 h-5 text-gray-400" />
          <h2 className="text-xl font-semibold text-white">Account</h2>
        </div>

        <div className="space-y-6">
          <div className="pb-4 border-b border-gray-700">
            <p className="text-sm font-medium text-white">Email</p>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <p className="text-sm font-medium text-white">Change password</p>

            {passwordError && (
              <div className="p-3 text-sm text-red-400 border border-red-800 rounded-lg bg-red-900/20">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 text-sm text-green-400 border border-green-800 rounded-lg bg-green-900/20">
                Password updated.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <Lock className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full py-2.5 pl-9 pr-9 border border-gray-600 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute text-gray-500 -translate-y-1/2 right-3 top-1/2 hover:text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full py-2.5 pl-9 pr-4 border border-gray-600 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={passwordSaving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-gold-500 rounded-lg hover:bg-gold-400 disabled:opacity-50 transition-colors"
            >
              <Lock className="w-4 h-4" />
              {passwordSaving ? "Updating..." : "Update password"}
            </button>
          </form>

          {signOutError && (
            <div className="p-3 text-sm text-red-400 border border-red-800 rounded-lg bg-red-900/20">
              {signOutError}
            </div>
          )}

          <div className="pt-2 border-t border-gray-700">
            <button
              onClick={handleSignOut}
              disabled={signOutLoading}
              className="inline-flex items-center gap-2 px-4 py-2 mt-4 text-sm font-medium text-gray-200 border border-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {signOutLoading ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>
      </div>

      {/* Premium */}
      <div className="dark-glass rounded-xl shadow-lg p-6 mb-6 border border-gray-600/50">
        <h2 className="text-xl font-semibold text-white mb-4">Premium</h2>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            {isPremium ? (
              <>
                <p className="text-sm text-white">You&apos;re on Premium — $19/yr</p>
                {profile?.subscription_current_period_end && (
                  <p className="text-xs text-gray-400 mt-1">
                    Renews {new Date(profile.subscription_current_period_end).toLocaleDateString()}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-white">Free plan</p>
                <p className="text-xs text-gray-400 mt-1">
                  Unlock lifetime Alternate Oscar History stats and Ready-Made list automation.
                </p>
              </>
            )}
          </div>
          {!(isNative && !isPremium) && (
            <button
              onClick={handleManageBilling}
              disabled={billingLoading}
              className="px-4 py-2 text-sm font-medium text-black bg-gold-500 rounded-lg hover:bg-gold-400 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {billingLoading ? "Redirecting…" : isPremium ? "Manage subscription" : "Unlock Premium — $19/yr"}
            </button>
          )}
        </div>

        {billingError && <p className="mt-3 text-sm text-red-400">{billingError}</p>}
      </div>

      {/* Import */}
      <div className="dark-glass rounded-xl border border-gray-700/40 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Upload className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-sm font-semibold text-white">Import library</p>
              <p className="text-xs text-gray-500">Letterboxd or IMDb CSV</p>
            </div>
          </div>
          <Link
            href="/settings/import"
            className="text-sm font-medium text-yellow-300 hover:text-yellow-200 transition-colors"
          >
            Import →
          </Link>
        </div>
      </div>

      {/* Danger zone */}
      <div className="dark-glass rounded-xl border border-red-900/40 p-5 mt-6">
        <h2 className="text-sm font-semibold text-red-300 mb-1">Delete account</h2>
        <p className="text-xs text-gray-500 mb-4">
          Permanently deletes your profile, ratings, lists, and reviews. This cannot be undone.
        </p>

        {!deleteConfirming ? (
          <button
            onClick={() => setDeleteConfirming(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-300 border border-red-900/60 rounded-lg hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-white">Are you sure? This is permanent.</p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-700 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {deleteLoading ? "Deleting…" : "Yes, delete my account"}
              </button>
              <button
                onClick={() => setDeleteConfirming(false)}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {deleteError && <p className="mt-3 text-sm text-red-400">{deleteError}</p>}
      </div>

      <BuildInfo />
    </div>
  );
}

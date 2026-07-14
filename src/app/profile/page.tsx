"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import { Edit3, Save, X, Mail, Calendar, Camera } from "lucide-react";
import type { Database } from "@/types/supabase";
import StatsSummary from "@/components/stats/StatsSummary";
import UserAvatar from "@/components/ui/UserAvatar";

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
}

export default function ProfilePage() {
  const user = useUser();
  const supabase = useSupabaseClient<Database>();
  const router = useRouter();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    preferred_name: "",
    bio: "",
    avatar_url: ""
  });
  
  // Preferred name builder state
  const [nameBuilder, setNameBuilder] = useState({
    title: "",
    useFirstName: true,
    useLastName: false,
    useUsername: false,
    customNickname: ""
  });

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
          avatar_url: data.avatar_url || ""
        });
        
        // Initialize name builder based on current preferred_name
        if (data.preferred_name) {
          setNameBuilder({
            title: "",
            useFirstName: data.preferred_name === data.first_name,
            useLastName: false,
            useUsername: data.preferred_name === data.username,
            customNickname: (data.preferred_name !== data.first_name && data.preferred_name !== data.username) ? data.preferred_name : ""
          });
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      router.replace("/");
      return;
    }
    
    fetchProfile();
  }, [user, router, fetchProfile]);

  if (!user) return null;

  const handleStartEditing = () => {
    setEditing(true);
    setError(null);
  };

  const handleCancelEditing = () => {
    setEditing(false);
    if (profile) {
      setEditForm({
        username: profile.username || "",
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        preferred_name: profile.preferred_name || "",
        bio: profile.bio || "",
        avatar_url: profile.avatar_url || ""
      });
    }
    setError(null);
  };
  
  // Build preferred name from components
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

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    setError(null);

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
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setProfile(data as Profile);
      setEditing(false);
    } catch (err) {
      console.error("Error saving profile:", err);
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      </div>
    );
  }

  const displayName = profile?.preferred_name || profile?.first_name || profile?.full_name || profile?.username || user.email?.split('@')[0];
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
        <p className="text-gray-300">
          Manage your account information and preferences.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

  {/* Profile Card */}
  <div className="dark-glass rounded-xl shadow-lg p-6 mb-6 border border-gray-600/50">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <UserAvatar
                imageUrl={avatarUrl}
                name={displayName}
                username={profile?.username || user.email?.split("@")[0]}
                size={80}
                alt="Profile picture"
                className="border-4 border-gray-600"
              />
              {editing && (
                <button className="absolute -bottom-1 -right-1 p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {displayName}
              </h2>
              {profile?.username && (
                <p className="text-gray-400">@{profile.username}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </div>
                {profile?.created_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Joined {new Date(profile.created_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {!editing ? (
            <button
              onClick={handleStartEditing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-400 bg-blue-900/20 rounded-lg hover:bg-blue-900/30 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancelEditing}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>

        {/* Bio Section */}
        <div className="border-t border-gray-700 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4">About</h3>
          {editing ? (
            <textarea
              value={editForm.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
            />
          ) : (
            <p className="text-gray-300 whitespace-pre-line">
              {profile?.bio || "No bio added yet."}
            </p>
          )}
        </div>
      </div>

      {/* Edit Form Fields */}
      {editing && (
        <div className="dark-glass rounded-xl shadow-lg p-6 border border-gray-600/50">
          <h3 className="text-lg font-semibold text-white mb-6">Edit Details</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={editForm.first_name}
                onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
                placeholder="Enter your first name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={editForm.last_name}
                onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
                placeholder="Enter your last name"
              />
            </div>
            
            {/* Call Me / Preferred Name Builder */}
            <div className="border-t border-gray-700 pt-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Call Me (How you'll be greeted)
              </label>
              
              <div className="space-y-4">
                {/* Title/Honorific */}
                <div>
                  <label className="block text-xs text-gray-400 mb-2">
                    Title (optional)
                  </label>
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
                
                {/* Name Component Toggles */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nameBuilder.useFirstName}
                      onChange={(e) => setNameBuilder({ 
                        ...nameBuilder, 
                        useFirstName: e.target.checked,
                        useUsername: false,
                        customNickname: ""
                      })}
                      className="w-4 h-4 text-blue-600"
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
                      className="w-4 h-4 text-blue-600 disabled:opacity-50"
                    />
                    <span className="text-sm text-gray-300">
                      Include Last Name {editForm.last_name && `(${editForm.last_name})`}
                    </span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nameBuilder.useUsername}
                      onChange={(e) => setNameBuilder({ 
                        ...nameBuilder, 
                        useUsername: e.target.checked,
                        useFirstName: false,
                        useLastName: false,
                        customNickname: ""
                      })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-300">
                      Use Username {editForm.username && `(@${editForm.username})`}
                    </span>
                  </label>
                </div>
                
                {/* Custom Nickname */}
                <div>
                  <label className="block text-xs text-gray-400 mb-2">
                    Or use a custom nickname
                  </label>
                  <input
                    type="text"
                    value={nameBuilder.customNickname}
                    onChange={(e) => setNameBuilder({ 
                      ...nameBuilder, 
                      customNickname: e.target.value,
                      useFirstName: false,
                      useLastName: false,
                      useUsername: false
                    })}
                    placeholder="e.g., Greg, GregR, Coach, etc."
                    className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white text-sm placeholder-gray-400"
                  />
                </div>
                
                {/* Preview */}
                <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-800">
                  <p className="text-xs text-gray-400 mb-1">Preview:</p>
                  <p className="text-lg font-semibold text-white">
                    "Good morning, {buildPreferredName() || "..."}!"
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Avatar URL
              </label>
              <input
                type="url"
                value={editForm.avatar_url}
                onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
                className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
                placeholder="https://example.com/your-avatar.jpg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary at bottom */}
      <div className="mt-12">
        <StatsSummary />
      </div>
    </div>
  );
}

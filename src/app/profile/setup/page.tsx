'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from "@/lib/supabaseBrowser";
import type { User } from '@supabase/supabase-js';
import { User as UserIcon, Save, Check, X } from 'lucide-react';
import { sanitizeNextPath } from '@/utils/sanitizeNextPath';

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export default function ProfileSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-4 border-gold-400/30 border-t-gold-400 rounded-full animate-spin" />
      </div>
    }>
      <ProfileSetupContent />
    </Suspense>
  );
}

function ProfileSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Where to continue after claiming a username — threaded from the OAuth
  // callback (AUTH-1, docs/audits/2026-08-22-launch-readiness-round4.md).
  const next = sanitizeNextPath(searchParams?.get('next'));
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // Form state
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    getUser();
  }, []);

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    
    setUser(user);
    
    // Check if profile already exists
    const { data: profile } = await supabase
      .from('profiles_self')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profile) {
      setProfile(profile as Profile);
      setUsername(profile.username || '');
      setFullName(profile.full_name || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
    } else {
      // Pre-fill with user metadata if available (from OAuth providers)
      const metadata = user.user_metadata || {};
      
      // Handle different OAuth provider metadata formats
      const suggestedUsername = metadata.username || 
                               metadata.preferred_username || 
                               metadata.user_name ||
                               metadata.login || 
                               metadata.name?.toLowerCase().replace(/\s+/g, '_') || 
                               '';
      
      const suggestedFullName = metadata.full_name || 
                               metadata.name || 
                               metadata.display_name ||
                               '';
      
      const suggestedAvatar = metadata.avatar_url || 
                             metadata.picture || 
                             metadata.image_url ||
                             '';
      
      setUsername(suggestedUsername);
      setFullName(suggestedFullName);
      setAvatarUrl(suggestedAvatar);
    }
  };

  const checkUsernameAvailability = async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    if (profile && profile.username === usernameToCheck) {
      setUsernameAvailable(true);
      return;
    }

    setUsernameChecking(true);
    
    try {
      const response = await fetch(`/api/profiles?username=${encodeURIComponent(usernameToCheck)}`);
      const data = await response.json();
      
      if (response.ok) {
        setUsernameAvailable(data.available);
      } else {
        setUsernameAvailable(null);
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameAvailable(null);
    } finally {
      setUsernameChecking(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    
    // Debounce username checking
    const timer = setTimeout(() => {
      checkUsernameAvailability(value);
    }, 500);
    
    return () => clearTimeout(timer);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user) {
      router.push('/login');
      return;
    }

    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }
    
    if (usernameAvailable === false) {
      setError('Username is already taken');
      return;
    }

    setLoading(true);
    
    try {
      const profileData = {
        username: username.trim(),
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      };

      if (profile) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', user.id);
        
        if (error) {
          setError(error.message);
          return;
        }
      } else {
        // Create new profile
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            ...profileData,
          });
        
        if (error) {
          setError(error.message);
          return;
        }
      }
      
      setSuccess('Profile saved successfully!');

      // If the caller threaded a specific destination through (e.g. the
      // page a not-yet-signed-in visit originally bounced from), honor
      // it. Otherwise: first-time profile creation → taste setup; edits
      // go back home.
      const destination = next !== '/' ? next : profile ? '/' : '/onboarding';
      setTimeout(() => {
        router.push(destination);
      }, 1500);
      
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-4 border-gold-400/30 border-t-gold-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="text-center mb-8">
          <h1 className="font-unbounded text-2xl sm:text-3xl font-bold text-white mb-2">
            {profile ? 'Edit Profile' : 'Complete Your Profile'}
          </h1>
          <p className="text-gray-400">
            {profile ? 'Update your profile information' : 'Choose your own username — this becomes your public profile URL.'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-charcoal-900/95 backdrop-blur-xl shadow-2xl p-8">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-xl text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-900/20 border border-green-800 rounded-xl text-green-400">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username *
              </label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 border border-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400/60 bg-white/5 text-white placeholder-gray-500"
                  placeholder="your_username"
                  required
                />
                {usernameChecking && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {!usernameChecking && usernameAvailable === true && (
                  <Check className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-400" />
                )}
                {!usernameChecking && usernameAvailable === false && (
                  <X className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-400" />
                )}
              </div>
              {username && username.length >= 3 && usernameAvailable === true && (
                <p className="text-sm text-green-400 mt-1">Username is available!</p>
              )}
              {username && username.length >= 3 && usernameAvailable === false && (
                <p className="text-sm text-red-400 mt-1">Username is already taken</p>
              )}
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400/60 bg-white/5 text-white placeholder-gray-500"
                  placeholder="Your Full Name"
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400/60 bg-white/5 text-white placeholder-gray-500 resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>

            {/* Avatar URL */}
            <div>
              <label htmlFor="avatarUrl" className="block text-sm font-medium text-gray-300 mb-2">
                Avatar URL
              </label>
              <input
                id="avatarUrl"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full px-4 py-3 border border-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400/60 bg-white/5 text-white placeholder-gray-500"
                placeholder="https://example.com/your-avatar.jpg"
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => router.push(next)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                {profile ? 'Cancel' : 'Skip for now'}
              </button>

              <button
                type="submit"
                disabled={loading || usernameAvailable === false}
                className="flex items-center gap-2 px-6 py-3 rounded-full border border-gold-300/40 bg-gold-500 text-black shadow-lg shadow-gold-500/25 hover:bg-gold-400 hover:shadow-gold-400/35 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {profile ? 'Update Profile' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

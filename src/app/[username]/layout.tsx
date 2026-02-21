"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Star, Trophy, Film, Home, Share2, Check } from "lucide-react";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import UserAvatar from "@/components/ui/UserAvatar";
import { useState } from "react";

function ProfileHeader({
  username,
}: {
  username: string;
}) {
  const { profile, stats, loading, notFound } = usePublicProfile(username);
  const [copied, setCopied] = useState(false);

  const handleCopyProfileUrl = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${username}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: do nothing
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 bg-gray-700 rounded-full" />
          <div className="flex-1">
            <div className="h-7 w-48 bg-gray-700 rounded mb-2" />
            <div className="h-4 w-28 bg-gray-700/60 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-700/40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-white mb-2">User not found</h1>
        <p className="text-gray-400">No user with the username &ldquo;{username}&rdquo; exists.</p>
      </div>
    );
  }

  if (!profile) return null;

  const displayName =
    profile.preferred_name ||
    profile.first_name ||
    profile.full_name ||
    profile.username;

  const statItems = [
    { label: "AWARDS", value: stats.awards, icon: <Trophy className="w-3.5 h-3.5" /> },
    { label: "RANKINGS", value: stats.rated, icon: <Star className="w-3.5 h-3.5" /> },
    { label: "FILMS", value: stats.films, icon: <Film className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="mb-2">
      <div className="md:flex md:items-start md:justify-between md:gap-8">
        {/* Profile info row */}
        <div className="flex items-center gap-5 mb-5 md:mb-0 md:min-w-0">
          <UserAvatar
            imageUrl={profile.avatar_url}
            name={displayName}
            username={profile.username}
            size={96}
            alt={displayName || "Profile"}
            className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-gray-700/60"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
              {displayName}
            </h1>
            <p className="text-gray-400 text-sm">@{profile.username}</p>
            {profile.bio ? (
              <p className="mt-1.5 text-sm text-gray-300/80 italic line-clamp-2">{profile.bio}</p>
            ) : (
              <p className="mt-1.5 text-xs text-gray-500 italic">Curating film history one year at a time.</p>
            )}
            {/* Share button */}
            <button
              onClick={handleCopyProfileUrl}
              className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-gray-400 hover:text-white bg-gray-800/40 hover:bg-gray-700/60 border border-gray-700/30 hover:border-gray-600/50 transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-green-400" />
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3 h-3" />
                  Share Profile
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats row — MeepleGo-inspired */}
        <div className="grid grid-cols-3 md:w-[360px] rounded-lg border border-gray-700/40 bg-gray-800/20">
          {statItems.map((s, index) => (
            <div
              key={s.label}
              className={`flex flex-col items-center py-2.5 px-1 ${
                index > 0 ? "border-l border-gray-700/50" : ""
              }`}
            >
              <div className="flex items-center gap-1 text-gray-500 mb-0.5">
                {s.icon}
                <span className="text-[10px] uppercase tracking-wider font-medium">{s.label}</span>
              </div>
              <span className="text-xl sm:text-2xl font-bold text-white">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileTabs({ username }: { username: string }) {
  const pathname = usePathname();
  const currentPath = pathname ?? "";
  const basePath = `/${username}`;

  const tabs = [
    { label: "Overview", href: basePath, icon: Home },
    { label: "My Awards", href: `${basePath}/awards`, icon: Trophy },
    { label: "My Rankings", href: `${basePath}/rankings`, icon: Star },
    { label: "My Films", href: `${basePath}/films`, icon: Film },
  ];

  return (
    <nav className="mt-4 mb-6 overflow-x-auto">
      <div className="w-full flex items-center justify-start gap-1 rounded-xl bg-white/10 dark:bg-black/20 backdrop-blur-md border border-gray-200/30 dark:border-gray-700/40 shadow-lg p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.href === basePath
              ? currentPath === basePath
              : currentPath.startsWith(tab.href);

          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`px-4 sm:px-5 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-colors ${
                isActive
                  ? "text-gold bg-white/30 dark:bg-white/15 border border-white/20 dark:border-white/10"
                  : "text-gray-300 hover:text-gold"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function UsernameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";

  if (!username) return null;

  return (
    <div className="max-w-screen-xl mx-auto py-4">
      <ProfileHeader username={username} />
      <ProfileTabs username={username} />
      {children}
    </div>
  );
}

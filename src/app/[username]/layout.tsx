"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Star, Trophy, Film, Home, Share2, Check, Bookmark, List, Activity, Users, Layers } from "lucide-react";
import { usePublicProfile } from "@/hooks/usePublicProfile";
import { useFollowing } from "@/hooks/useFollowing";
import UserAvatar from "@/components/ui/UserAvatar";
import FollowButton from "@/components/social/FollowButton";
import { useUser } from "@supabase/auth-helpers-react";
import { useIsProfileOwner } from "@/hooks/useIsProfileOwner";
import { useProfile } from "@/contexts/ProfileContext";
import { useEffect, useRef, useState } from "react";

function ProfileHeader({
  username,
  profile,
  loading,
  notFound,
  isOwnProfile,
}: {
  username: string;
  profile: ReturnType<typeof usePublicProfile>["profile"];
  loading: boolean;
  notFound: boolean;
  isOwnProfile: boolean;
}) {
  const sessionUser = useUser();
  const { followingIds, toggleFollow } = useFollowing(profile?.id ?? null);
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

  // Visual chip stays compact (px-2.5 py-1 text-[11px]) to match the
  // header's dense layout; the before:-inset-y-3 pseudo-element pads
  // the real tappable area out to 44px+ tall on touch without
  // enlarging the visible pill. Horizontal expansion is
  // intentionally zero (before:inset-x-0) — this pill's own text
  // ("Share Profile"/"Copied!") already clears 44px wide, and the
  // old before:-inset-3 (12px, all sides) reached 4px past the
  // 8px gap-2 onto the Follow button's own visible pixels; since
  // Share renders later in DOM with z-index:auto, its invisible
  // hit-box was winning the hit-test over Follow's real button in
  // that 4px strip (tapping the right edge of "Follow" copied the
  // URL instead of toggling follow). Removing the horizontal
  // reach fixes that at the source; FollowButton's own z-10 is
  // the backstop.
  const shareButton = (
    <button
      onClick={handleCopyProfileUrl}
      className="relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-gray-400 hover:text-white bg-gray-800/40 hover:bg-gray-700/60 border border-gray-700/30 hover:border-gray-600/50 transition-all before:content-[''] before:absolute before:inset-x-0 before:-inset-y-3"
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
  );

  // This only ever renders "public" content now — UsernameLayout skips
  // mounting ProfileHeader entirely for the owner's default "personal"
  // view (see the isBlank check there), so there's no personal-mode
  // branch to handle here. What's left is exactly what a visitor sees;
  // the owner reaches it too by flipping to "Preview" in UserMenu's
  // dropdown.
  return (
    <div className="mb-2">
      <div className="flex items-center gap-5 mb-5">
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
          {/* Actions: follow + share. gap-y-6 (24px) is intentionally larger
              than gap-x-2 (8px): on narrow screens this row can flex-wrap,
              stacking Share below Follow, and Follow's before:-inset-y-2.5
              (10px) plus Share's before:-inset-y-3 (12px) need 22px of
              clearance to avoid the two hit-boxes overlapping vertically
              the same way they used to overlap horizontally. */}
          <div className="mt-2 flex items-center gap-x-2 gap-y-6 flex-wrap">
            {sessionUser && profile && (
              <FollowButton
                targetProfileId={profile.id}
                isFollowing={followingIds.has(profile.id)}
                isOwnProfile={isOwnProfile}
                onToggle={toggleFollow}
                size="sm"
              />
            )}
            {shareButton}
          </div>
        </div>
      </div>
    </div>
  );
}

// Shared by the tab strip (public/preview view) and the standalone page
// title (personal/blank view) so which-tab-is-this logic exists in exactly
// one place. `suffix` is relative to `${basePath}` (empty string = the
// Overview/index route).
const PROFILE_TAB_DEFS = [
  { label: "Overview", suffix: "", icon: Home },
  { label: "My Awards", suffix: "/awards", icon: Trophy },
  { label: "My Rankings", suffix: "/rankings", icon: Star },
  { label: "My Films", suffix: "/films", icon: Film },
  { label: "Collections", suffix: "/collections", icon: Layers },
  { label: "Watchlist", suffix: "/watchlist", icon: Bookmark },
  { label: "Lists", suffix: "/lists", icon: List },
  { label: "Activity", suffix: "/activity", icon: Activity },
  { label: "Friends", suffix: "/following", icon: Users },
];

function findActiveProfileTab(currentPath: string, basePath: string) {
  return PROFILE_TAB_DEFS.find((tab) => {
    if (tab.suffix === "") return currentPath === basePath;
    // Friends covers both /following and /followers — same tab, two routes.
    if (tab.label === "Friends") {
      return (
        currentPath.startsWith(`${basePath}/following`) ||
        currentPath.startsWith(`${basePath}/followers`)
      );
    }
    return currentPath.startsWith(`${basePath}${tab.suffix}`);
  });
}

function ProfileTabs({ username }: { username: string }) {
  const pathname = usePathname();
  const currentPath = pathname ?? "";
  const basePath = `/${username}`;
  const activeTabRef = useRef<HTMLAnchorElement | null>(null);
  const activeTab = findActiveProfileTab(currentPath, basePath);

  // Whichever tab is active — including landing on it via a deep sub-route
  // (a specific list, a specific collection) — gets centered in the bar
  // rather than left wherever it happens to sit; on a narrow screen the
  // active tab can otherwise be scrolled off-screen with nothing visibly
  // highlighted.
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [currentPath]);

  return (
    // w-max (not w-full) on the inner bar below: w-full capped it to the
    // nav's visible width, so the background/border only covered whatever
    // fit on screen — tabs that overflowed off the right edge scrolled in
    // with no background behind them, reading as if the list ended at
    // whatever happened to be visible. w-max sizes the bar to its actual
    // content (all tabs), so overflow-x-auto scrolls the WHOLE bar,
    // background included.
    <nav className="mt-4 mb-6 overflow-x-auto">
      <div className="w-max flex items-center justify-start gap-2 rounded-xl bg-black/20 backdrop-blur-md border border-gray-700/40 shadow-lg p-1">
        {PROFILE_TAB_DEFS.map((tab) => {
          const Icon = tab.icon;
          const href = `${basePath}${tab.suffix}`;
          const isActive = tab === activeTab;

          return (
            <Link
              key={tab.label}
              ref={isActive ? activeTabRef : undefined}
              href={href}
              className={`px-4 sm:px-5 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-colors ${
                isActive
                  ? "text-gold bg-white/15 border border-white/10"
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

// Stand-in for the tab strip's active-tab highlight when that strip isn't
// rendered at all (personal/blank view) — without it, landing on e.g.
// /username/collections in that view has zero indication of which page
// you're on. Skipped in public/preview view: the tab strip there already
// gives that context, so a second label would be redundant.
function PersonalViewTitle({ username }: { username: string }) {
  const pathname = usePathname();
  const currentPath = pathname ?? "";
  const basePath = `/${username}`;
  const activeTab = findActiveProfileTab(currentPath, basePath);

  if (!activeTab) return null;
  // Tab strip labels are possessive ("My Awards") because they sit next to
  // a stranger's-eye-view profile header in public/preview mode. Here
  // there's no such header to disambiguate against — it's unambiguously
  // your own page — so the "My " reads redundant.
  const title = activeTab.label.replace(/^My\s+/, "");

  return (
    <h1 className="mb-4 font-unbounded font-semibold text-lg text-gray-300 tracking-wide">
      {title}
    </h1>
  );
}

export default function UsernameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";
  // Fetched once here (rather than inside ProfileHeader) so isOwnProfile is
  // available for the isBlank check below without a second /api/users/*
  // round trip for the same profile+movies+stats+awards payload.
  const { profile, loading, notFound } = usePublicProfile(username);
  const isOwnProfile = useIsProfileOwner(profile?.id);
  const { viewMode } = useProfile();

  if (!username) return null;

  // Owner's default view: no header, no tab strip. UserMenu's dropdown
  // already links to every one of these tabs (Films, Rankings, Collections,
  // Watchlist, Lists, ...), so the on-page header + tab strip was pure
  // duplication of that nav for the one person who already has it one click
  // away — and it cost every tab (Collections' carousel especially) real
  // estate for chrome they didn't need. Visitors, and the owner previewing
  // via "Preview" in the dropdown, still get the full experience below.
  const isBlank = isOwnProfile && viewMode === "personal";

  return (
    /* w-full min-w-0: flex item of AppShell's <main> (a flex column) — without
       min-w-0, the tab strip's whitespace-nowrap links propagate their
       intrinsic width up here and inflate the page past the viewport on
       mobile (same guard as /awards and the homepage). */
    <div className="w-full min-w-0 max-w-screen-xl mx-auto py-4">
      {isBlank ? (
        <PersonalViewTitle username={username} />
      ) : (
        <>
          <ProfileHeader
            username={username}
            profile={profile}
            loading={loading}
            notFound={notFound}
            isOwnProfile={isOwnProfile}
          />
          <ProfileTabs username={username} />
        </>
      )}
      {children}
    </div>
  );
}
